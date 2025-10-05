// Holiday Service for automatic seminar rescheduling
// Handles holiday detection and automatic seminar date adjustment

import { supabaseAdmin } from './supabase';

interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  description?: string;
  affects_seminars: boolean;
}

interface RescheduleResult {
  originalDate: string;
  newDate: string;
  holidayName: string;
  affectedStudentsCount: number;
  rescheduleReason: string;
}

export class HolidayService {
  private static instance: HolidayService;

  private constructor() {}

  public static getInstance(): HolidayService {
    if (!HolidayService.instance) {
      HolidayService.instance = new HolidayService();
    }
    return HolidayService.instance;
  }

  // Check if a specific date is a holiday
  async isHoliday(date: string): Promise<{ isHoliday: boolean; holiday?: Holiday }> {
    try {
      const { data: holiday, error } = await (supabaseAdmin as any)
        .from('unified_holidays')
        .select('*')
        .eq('holiday_date', date)
        .eq('affects_seminars', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking holiday:', error);
        return { isHoliday: false };
      }

      return {
        isHoliday: !!holiday,
        holiday: holiday || undefined
      };
    } catch (error) {
      console.error('Exception checking holiday:', error);
      return { isHoliday: false };
    }
  }

  // Get the next working day after a holiday
  async getNextWorkingDay(startDate: string, daysToAdd: number = 1): Promise<string> {
    console.log(`DEBUG: Finding next working day after ${startDate}, adding ${daysToAdd} working days`);
    let currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < daysToAdd) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Skip only Sundays (Sunday = 0)
      // Saturday (6) is considered a working day unless explicitly marked as holiday
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek === 0) {
        console.log(`DEBUG: Skipping Sunday: ${dateString}`);
        continue;
      }

      // Check if this date is also a holiday
      const { isHoliday } = await this.isHoliday(dateString);
      if (!isHoliday) {
        addedDays++;
        console.log(`DEBUG: Found working day: ${dateString} (${addedDays}/${daysToAdd})`);
      } else {
        console.log(`DEBUG: Skipping holiday: ${dateString}`);
      }
    }

    const finalDate = currentDate.toISOString().split('T')[0];
    console.log(`DEBUG: Final next working day: ${finalDate}`);
    return finalDate;
  }

  // Check and handle seminar rescheduling for a given date
  async checkAndRescheduleSeminar(seminarDate: string): Promise<{
    needsReschedule: boolean;
    newDate?: string;
    holidayName?: string;
    result?: RescheduleResult;
  }> {
    try {
      console.log('Checking if seminar date needs rescheduling:', seminarDate);
      
      const { isHoliday, holiday } = await this.isHoliday(seminarDate);
      
      if (!isHoliday) {
        console.log('No holiday detected for date:', seminarDate);
        return { needsReschedule: false };
      }

      console.log(`Holiday detected: ${holiday!.holiday_name} on ${seminarDate}`);
      
      // Calculate the next working day (day after the holiday)
      const newDate = await this.getNextWorkingDay(seminarDate, 1);
      console.log(`Rescheduling seminar from ${seminarDate} to ${newDate}`);

      // Check if there are any students selected for the original date
      const { data: existingSelections } = await (supabaseAdmin as any)
        .from('unified_seminar_selections')
        .select(`
          id,
          student_id,
          seminar_date,
          unified_students (
            id,
            name,
            email,
            register_number,
            class_year
          )
        `)
        .eq('seminar_date', seminarDate);

      if (existingSelections && existingSelections.length > 0) {
        // Reschedule existing selections
        const rescheduleResult = await this.rescheduleSeminarSelections(
          seminarDate,
          newDate,
          holiday!.holiday_name,
          existingSelections
        );

        return {
          needsReschedule: true,
          newDate,
          holidayName: holiday!.holiday_name,
          result: rescheduleResult
        };
      } else {
        // No existing selections, just return the new date
        return {
          needsReschedule: true,
          newDate,
          holidayName: holiday!.holiday_name
        };
      }

    } catch (error) {
      console.error('Error checking seminar reschedule:', error);
      return { needsReschedule: false };
    }
  }

  // Reschedule seminar selections and notify students
  private async rescheduleSeminarSelections(
    originalDate: string,
    newDate: string,
    holidayName: string,
    selections: any[]
  ): Promise<RescheduleResult> {
    try {
      console.log(`Rescheduling ${selections.length} seminar selections from ${originalDate} to ${newDate}`);

      // Update all selections to the new date
      const updatePromises = selections.map((selection: any) =>
        (supabaseAdmin as any)
          .from('unified_seminar_selections')
          .update({
            seminar_date: newDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', selection.id)
      );

      await Promise.all(updatePromises);

      // Create reschedule history record
      const rescheduleData = {
        holiday_id: null, // We can link this if needed
        original_date: originalDate,
        new_date: newDate,
        seminar_topic: 'College Seminar',
        class_year: 'ALL',
        reschedule_reason: `Holiday: ${holidayName}`,
        reschedule_type: 'automatic',
        affected_students_count: selections.length,
        affected_bookings_count: 0,
        status: 'confirmed',
        rescheduled_by: 'system',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await (supabaseAdmin as any)
        .from('unified_seminar_reschedule_history')
        .insert(rescheduleData);

      // Send notifications to affected students
      await this.notifyStudentsOfReschedule(selections, originalDate, newDate, holidayName);

      console.log('Seminar reschedule completed successfully');

      return {
        originalDate,
        newDate,
        holidayName,
        affectedStudentsCount: selections.length,
        rescheduleReason: `Holiday: ${holidayName}`
      };

    } catch (error) {
      console.error('Error rescheduling seminar selections:', error);
      throw error;
    }
  }

  // Send notifications to students about seminar reschedule
  private async notifyStudentsOfReschedule(
    selections: any[],
    originalDate: string,
    newDate: string,
    holidayName: string
  ): Promise<void> {
    try {
      const originalDateFormatted = new Date(originalDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const newDateFormatted = new Date(newDate + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create notification for each student
      const notificationPromises = selections.map(async (selection: any) => {
        const student = selection.unified_students;
        
        if (student?.id) {
          // Log the reschedule for the student
          console.log(`Seminar rescheduled for student ${student.register_number}: ${originalDate} -> ${newDate}`);

          // Store notification in database for record keeping
          try {
            await (supabaseAdmin as any)
              .from('unified_holiday_notifications')
              .insert({
                holiday_id: null,
                notification_type: 'seminar_reschedule',
                target_audience: 'individual_student',
                target_student_id: student.id,
                notification_title: `Seminar Rescheduled - ${holidayName}`,
                notification_body: `Your seminar scheduled for ${originalDateFormatted} has been moved to ${newDateFormatted} due to ${holidayName}.`,
                notification_data: {
                  originalDate,
                  newDate,
                  holidayName,
                  studentId: student.id,
                  selectionId: selection.id
                },
                created_by: 'system',
                sent_at: new Date().toISOString()
              });
          } catch (dbError) {
            console.error('Failed to store notification in database:', dbError);
          }
        }
      });

      await Promise.all(notificationPromises);
      console.log(`Sent reschedule notifications to ${selections.length} students`);

    } catch (error) {
      console.error('Error sending reschedule notifications:', error);
    }
  }

  // Get holiday-aware next seminar date
  async getHolidayAwareNextSeminarDate(baseDate?: string): Promise<string> {
    try {
      // Use provided base date or calculate tomorrow
      let nextDate: string;
      
      if (baseDate) {
        nextDate = baseDate;
        console.log(`DEBUG: Using provided base date: ${baseDate}`);
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Skip Sunday
        if (tomorrow.getDay() === 0) {
          tomorrow.setDate(tomorrow.getDate() + 1);
          console.log(`DEBUG: Tomorrow is Sunday, moving to Monday`);
        }
        
        nextDate = tomorrow.toISOString().split('T')[0];
        console.log(`DEBUG: Calculated next seminar date: ${nextDate}`);
      }

      // Check if the calculated date is a holiday
      const { isHoliday } = await this.isHoliday(nextDate);
      console.log(`DEBUG: Is ${nextDate} a holiday? ${isHoliday}`);
      
      if (isHoliday) {
        // If it's a holiday, get the next working day
        const originalDate = nextDate;
        nextDate = await this.getNextWorkingDay(nextDate, 1);
        console.log(`Holiday detected, adjusted seminar date from ${originalDate} to: ${nextDate}`);
      }

      return nextDate;
    } catch (error) {
      console.error('Error getting holiday-aware seminar date:', error);
      // Fallback to basic calculation
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 0) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      return tomorrow.toISOString().split('T')[0];
    }
  }
}

// Export singleton instance
export const holidayService = HolidayService.getInstance();
