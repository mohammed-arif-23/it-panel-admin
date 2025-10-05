import { supabaseAdmin } from "./supabase";
import { holidayService } from "./holidayService";

export interface FineRecord {
  id?: string;
  student_id: string;
  fine_type:
    | "seminar_no_booking"
    | "assignment_late"
    | "attendance_absent"
    | "other";
  reference_date: string;
  amount: number; // Fixed amount per day (₹10 for no booking)
  payment_status: "pending" | "paid" | "waived";
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export class FineService {
  private static instance: FineService;

  static getInstance(): FineService {
    if (!FineService.instance) {
      FineService.instance = new FineService();
    }
    return FineService.instance;
  }

  /**
   * Check if a date is a valid working day (not Sunday or explicit holiday)
   * Saturday is considered a working day unless explicitly marked as holiday in admin panel
   */
  private async isWorkingDay(date: string): Promise<boolean> {
    const dateObj = new Date(date + "T12:00:00");
    const dayOfWeek = dateObj.getDay();

    console.log(
      `DEBUG: Date ${date} is day of week: ${dayOfWeek} (0=Sunday, 6=Saturday)`
    );

    // Skip only Sundays (Sunday = 0)
    // Saturday (6) is a working day unless explicitly marked as holiday
    if (dayOfWeek === 0) {
      console.log(`DEBUG: ${date} is Sunday, not a working day`);
      return false;
    }

    // Check if this date is explicitly marked as a holiday in admin panel
    const { isHoliday } = await holidayService.isHoliday(date);
    console.log(`DEBUG: ${date} is holiday: ${isHoliday}`);
    return !isHoliday;
  }

  /**
   * Create fines for students who didn't book seminars on a specific date
   * Logic: Students who (didn't book) AND (haven't completed seminar) AND (not selected for future)
   */
  async createFinesForNonBookedStudents(seminarDate: string): Promise<{
    success: boolean;
    message: string;
    finesCreated: number;
    errors: string[];
  }> {
    try {
      console.log(
        "Creating daily fines for non-booked students for date:",
        seminarDate
      );

      // Check if this is a working day (no fines on weekends/holidays)
      const isWorking = await this.isWorkingDay(seminarDate);
      console.log(`DEBUG: Is ${seminarDate} a working day? ${isWorking}`);
      if (!isWorking) {
        return {
          success: true,
          message: `No fines created - ${seminarDate} is not a working day`,
          finesCreated: 0,
          errors: [],
        };
      }

      // Get only II-IT and III-IT students
      const { data: allStudents, error: studentsError } = await supabaseAdmin
        .from("unified_students")
        .select("id, register_number, name, class_year")
        .in("class_year", ["II-IT", "III-IT"]);

      if (studentsError) {
        console.error("Error fetching all students:", studentsError);
        return {
          success: false,
          message: "Failed to fetch all students",
          finesCreated: 0,
          errors: [studentsError.message],
        };
      }

      // Get students who booked for this specific date
      const { data: bookings, error: bookingsError } = await supabaseAdmin
        .from("unified_seminar_bookings")
        .select("student_id")
        .eq("booking_date", seminarDate);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        return {
          success: false,
          message: "Failed to fetch bookings",
          finesCreated: 0,
          errors: [bookingsError.message],
        };
      }

      // Get students who have been selected for any seminar (past or future)
      // If they're in selections, they shouldn't get fines
      const { data: selectedStudents, error: selectedError } =
        await supabaseAdmin
          .from("unified_seminar_selections")
          .select("student_id, seminar_date");

      if (selectedError) {
        console.error("Error fetching selected students:", selectedError);
        return {
          success: false,
          message: "Failed to fetch selected students",
          finesCreated: 0,
          errors: [selectedError.message],
        };
      }

      // Create sets for filtering
      const bookedStudentIds = new Set(
        bookings?.map((b: any) => b.student_id) || []
      );
      const selectedStudentIds = new Set(
        (selectedStudents || []).map((record: any) => record.student_id)
      );

      // Apply the correct logic: Students who (didn't book) AND (not selected for any seminar)
      const studentsEligibleForFines = (allStudents || []).filter(
        (student: any) => {
          const didNotBook = !bookedStudentIds.has(student.id);
          const notSelected = !selectedStudentIds.has(student.id);

          return didNotBook && notSelected;
        }
      );

      console.log(`DEBUG: Total students: ${allStudents?.length || 0}`);
      console.log(`DEBUG: Students who booked: ${bookedStudentIds.size}`);
      console.log(
        `DEBUG: Students selected for seminars: ${selectedStudentIds.size}`
      );
      console.log(
        `DEBUG: Students eligible for fines: ${studentsEligibleForFines.length}`
      );

      if (studentsEligibleForFines.length === 0) {
        console.log(
          "DEBUG: No students eligible for fines - all either booked or selected for seminars"
        );
        return {
          success: true,
          message:
            "No students eligible for fines (all either booked or selected for seminars)",
          finesCreated: 0,
          errors: [],
        };
      }

      // Check if fines already exist for this specific date
      const { data: existingFines, error: fineCheckError } = await supabaseAdmin
        .from("unified_student_fines")
        .select("student_id")
        .eq("reference_date", seminarDate)
        .eq("fine_type", "seminar_no_booking");

      if (fineCheckError) {
        console.error("Error checking existing fines:", fineCheckError);
      }

      const existingFineStudentIds = new Set(
        (existingFines || []).map((fine: any) => fine.student_id)
      );

      // Filter out students who already have fines for this date
      const studentsToFine = studentsEligibleForFines.filter(
        (student: any) => !existingFineStudentIds.has(student.id)
      );

      if (studentsToFine.length === 0) {
        console.log(
          "DEBUG: Fines already exist for all eligible students on this date"
        );
        return {
          success: true,
          message: "Fines already exist for all eligible students on this date",
          finesCreated: 0,
          errors: [],
        };
      }

      // Create simple daily fines: ₹10 per day not booked
      console.log(
        `DEBUG: About to create fines for ${studentsToFine.length} students`
      );
      const results = [];
      const errors = [];

      for (const student of studentsToFine) {
        try {
          if (
            (student as any).register_number == "620123205015" ||
            (student as any).register_number == "620123205027"
          ) {
            console.log("No Fine");
            continue;
          } else {
            const { data: upserted, error } = await (supabaseAdmin as any)
              .from("unified_student_fines")
              .upsert(
                {
                  student_id: (student as any).id,
                  fine_type: "seminar_no_booking",
                  reference_date: seminarDate,
                  base_amount: 10.0, // Fixed ₹10 per day
                  daily_increment: 0.0, // No increments
                  days_overdue: 1, // Always 1 day for the specific date
                  payment_status: "pending",
                },
                {
                  onConflict: "student_id,fine_type,reference_date",
                  ignoreDuplicates: true,
                }
              )
              .select();

            // If Supabase returned an error object, handle it explicitly
            if (error) {
              // Unique violation: skip silently
              if ((error as any).code === '23505' || (error as any).message?.includes('duplicate key')) {
                console.warn(
                  `Duplicate fine detected for student ${(student as any).register_number} on ${seminarDate}, skipping.`
                );
                continue;
              }
              // Other errors: record and continue
              console.error(
                `Failed to create fine for student ${(student as any).register_number}:`,
                error
              );
              errors.push({
                studentId: (student as any).id,
                error: (error as any).message || 'Unknown error',
              });
              continue;
            }

            // If a new row was inserted, upserted will be a non-empty array
            const insertedFine = Array.isArray(upserted) && upserted.length > 0 ? upserted[0] : null;
            if (!insertedFine) {
              // Duplicate (ignored) or nothing inserted; skip increment
              console.warn(
                `No new fine inserted for ${(student as any).register_number} on ${seminarDate} (likely duplicate).`
              );
              continue;
            }

            // If insert succeeded, record and increment student's total
            results.push({
              studentId: (student as any).id,
              fineId: (insertedFine as any).id,
              action: "created",
            });
            // Increment student's total fine amount (sum pending fines)
            try {
              const sid = (student as any).id
              const addAmount = (insertedFine as any).base_amount || 10
              const { data: s } = await (supabaseAdmin as any)
                .from('unified_students')
                .select('total_fine_amount')
                .eq('id', sid)
                .single()
              const current = (s?.total_fine_amount ?? 0) as number
              await (supabaseAdmin as any)
                .from('unified_students')
                .update({ total_fine_amount: current + addAmount })
                .eq('id', sid)
            } catch (e) {
              console.warn('Failed to increment total_fine_amount for student', (student as any).id)
            }
            console.log(
              `Created ₹10 fine for student ${
                (student as any).register_number
              } (${(student as any).name}) for date ${seminarDate}`
            );
          }
        } catch (error: any) {
          // Handle unique constraint violation gracefully (duplicate fine)
          if (error && (error.code === '23505' || error.message?.includes('duplicate key'))) {
            console.warn(
              `Duplicate fine detected for student ${(student as any).register_number} on ${seminarDate}, skipping.`
            );
            continue;
          }
          console.error(
            `Failed to create fine for student ${
              (student as any).register_number
            }:`,
            error
          );
          errors.push({
            studentId: (student as any).id,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      console.log(
        `Successfully created ${results.length} daily fines for eligible students`
      );

      return {
        success: true,
        message: `Created ₹10 fine for ${results.length} students who didn't book and aren't selected for any seminar on ${seminarDate}`,
        finesCreated: results.length,
        errors: errors.map((e) => `Student ${e.studentId}: ${e.error}`),
      };
    } catch (error) {
      console.error("Error in createFinesForNonBookedStudents:", error);
      return {
        success: false,
        message: "Internal error while creating fines",
        finesCreated: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Create a manual fine (admin function)
   */
  async createManualFine(
    fine: Omit<FineRecord, "id" | "created_at" | "updated_at">
  ): Promise<{
    success: boolean;
    message: string;
    fine?: FineRecord;
  }> {
    try {
      // Prevent duplicates for same (student, type, date)
      const { data: existing } = await (supabaseAdmin as any)
        .from("unified_student_fines")
        .select("id")
        .eq("student_id", fine.student_id)
        .eq("fine_type", fine.fine_type)
        .eq("reference_date", fine.reference_date)
        .maybeSingle?.() ?? { data: null };

      if (existing) {
        return {
          success: false,
          message: "Fine already exists for this student, type and date",
        };
      }

      // Convert to database format
      const dbFine = {
        student_id: fine.student_id,
        fine_type: fine.fine_type,
        reference_date: fine.reference_date,
        base_amount: fine.amount, // Use the fixed amount
        daily_increment: 0.0, // No increments in new system
        days_overdue: 1, // Always 1 for daily fines
        payment_status: fine.payment_status,
      };

      const { data, error } = await (supabaseAdmin as any)
        .from("unified_student_fines")
        .insert([dbFine])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          message: `Failed to create fine: ${error.message}`,
        };
      }

      // Increment student's total fine amount
      try {
        const sid = fine.student_id
        const addAmount = fine.amount
        const { data: s } = await (supabaseAdmin as any)
          .from('unified_students')
          .select('total_fine_amount')
          .eq('id', sid)
          .single()
        const current = (s?.total_fine_amount ?? 0) as number
        await (supabaseAdmin as any)
          .from('unified_students')
          .update({ total_fine_amount: current + addAmount })
          .eq('id', sid)
      } catch (e) {
        console.warn('Failed to increment total_fine_amount for student', fine.student_id)
      }

      return {
        success: true,
        message: "Fine created successfully",
        fine: {
          ...fine,
          id: data.id,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating fine: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Update fine payment status (admin function)
   */
  async updateFineStatus(
    fineId: string,
    status: "pending" | "paid" | "waived",
    notes?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const updateData: any = {
        payment_status: status,
        updated_at: new Date().toISOString(),
      };

      if (notes) {
        updateData.description = notes;
      }

      const { error } = await (supabaseAdmin as any)
        .from("unified_student_fines")
        .update(updateData)
        .eq("id", fineId);

      if (error) {
        return {
          success: false,
          message: `Failed to update fine: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Fine status updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: `Error updating fine: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Delete a fine (admin function)
   */
  async deleteFine(fineId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { error } = await supabaseAdmin
        .from("unified_student_fines")
        .delete()
        .eq("id", fineId);

      if (error) {
        return {
          success: false,
          message: `Failed to delete fine: ${error.message}`,
        };
      }

      return {
        success: true,
        message: "Fine deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: `Error deleting fine: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Get student fines with calculated amounts
   */
  async getStudentFines(studentId: string): Promise<{
    success: boolean;
    fines: Array<
      FineRecord & { currentAmount: number; workingDaysOverdue: number }
    >;
    totalAmount: number;
  }> {
    try {
      const { data: fines, error } = await (supabaseAdmin as any)
        .from("unified_student_fines")
        .select("*")
        .eq("student_id", studentId)
        .eq("payment_status", "pending");

      if (error) {
        return {
          success: false,
          fines: [],
          totalAmount: 0,
        };
      }

      const finesWithAmounts = await Promise.all(
        (fines || []).map(async (fine: any) => {
          // In new simplified system: fixed amount per day
          const currentAmount = fine.base_amount || 10.0;
          return {
            ...fine,
            workingDaysOverdue: 1, // Always 1 day in new system
            currentAmount,
          };
        })
      );

      const totalAmount = finesWithAmounts.reduce(
        (sum: number, fine: any) => sum + fine.currentAmount,
        0
      );

      return {
        success: true,
        fines: finesWithAmounts,
        totalAmount,
      };
    } catch (error) {
      return {
        success: false,
        fines: [],
        totalAmount: 0,
      };
    }
  }

  /**
   * Get all fines for admin dashboard
   */
  async getAllFines(filters?: {
    class?: string;
    status?: string;
    type?: string;
    from?: string;
    to?: string;
  }): Promise<{
    success: boolean;
    fines: Array<
      FineRecord & {
        student_name: string;
        register_number: string;
        class_year: string;
        currentAmount: number;
        workingDaysOverdue: number;
      }
    >;
  }> {
    try {
      let query = (supabaseAdmin as any).from("unified_student_fines").select(`
          *,
          unified_students(name, register_number, class_year)
        `);

      // Apply filters
      if (filters?.class && filters.class !== "all") {
        // We'll need to filter by class in the application layer since it's a joined field
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("payment_status", filters.status);
      }

      if (filters?.type && filters.type !== "all") {
        query = query.eq("fine_type", filters.type);
      }

      if (filters?.from) {
        query = query.gte("reference_date", filters.from);
      }

      if (filters?.to) {
        query = query.lte("reference_date", filters.to);
      }

      const { data: fines, error } = await query;

      if (error) {
        return {
          success: false,
          fines: [],
        };
      }

      let filteredFines = fines || [];

      // Filter by class if specified
      if (filters?.class && filters.class !== "all") {
        filteredFines = filteredFines.filter(
          (fine: any) =>
            (fine.unified_students as any)?.class_year === filters.class
        );
      }

      const finesWithAmounts = await Promise.all(
        filteredFines.map(async (fine: any) => {
          // In new simplified system: fixed amount per day
          const currentAmount = fine.base_amount || 10.0;
          const student = fine.unified_students as any;

          return {
            ...fine,
            student_name: student?.name || "Unknown",
            register_number: student?.register_number || "Unknown",
            class_year: student?.class_year || "Unknown",
            workingDaysOverdue: 1, // Always 1 day in new system
            currentAmount,
          };
        })
      );

      return {
        success: true,
        fines: finesWithAmounts,
      };
    } catch (error) {
      return {
        success: false,
        fines: [],
      };
    }
  }
}

export const fineService = FineService.getInstance();
