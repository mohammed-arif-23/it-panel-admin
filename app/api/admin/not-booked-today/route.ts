import { NextRequest } from "next/server";
import { dbHelpers } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    // Get students not booked today
    const { data: studentsNotBooked, error } =
      await dbHelpers.getStudentsNotBookedToday();

    if (error) {
      console.error("Error fetching not booked students:", error);
      return Response.json(
        { error: "Failed to fetch students not booked today" },
        { status: 500 }
      );
    }

    if (!studentsNotBooked || studentsNotBooked.length === 0) {
      return Response.json({
        message: "No students found who haven't booked today",
        data: [],
        finesAdded: 0,
      });
    }

    // Add fines for students who haven't booked today
    const finesResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const student of studentsNotBooked) {
      try {
        const { data: fine, error: fineError } =
          await dbHelpers.addFineForNotBooking((student as any).id);

        if (fineError) {
          console.error(
            `Error adding fine for student ${
              (student as any).register_number
            }:`,
            fineError
          );
          finesResults.push({
            studentId: (student as any).id,
            registerNumber: (student as any).register_number,
            status: "error",
            error: fineError.message,
          });
          errorCount++;
        } else {
          finesResults.push({
            studentId: (student as any).id,
            registerNumber: (student as any).register_number,
            status: "success",
            fineId: (fine as any)?.id,
          });
          successCount++;
        }
      } catch (fineError) {
        console.error(
          `Unexpected error adding fine for student ${
            (student as any).register_number
          }:`,
          fineError
        );
        finesResults.push({
          studentId: (student as any).id,
          registerNumber: (student as any).register_number,
          status: "error",
          error: "Unexpected error occurred",
        });
        errorCount++;
      }
    }

    return Response.json({
      message: `Processed ${studentsNotBooked.length} students. Added ${successCount} fines successfully, ${errorCount} errors.`,
      data: studentsNotBooked,
      finesAdded: successCount,
      errors: errorCount,
      finesResults,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
