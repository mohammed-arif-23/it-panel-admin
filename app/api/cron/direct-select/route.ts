import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { seminarTimingService } from "../../../../lib/seminarTimingService";
import { holidayService } from "../../../../lib/holidayService";
import { fineService } from "../../../../lib/fineService";
import { emailService } from "../../../../lib/emailService";
import { sendEnhancedNotifications } from "../../../../lib/enhancedNotificationService";

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

// Helper function to create fines for non-booked students
async function createFinesForNonBookedStudents(seminarDate: string) {
  console.log(
    "Creating ₹10 fines for non-booked students for date:",
    seminarDate
  );

  let fineResult = null;
  try {
    // First try the fineService
    fineResult = await fineService.createFinesForNonBookedStudents(seminarDate);
    console.log(
      "CRON Fine creation result:",
      JSON.stringify(fineResult, null, 2)
    );

    if (!fineResult.success) {
      console.error(
        "CRON Fine creation failed (no fallback will run):",
        fineResult.message,
        fineResult.errors
      );
    } else {
      console.log(
        `CRON Successfully created ${fineResult.finesCreated} fines for ${seminarDate}`
      );
    }
  } catch (fineError) {
    console.error(
      "CRON Error creating fines for non-booked students:",
      fineError
    );
    fineResult = {
      success: false,
      message: "Error creating fines",
      finesCreated: 0,
      errors: [
        fineError instanceof Error ? fineError.message : "Unknown error",
      ],
    };
  }

  return fineResult;
}

export async function GET() {
  try {
    console.log("Direct cron selection started at:", new Date().toISOString());

    // Get next seminar date with holiday awareness
    let seminarDate = seminarTimingService.getNextSeminarDate();

    // Check if the calculated seminar date is a holiday and reschedule if needed
    const rescheduleCheck = await holidayService.checkAndRescheduleSeminar(
      seminarDate
    );

    if (rescheduleCheck.needsReschedule) {
      console.log(
        `Direct cron - Holiday detected: ${rescheduleCheck.holidayName}`
      );
      console.log(
        `Direct cron - Seminar rescheduled from ${seminarDate} to ${rescheduleCheck.newDate}`
      );

      seminarDate = rescheduleCheck.newDate!;

      if (rescheduleCheck.result) {
        return NextResponse.json(
          {
            success: true,
            message:
              "Direct cron: Seminar automatically rescheduled due to holiday",
            reschedule: rescheduleCheck.result,
            holidayReschedule: true,
            originalDate: rescheduleCheck.result.originalDate,
            newDate: rescheduleCheck.result.newDate,
            holidayName: rescheduleCheck.result.holidayName,
            affectedStudents: rescheduleCheck.result.affectedStudentsCount,
            source: "direct-cron-holiday-reschedule",
          },
          { status: 200 }
        );
      }
    }

    const dayName = new Date(seminarDate + "T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long" }
    );

    console.log(
      "Processing selection for date:",
      seminarDate,
      "(" + dayName + ")"
    );

    // Sundays are automatically skipped - no seminars on Sunday
    const seminarDay = new Date(seminarDate + "T12:00:00").getDay();
    if (seminarDay === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No seminar scheduled on Sunday - skipped automatically",
          date: seminarDate,
          next_seminar_date: seminarTimingService.getNextSeminarDate(),
          source: "direct-cron-sunday-skip",
        },
        { status: 200 }
      );
    }

    // Check if selections already exist for tomorrow (should be exactly 2 selections max, one per class)
    const { data: existingSelections, error: selectionCheckError } =
      await supabaseAdmin
        .from("unified_seminar_selections")
        .select(
          `
        *,
        unified_students(class_year)
      `
        )
        .eq("seminar_date", seminarDate);

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

    // Check if we already have one selection from each class (maximum 2 total, one per class)
    const existingClasses = new Set();
    if (existingSelections && existingSelections.length > 0) {
      existingSelections.forEach((selection: any) => {
        if (selection.unified_students?.class_year) {
          existingClasses.add(selection.unified_students.class_year);
        }
      });
    }

    const hasIIIT = existingClasses.has("II-IT");
    const hasIIIIT = existingClasses.has("III-IT");

    // If we already have one selection from each class, still create fines but skip selection
    if (hasIIIT && hasIIIIT) {
      console.log("Direct cron: Already have one selection from each class");

      // Create fines for students who didn't book for this seminar
      const fineResult = await createFinesForNonBookedStudents(seminarDate);

      return NextResponse.json(
        {
          message:
            "Selections already complete - one student from each class already selected",
          selections: existingSelections,
          fines: fineResult
            ? {
                success: fineResult.success,
                message: fineResult.message,
                finesCreated: fineResult.finesCreated,
                errors: fineResult.errors,
              }
            : null,
          source: "direct-cron-validation",
        },
        { status: 200 }
      );
    }

    // Get all bookings for tomorrow with student details
    const { data: bookings, error: bookingsError } = (await supabaseAdmin
      .from("unified_seminar_bookings")
      .select(
        `
        *,
        unified_students(*)
      `
      )
      .eq("booking_date", seminarDate)) as {
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
      console.log("No bookings found for date:", seminarDate);
      return NextResponse.json(
        { message: "No bookings found for selection", date: seminarDate },
        { status: 200 }
      );
    }

    console.log(`Found ${bookings.length} bookings for selection`);

    // Get ALL previous selections to avoid selecting students who have already presented
    // This ensures students don't get selected multiple times across different seminar dates
    const { data: previousSelections } = await supabaseAdmin
      .from("unified_seminar_selections")
      .select("student_id, seminar_date");

    const previouslySelectedStudentIds = new Set(
      (previousSelections as any[])?.map((selection) => selection.student_id) ||
        []
    );

    console.log(
      `Found ${previouslySelectedStudentIds.size} students who have already presented (excluding from selection)`
    );

    // Filter out previously selected students
    const eligibleBookings = bookings.filter(
      (booking) => !previouslySelectedStudentIds.has(booking.student_id)
    );

    if (eligibleBookings.length === 0) {
      return NextResponse.json(
        {
          message:
            "No eligible students available (all have already presented in previous seminars)",
          date: seminarDate,
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
      `Direct cron - Eligible II-IT bookings: ${iiItBookings.length}, Eligible III-IT bookings: ${iiiItBookings.length}`
    );

    const selectedStudents: Array<{
      booking: BookingWithStudent;
      student: BookingWithStudent["unified_students"];
    }> = [];

    // Select one student from II-IT class if available AND not already selected
    if (iiItBookings.length > 0 && !hasIIIT) {
      const randomIndex = Math.floor(Math.random() * iiItBookings.length);
      const selectedBooking = iiItBookings[randomIndex];
      selectedStudents.push({
        booking: selectedBooking,
        student: selectedBooking.unified_students,
      });
      console.log(
        "Direct cron - Selected II-IT student:",
        selectedBooking.unified_students.register_number
      );
    } else if (hasIIIT) {
      console.log(
        "Direct cron - II-IT class already has a selection, skipping"
      );
    } else {
      console.log("Direct cron - No eligible II-IT students available");
    }

    // Select one student from III-IT class if available AND not already selected
    if (iiiItBookings.length > 0 && !hasIIIIT) {
      const randomIndex = Math.floor(Math.random() * iiiItBookings.length);
      const selectedBooking = iiiItBookings[randomIndex];
      selectedStudents.push({
        booking: selectedBooking,
        student: selectedBooking.unified_students,
      });
      console.log(
        "Direct cron - Selected III-IT student:",
        selectedBooking.unified_students.register_number
      );
    } else if (hasIIIIT) {
      console.log(
        "Direct cron - III-IT class already has a selection, skipping"
      );
    } else {
      console.log("Direct cron - No eligible III-IT students available");
    }

    if (selectedStudents.length === 0) {
      return NextResponse.json(
        {
          message: "No students available for selection from either class",
          date: seminarDate,
        },
        { status: 200 }
      );
    }

    // Final check before creating selections to prevent race conditions
    const { data: finalCheck } = await supabaseAdmin
      .from("unified_seminar_selections")
      .select("id, class_year")
      .eq("seminar_date", seminarDate);

    if (finalCheck && finalCheck.length >= 2) {
      console.log(
        "Direct cron - Race condition detected: selections were created by another process"
      );
      return NextResponse.json(
        {
          message: "Selections were already created by another process",
          date: seminarDate,
          source: "direct-cron-race-condition-check",
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
        "Direct cron - All selected classes already have selections after final check"
      );
      return NextResponse.json(
        {
          message: "All selected classes already have selections",
          date: seminarDate,
          source: "direct-cron-final-check",
        },
        { status: 200 }
      );
    }

    // Create selection records
    const selectionResults: any[] = [];
    for (const { booking: selectedBooking, student: selectedStudent } of finalSelectedStudents) {
      // Per-insert guard: if a selection already exists for this class and date, skip inserting
      const { data: classSelections } = await supabaseAdmin
        .from("unified_seminar_selections")
        .select("id, class_year")
        .eq("seminar_date", seminarDate);

      const classAlreadyFilled = (classSelections || []).some(
        (s: any) => s.class_year === selectedStudent.class_year
      );

      if (classAlreadyFilled) {
        console.log(
          `Direct cron - Skip insert: class ${selectedStudent.class_year} already has a selection for ${seminarDate}`
        );
        continue;
      }

      const { data: selection, error: selectionError } = await (
        supabaseAdmin as any
      )
        .from("unified_seminar_selections")
        .insert([
          {
            student_id: selectedBooking.student_id,
            seminar_date: seminarDate,
            selected_at: new Date().toISOString(),
            // optional: store class_year directly; trigger will also populate
            class_year: selectedStudent.class_year,
          },
        ])
        .select()
        .single();

      if (selectionError) {
        if ((selectionError as any).code === '23505') {
          console.warn(
            `Direct cron - Unique constraint prevented duplicate selection for ${seminarDate} / ${selectedStudent.class_year}. Skipping.`
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

    // Log successful selections and send notifications
    for (const { student: selectedStudent } of finalSelectedStudents) {
      console.log(
        "Successfully selected student:",
        selectedStudent.register_number,
        "for seminar date:",
        seminarDate
      );

      // Send notification to all students in the selected student's class
      try {
        const notificationPayload = {
          title: `🎯 Seminar Selection - ${selectedStudent.class_year}`,
          body: `${selectedStudent.name} (${selectedStudent.register_number}) has been selected for seminar presentation on ${new Date(seminarDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`,
          url: '/seminar',
          icon: '/icons/android-launchericon.png',
          tag: 'seminar-selection',
          priority: 'high' as const,
          data: {
            type: 'seminar_selection',
            priority: 'high',
            category: 'seminar',
            student_id: selectedStudent.id,
            seminar_date: seminarDate,
            class_year: selectedStudent.class_year
          }
        };

        await sendEnhancedNotifications(
          { 
            target: 'class',
            targetValue: selectedStudent.class_year
          },
          notificationPayload
        );
        
        console.log(`✅ Notifications sent to ${selectedStudent.class_year} class for seminar selection`);
      } catch (notifError) {
        console.error('Error sending seminar selection notifications:', notifError);
        // Don't fail the selection if notification fails
      }
    }

    // Format the seminar date for logging
    const formattedDate = new Date(
      seminarDate + "T12:00:00"
    ).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Log successful selections with formatted date and send emails
    const emailResults: Array<{
      student: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const { student: selectedStudent } of finalSelectedStudents) {
      console.log(
        "Successfully selected student:",
        selectedStudent.register_number,
        "for",
        formattedDate
      );

      // Send email notification to selected student
      if (selectedStudent.email) {
        try {
          console.log(`Sending selection email to ${selectedStudent.email}...`);
          const emailResult = await emailService.sendSeminarSelectionEmail(
            selectedStudent.email,
            selectedStudent.name || selectedStudent.register_number,
            selectedStudent.register_number,
            seminarDate,
            selectedStudent.class_year
          );

          emailResults.push({
            student: selectedStudent.register_number,
            success: emailResult.success,
            error: emailResult.error,
          });

          if (emailResult.success) {
            console.log(
              `✅ Email sent successfully to ${selectedStudent.register_number}`
            );
          } else {
            console.error(
              `❌ Email failed for ${selectedStudent.register_number}:`,
              emailResult.error
            );
          }
        } catch (emailError) {
          console.error(
            `❌ Email error for ${selectedStudent.register_number}:`,
            emailError
          );
          emailResults.push({
            student: selectedStudent.register_number,
            success: false,
            error:
              emailError instanceof Error
                ? emailError.message
                : "Unknown email error",
          });
        }
      } else {
        console.warn(
          `⚠️ No email address for student ${selectedStudent.register_number}`
        );
        emailResults.push({
          student: selectedStudent.register_number,
          success: false,
          error: "No email address available",
        });
      }
    }

    // Create fines for students who didn't book for this seminar (₹10 per student)
    const fineResult = await createFinesForNonBookedStudents(seminarDate);

    console.log("Direct cron selection completed successfully");

    return NextResponse.json(
      {
        success: true,
        message: `Direct cron selection: ${finalSelectedStudents.length} student(s) selected successfully`,
        selections: finalSelectedStudents.map((item, index) => ({
          id: (selectionResults[index] as any)?.id,
          student: {
            register_number: item.student.register_number,
            name: item.student.name,
            email: item.student.email,
            class_year: item.student.class_year,
          },
          seminar_date: seminarDate,
          selected_at: (selectionResults[index] as any)?.selected_at,
        })),
        emails: {
          sent: emailResults.filter((r) => r.success).length,
          failed: emailResults.filter((r) => !r.success).length,
          results: emailResults,
        },
        fines: fineResult
          ? {
              success: fineResult.success,
              message: fineResult.message,
              finesCreated: fineResult.finesCreated,
              errors: fineResult.errors,
            }
          : null,
        summary: {
          total_bookings: bookings.length,
          eligible_bookings: eligibleBookings.length,
          already_presented_excluded: previouslySelectedStudentIds.size,
          selection_basis: "excluding all previously selected students",
          booking_date: seminarDate,
          seminar_date: seminarDate,
          ii_it_bookings: iiItBookings.length,
          iii_it_bookings: iiiItBookings.length,
          selected_count: finalSelectedStudents.length,
          emails_sent: emailResults.filter((r) => r.success).length,
          emails_failed: emailResults.filter((r) => !r.success).length,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Direct cron selection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST method
export async function POST() {
  return GET();
}
