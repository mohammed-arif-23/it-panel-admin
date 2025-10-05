import { NextRequest, NextResponse } from "next/server";
import { fineService } from "../../../../../lib/fineService";
import { verifyJWT } from "../../../../../lib/auth";

// Check admin authentication using JWT
async function checkAdminAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return false;
    
    const payload = await verifyJWT(token);
    return payload.role === 'HOD' || payload.role === 'STAFF';
  } catch (error) {
    console.error('JWT verification error:', error);
    return false;
  }
}

// POST - Create fines for students who didn't book for a specific date (Admin Panel)
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, amount = 10 } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Check if date is not in the future
    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
      return NextResponse.json(
        { error: "Cannot create fines for future dates" },
        { status: 400 }
      );
    }

    console.log(
      `Admin manually creating ₹${amount} fines for non-booked students on date: ${date}`
    );

    // Use the fine service to create fines for non-booked students
    const result = await fineService.createFinesForNonBookedStudents(date);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, details: result.errors },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        date,
        finesCreated: result.finesCreated,
        amount: 10, // Fixed amount
        errors: result.errors,
        summary: `Created ₹10 fine for ${result.finesCreated} students who didn't book on ${date}`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin fine creation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET - Preview students who would be fined for a specific date
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const { supabase } = await import("../../../../../lib/supabase");

    // Get students based on class filter - for 'all', only get II-IT and III-IT (matching booking analytics)
    let studentsQuery = supabase
      .from("unified_students")
      .select("id, register_number, name, email, class_year")
      .order("register_number");

    // Only include IT students (matching booking analytics logic)
    studentsQuery = studentsQuery.in("class_year", ["II-IT", "III-IT"]);

    const { data: allStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      return NextResponse.json(
        { error: "Failed to fetch students", details: studentsError.message },
        { status: 500 }
      );
    }

    // Get bookings for the selected date (EXACT COPY from booking analytics)
    const { data: bookings, error: bookingsError } = await supabase
      .from("unified_seminar_bookings")
      .select(
        `
        id,
        student_id,
        booking_date,
        seminar_topic,
        created_at,
        unified_students(
          id,
          register_number,
          name,
          email,
          class_year
        )
      `
      )
      .eq("booking_date", date);

    if (bookingsError) {
      return NextResponse.json(
        { error: "Failed to fetch bookings", details: bookingsError.message },
        { status: 500 }
      );
    }

    // Get students who have been selected for any seminar (past or future)
    const { data: selectedStudents, error: selectedError } = await supabase
      .from("unified_seminar_selections")
      .select("student_id, seminar_date");

    if (selectedError) {
      return NextResponse.json(
        {
          error: "Failed to fetch selected students",
          details: selectedError.message,
        },
        { status: 500 }
      );
    }

    // Get existing fines for this date
    const { data: existingFines, error: finesError } = await supabase
      .from("unified_student_fines")
      .select("student_id")
      .eq("reference_date", date)
      .eq("fine_type", "seminar_no_booking");

    if (finesError) {
      return NextResponse.json(
        {
          error: "Failed to fetch existing fines",
          details: finesError.message,
        },
        { status: 500 }
      );
    }

    // Filter bookings to only include II-IT and III-IT students (matching booking analytics)
    const filteredBookings = (bookings || []).filter(
      (booking: any) =>
        booking.unified_students?.class_year === "II-IT" ||
        booking.unified_students?.class_year === "III-IT"
    );

    // Create sets for filtering (matching the correct logic)
    const bookedStudentIds = new Set(
      filteredBookings.map((b: any) => b.student_id)
    );
    const selectedStudentIds = new Set(
      (selectedStudents || []).map((record: any) => record.student_id)
    );
    const finedStudentIds = new Set(
      existingFines?.map((f: any) => f.student_id) || []
    );

    // Debug logging
    console.log(
      `DEBUG create-for-date: Total students (II-IT + III-IT): ${
        allStudents?.length || 0
      }`
    );
    console.log(
      `DEBUG create-for-date: All bookings found for ${date}: ${
        bookings?.length || 0
      }`
    );
    console.log(
      `DEBUG create-for-date: Filtered bookings (II-IT + III-IT): ${filteredBookings.length}`
    );

    // Check if there are ANY bookings in the database
    const { data: sampleBookings } = await supabase
      .from("unified_seminar_bookings")
      .select("booking_date")
      .limit(5);
    console.log(
      `DEBUG: Sample booking dates in DB:`,
      sampleBookings?.map((b) => (b as any).booking_date)
    );
    console.log(
      `DEBUG create-for-date: Selected students: ${
        selectedStudents?.length || 0
      }`
    );
    console.log(
      `DEBUG create-for-date: Existing fines: ${existingFines?.length || 0}`
    );

    // Apply the correct logic: Students who (didn't book) AND (not selected for any seminar)
    const studentsEligibleForFines = (allStudents || []).filter(
      (student: any) => {
        const didNotBook = !bookedStudentIds.has(student.id);
        const notSelected = !selectedStudentIds.has(student.id);

        return didNotBook && notSelected;
      }
    );

    // Filter out students who already have fines for this date
    const studentsToFine = studentsEligibleForFines.filter(
      (student: any) => !finedStudentIds.has(student.id)
    );

    const studentsAlreadyFined = studentsEligibleForFines.filter(
      (student: any) => finedStudentIds.has(student.id)
    );

    const studentsWhoBooked = (allStudents || []).filter((student: any) =>
      bookedStudentIds.has(student.id)
    );

    const studentsWhoSelected = (allStudents || []).filter((student: any) =>
      selectedStudentIds.has(student.id)
    );

    // Separate by class for better visualization
    const iiItStudentsToFine = studentsToFine.filter(
      (s: any) => s.class_year === "II-IT"
    );
    const iiiItStudentsToFine = studentsToFine.filter(
      (s: any) => s.class_year === "III-IT"
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        fineAmount: 10, // Fixed ₹10 per student
        summary: {
          totalStudents: allStudents?.length || 0,
          studentsWhoBooked: studentsWhoBooked.length,
          studentsWhoSelected: studentsWhoSelected.length,
          studentsToFine: studentsToFine.length,
          studentsAlreadyFined: studentsAlreadyFined.length,
          totalFineAmount: studentsToFine.length * 10,
          byClass: {
            "II-IT": {
              toFine: iiItStudentsToFine.length,
              fineAmount: iiItStudentsToFine.length * 10,
            },
            "III-IT": {
              toFine: iiiItStudentsToFine.length,
              fineAmount: iiiItStudentsToFine.length * 10,
            },
          },
        },
        students: {
          toFine: studentsToFine,
          alreadyFined: studentsAlreadyFined,
          whoBooked: studentsWhoBooked,
          whoSelected: studentsWhoSelected,
        },
        exclusions: {
          selectedForSeminars: studentsWhoSelected.length,
          message: `Excluded ${studentsWhoSelected.length} students who are selected for seminars`,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Fine preview error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}