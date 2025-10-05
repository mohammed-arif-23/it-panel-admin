import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

// Check admin authentication using JWT
async function checkAdminAuth(request: NextRequest): Promise<boolean> {
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

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const classYear = searchParams.get("class") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get seminar bookings with student details
    let bookingsQuery = supabase
      .from("unified_seminar_bookings")
      .select(
        `
        id,
        student_id,
        booking_date,
        seminar_topic,
        created_at,
        unified_students!inner (
          id,
          register_number,
          name,
          email,
          class_year
        )
      `
      )
      .order("booking_date", { ascending: false });

    // Apply class filter
    if (classYear !== "all") {
      bookingsQuery = bookingsQuery.eq(
        "unified_students.class_year",
        classYear
      );
    }

    // Apply date range filter
    if (startDate) {
      bookingsQuery = bookingsQuery.gte("booking_date", startDate);
    }
    if (endDate) {
      bookingsQuery = bookingsQuery.lte("booking_date", endDate);
    }

    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error("Error fetching seminar bookings:", bookingsError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch seminar bookings",
        },
        { status: 500 }
      );
    }

    // Get seminar selections with student details and try to get seminar topic from bookings
    let selectionsQuery = supabase
      .from("unified_seminar_selections")
      .select(
        `
        id,
        student_id,
        seminar_date,
        selected_at,
        unified_students!inner (
          id,
          register_number,
          name,
          email,
          class_year
        )
      `
      )
      .order("seminar_date", { ascending: false });

    // Apply class filter
    if (classYear !== "all") {
      selectionsQuery = selectionsQuery.eq(
        "unified_students.class_year",
        classYear
      );
    }

    // Apply date range filter
    if (startDate) {
      selectionsQuery = selectionsQuery.gte("seminar_date", startDate);
    }
    if (endDate) {
      selectionsQuery = selectionsQuery.lte("seminar_date", endDate);
    }

    const { data: selections, error: selectionsError } = await selectionsQuery;

    if (selectionsError) {
      console.error("Error fetching seminar selections:", selectionsError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch seminar selections",
        },
        { status: 500 }
      );
    }

    // Define types for the query results
    type BookingWithStudent = {
      id: string;
      student_id: string;
      booking_date: string;
      seminar_topic: string | null;
      created_at: string;
      unified_students: {
        id: string;
        register_number: string;
        name: string | null;
        email: string | null;
        class_year: string | null;
      };
    };

    type SelectionWithStudent = {
      id: string;
      student_id: string;
      seminar_date: string;
      selected_at: string;
      unified_students: {
        id: string;
        register_number: string;
        name: string | null;
        email: string | null;
        class_year: string | null;
      };
    };

    type SelectionWithTopic = SelectionWithStudent & {
      seminar_topic: string | null;
    };

    // Enhance selections with seminar topics from bookings
    const selectionsWithTopics: SelectionWithTopic[] = (selections || []).map(
      (selection: SelectionWithStudent) => {
        // Find matching booking for this student and date
        const matchingBooking = ((bookings as BookingWithStudent[]) || []).find(
          (booking: BookingWithStudent) =>
            booking.student_id === selection.student_id &&
            booking.booking_date === selection.seminar_date
        );

        return {
          ...selection,
          seminar_topic: matchingBooking?.seminar_topic || null,
        };
      }
    );

    // Get reschedule history
    let rescheduleQuery = supabase
      .from("unified_seminar_reschedule_history")
      .select("*")
      .order("created_at", { ascending: false });

    // Apply class filter
    if (classYear !== "all") {
      rescheduleQuery = rescheduleQuery.eq("class_year", classYear);
    }

    // Apply date range filter
    if (startDate) {
      rescheduleQuery = rescheduleQuery.gte("original_date", startDate);
    }
    if (endDate) {
      rescheduleQuery = rescheduleQuery.lte("original_date", endDate);
    }

    const { data: reschedules, error: reschedulesError } =
      await rescheduleQuery;

    if (reschedulesError) {
      console.error("Error fetching reschedule history:", reschedulesError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch reschedule history",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookings || [],
        selections: selectionsWithTopics || [],
        reschedules: reschedules || [],
      },
    });
  } catch (error) {
    console.error("Seminar history API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}