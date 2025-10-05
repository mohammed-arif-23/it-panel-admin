import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { codTimingService } from "../../../../lib/codTimingService";
import { holidayService } from "../../../../lib/holidayService";
import { fineService } from "../../../../lib/fineService";
// For cron invocations, delegate to the centralized direct-select handler
import { GET as directCronSelect } from "../../cron/direct-select/route";

interface BookingWithStudent {
  id: string;
  student_id: string;
  booking_date: string;
  created_at: string;
  unified_students: {
    id: string;
    register_number: string;
    name: string;
    email: string;
    class_year: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Check if this is a cron job request and bypass authentication if needed
    const userAgent = request.headers.get("user-agent") || "";
    const isCronJob =
      userAgent.includes("Vercel-Cron-Job") || userAgent.includes("cron");

    if (isCronJob) {
      console.log(
        "Cron job request detected at auto-select. Delegating to /api/cron/direct-select to avoid duplicate execution."
      );
      // Delegate to the consolidated handler which already includes emails/fines and robust checks
      const resp = await directCronSelect();
      return resp;
    }

    // Get next COD date with holiday awareness
    let codDate = codTimingService.getNextcodDate();

    // Check if the calculated COD date is a holiday and reschedule if needed
    const rescheduleCheck = await holidayService.checkAndRescheduleCOD(
      codDate
    );

    if (rescheduleCheck.needsReschedule) {
      console.log(`Holiday detected: ${rescheduleCheck.holidayName}`);
      console.log(
        `COD rescheduled from ${codDate} to ${rescheduleCheck.newDate}`
      );

      codDate = rescheduleCheck.newDate!;

      // If there were existing selections that got rescheduled, return the reschedule info
      if (rescheduleCheck.result) {
        return NextResponse.json(
          {
            success: true,
            message: "COD automatically rescheduled due to holiday",
            reschedule: rescheduleCheck.result,
            holidayReschedule: true,
            originalDate: rescheduleCheck.result.originalDate,
            newDate: rescheduleCheck.result.newDate,
            holidayName: rescheduleCheck.result.holidayName,
            affectedStudents: rescheduleCheck.result.affectedStudentsCount,
          },
          { status: 200 }
        );
      }
    }

    const dayName = new Date(codDate + "T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    console.log(
      "Starting auto-selection for date:",
      codDate,
      "(" + dayName + ")"
    );

    // Note: Sunday is a holiday - no CODs are scheduled on Sunday
    // But Sunday bookings target Monday CODs, so we allow Sunday cron execution
    const CODDay = new Date(codDate + "T12:00:00").getDay();
    if (CODDay === 0) {
      return NextResponse.json(
        {
          error: "Cannot schedule COD on Sunday (holiday)",
          date: codDate,
        },
        { status: 400 }
      );
    }

    // Check if selections already exist for tomorrow (should be exactly 2 selections, one per class)
    const { data: existingSelections, error: selectionCheckError } =
      await supabase
        .from("unified_cod_selections")
        .select(
          `
        *,
        unified_students(class_year)
      `
        )
        .eq("cod_date", codDate);

    if (selectionCheckError) {
      console.error("Error checking existing selections:", selectionCheckError);
      return NextResponse.json(
        {
          error: "Failed to check existing selections",
          details: selectionCheckError.message,
        },
        { status: 500 }
      );
    }

    // If we already have 2 or more selections, don't select more
    if (existingSelections && existingSelections.length >= 2) {
      console.log(
        "Selections already complete for this date:",
        existingSelections.length,
        "selections exist"
      );
      return NextResponse.json(
        {
          message:
            "Selections already exist for this date (maximum 2 selections allowed)",
          selections: existingSelections,
        },
        { status: 200 }
      );
    }

    // Check if we already have one selection from each class
    if (existingSelections && existingSelections.length > 0) {
      const existingClasses = new Set(
        existingSelections
          .map((selection: any) => selection.unified_students?.class_year)
          .filter(Boolean)
      );
      const hasIIIT = existingClasses.has("II-IT");
      const hasIIIIT = existingClasses.has("III-IT");

      if (hasIIIT && hasIIIIT) {
        console.log("Already have one selection from each class");
        return NextResponse.json(
          {
            message:
              "Selections already complete - one student from each class already selected",
            selections: existingSelections,
          },
          { status: 200 }
        );
      }
    }

    // Get all bookings for tomorrow with student details
    const { data: bookings, error: bookingsError } = (await supabase
      .from("unified_cod_bookings")
      .select(
        `
        *,
        unified_students(*)
      `
      )
      .eq("booking_date", codDate)) as {
      data: BookingWithStudent[] | null;
      error: any;
    };

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return NextResponse.json(
        { error: "Failed to fetch bookings", details: bookingsError.message },
        { status: 500 }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log("No bookings found for date:", codDate);
      return NextResponse.json(
        { message: "No bookings found for selection", date: codDate },
        { status: 200 }
      );
    }

    console.log(`Found ${bookings.length} bookings for selection`);

    // Get ALL previous selections to avoid selecting students who have already presented
    // This ensures students don't get selected multiple times across different COD dates
    const { data: previousSelections, error: previousSelectionsError } =
      await supabase
        .from("unified_cod_selections")
        .select("student_id, cod_date");

    if (previousSelectionsError) {
      console.error(
        "Error fetching previous selections:",
        previousSelectionsError
      );
      return NextResponse.json(
        {
          error: "Failed to fetch previous selections",
          details: previousSelectionsError.message,
        },
        { status: 500 }
      );
    }

    // Create a set of recently selected student IDs for efficient lookup
    const previouslySelectedStudentIds = new Set(
      (previousSelections as any[])?.map((selection) => selection.student_id) ||
        []
    );

    console.log(
      `Found ${previouslySelectedStudentIds.size} students who have already presented (excluding from selection)`
    );

    // Filter out previously selected students from bookings
    const eligibleBookings = bookings.filter(
      (booking) => !previouslySelectedStudentIds.has(booking.student_id)
    );

    console.log(
      `Eligible bookings after excluding previous selections: ${eligibleBookings.length}`
    );

    if (eligibleBookings.length === 0) {
      return NextResponse.json(
        {
          message:
            "No eligible students available (all have already presented in previous CODs)",
          date: codDate,
          total_bookings: bookings.length,
          already_presented_count: previouslySelectedStudentIds.size,
          selection_basis: "excluding all previously selected students",
        },
        { status: 200 }
      );
    }

    // Separate eligible bookings by class
    const iiItBookings = eligibleBookings.filter(
      (booking) => booking.unified_students.class_year === "II-IT"
    );
    const iiiItBookings = eligibleBookings.filter(
      (booking) => booking.unified_students.class_year === "III-IT"
    );

    console.log(
      `Eligible II-IT bookings: ${iiItBookings.length}, Eligible III-IT bookings: ${iiiItBookings.length}`
    );

    // Check which classes already have selections to avoid duplicate selections
    const existingClasses = new Set();
    if (existingSelections && existingSelections.length > 0) {
      existingSelections.forEach((selection: any) => {
        if (selection.unified_students?.class_year) {
          existingClasses.add(selection.unified_students.class_year);
        }
      });
    }

    const selectedStudents: Array<{
      booking: BookingWithStudent;
      student: BookingWithStudent["unified_students"];
    }> = [];
    const selectionResults: any[] = [];

    // Select one student from II-IT class if available AND not already selected
    if (iiItBookings.length > 0 && !existingClasses.has("II-IT")) {
      const randomIndex = Math.floor(Math.random() * iiItBookings.length);
      const selectedBooking = iiItBookings[randomIndex];
      selectedStudents.push({
        booking: selectedBooking,
        student: selectedBooking.unified_students,
      });
      console.log(
        "Selected II-IT student:",
        selectedBooking.unified_students.register_number
      );
    } else if (existingClasses.has("II-IT")) {
      console.log("II-IT class already has a selection, skipping");
    } else {
      console.log(
        "No eligible II-IT students available (all already selected for this date or no bookings)"
      );
    }

    // Select one student from III-IT class if available AND not already selected
    if (iiiItBookings.length > 0 && !existingClasses.has("III-IT")) {
      const randomIndex = Math.floor(Math.random() * iiiItBookings.length);
      const selectedBooking = iiiItBookings[randomIndex];
      selectedStudents.push({
        booking: selectedBooking,
        student: selectedBooking.unified_students,
      });
      console.log(
        "Selected III-IT student:",
        selectedBooking.unified_students.register_number
      );
    } else if (existingClasses.has("III-IT")) {
      console.log("III-IT class already has a selection, skipping");
    } else {
      console.log(
        "No eligible III-IT students available (all already selected for this date or no bookings)"
      );
    }

    if (selectedStudents.length === 0) {
      return NextResponse.json(
        {
          message: "No students available for selection from either class",
          date: codDate,
        },
        { status: 200 }
      );
    }

    // Final check before creating selections to prevent race conditions
    const { data: finalCheck } = await supabase
      .from("unified_cod_selections")
      .select("id, class_year")
      .eq("cod_date", codDate);

    if (finalCheck && finalCheck.length >= 2) {
      console.log(
        "Race condition detected: selections were created by another process"
      );
      return NextResponse.json(
        {
          message: "Selections were already created by another process",
          date: codDate,
        },
        { status: 200 }
      );
    }

    // Check for class conflicts in final check
    const finalExistingClasses = new Set(
      (finalCheck || [])
        .map((selection: any) => selection.class_year)
        .filter(Boolean)
    );

    // Filter out students from classes that now have selections
    const finalSelectedStudents = selectedStudents.filter(
      (item) => !finalExistingClasses.has(item.student.class_year)
    );

    if (finalSelectedStudents.length === 0) {
      console.log(
        "All selected classes already have selections after final check"
      );
      return NextResponse.json(
        {
          message: "All selected classes already have selections",
          date: codDate,
        },
        { status: 200 }
      );
    }

    // Create selection records for each selected student with an extra class-level guard
    for (const {
      booking: selectedBooking,
      student: selectedStudent,
    } of finalSelectedStudents) {
      // Per-insert guard: if a selection already exists for this class and date, skip inserting
      const { data: classSelections } = await supabase
        .from("unified_cod_selections")
        .select("id, class_year")
        .eq("cod_date", codDate);

      const classAlreadyFilled = (classSelections || []).some(
        (s: any) => s.class_year === selectedStudent.class_year
      );

      if (classAlreadyFilled) {
        console.log(
          `Skip insert: class ${selectedStudent.class_year} already has a selection for ${codDate}`
        );
        continue;
      }

      const { data: selection, error: selectionError } = await (supabase as any)
        .from("unified_cod_selections")
        .insert([
          {
            student_id: selectedBooking.student_id,
            cod_date: codDate,
            selected_at: new Date().toISOString(),
            // optional: store class_year directly (trigger will also populate)
            class_year: selectedStudent.class_year,
          },
        ])
        .select()
        .single();

      if (selectionError) {
        // Handle unique constraint gracefully (race-safe): code 23505
        const pgCode = (selectionError as any).code || (selectionError as any)?.hint || '';
        if ((selectionError as any).code === '23505') {
          console.warn(
            `Unique constraint prevented duplicate selection for ${codDate} / ${selectedStudent.class_year}. Skipping.`
          );
          continue;
        }
        console.error("Error creating selection:", selectionError);
        return NextResponse.json(
          {
            error: "Failed to create selection",
            details: selectionError.message,
          },
          { status: 500 }
        );
      }

      selectionResults.push(selection);
    }

    // Format the COD date for email
    const formattedDate = new Date(
      codDate + "T12:00:00"
    ).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Log successful selections
    for (const { student: selectedStudent } of finalSelectedStudents) {
      console.log(
        "Successfully selected student:",
        selectedStudent.register_number,
        "for",
        formattedDate
      );
    }

    // Create fines for students who didn't book for this COD
    console.log(
      "Creating fines for non-booked students for date:",
      codDate
    );
    try {
      const fineResult = await fineService.createFinesForNonBookedStudents(
        codDate
      );
      console.log("Fine creation result:", fineResult);
    } catch (fineError) {
      console.error("Error creating fines for non-booked students:", fineError);
      // Don't fail the selection process if fine creation fails
    }

    return NextResponse.json(
      {
        message: `${finalSelectedStudents.length} student(s) selected successfully`,
        selections: finalSelectedStudents.map((item, index) => ({
          id: (selectionResults[index] as any).id,
          student: {
            register_number: item.student.register_number,
            name: item.student.name,
            email: item.student.email,
            class_year: item.student.class_year,
          },
          cod_date: codDate,
          selected_at: (selectionResults[index] as any).selected_at,
        })),
        summary: {
          total_bookings: bookings.length,
          eligible_bookings: eligibleBookings.length,
          already_selected_excluded: previouslySelectedStudentIds.size,
          selection_basis: "same-day bookings only",
          booking_date: codTimingService.getTodayDate(),
          cod_date: codDate,
          ii_it_bookings: iiItBookings.length,
          iii_it_bookings: iiiItBookings.length,
          selected_count: finalSelectedStudents.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Auto-selection error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check selection status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    const { data: selections, error } = await supabase
      .from("unified_cod_selections")
      .select(
        `
        *,
        unified_students(*)
      `
      )
      .eq("cod_date", date);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch selections", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        selections: selections || [],
        count: selections ? selections.length : 0,
        exists: !!(selections && selections.length > 0),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Selection check error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

