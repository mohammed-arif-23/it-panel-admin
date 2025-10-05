import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { codTimingService } from '../../../../lib/codTimingService';
import { holidayService } from '../../../../lib/holidayService';
import { fineService } from '../../../../lib/fineService';
import { emailService } from '../../../../lib/emailService';

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

async function createFinesForNonBookedStudents(codDate: string) {
  console.log('Creating ₹10 fines for non-booked students for COD date:', codDate);
  
  let fineResult = null;
  try {
    fineResult = await fineService.createFinesForNonBookedStudents(codDate);
    console.log('CRON Fine creation result:', JSON.stringify(fineResult, null, 2));
    
    if (!fineResult.success) {
      console.error('CRON Fine creation failed:', fineResult.message, fineResult.errors);
    } else {
      console.log(`CRON Successfully created ${fineResult.finesCreated} fines for ${codDate}`);
    }
  } catch (fineError) {
    console.error('CRON Error creating fines:', fineError);
    fineResult = {
      success: false,
      message: 'Error creating fines',
      finesCreated: 0,
      errors: [fineError instanceof Error ? fineError.message : 'Unknown error'],
    };
  }
  
  return fineResult;
}

export async function GET() {
  try {
    console.log('COD cron selection started at:', new Date().toISOString());
    
    let codDate = codTimingService.getNextCODDate();
    
    const rescheduleCheck = await holidayService.checkAndRescheduleSeminar(codDate);
    
    if (rescheduleCheck.needsReschedule) {
      console.log(`COD cron - Holiday detected: ${rescheduleCheck.holidayName}`);
      console.log(`COD rescheduled from ${codDate} to ${rescheduleCheck.newDate}`);
      
      codDate = rescheduleCheck.newDate!;
      
      if (rescheduleCheck.result) {
        return NextResponse.json(
          {
            success: true,
            message: 'COD cron: Automatically rescheduled due to holiday',
            reschedule: rescheduleCheck.result,
            holidayReschedule: true,
            originalDate: rescheduleCheck.result.originalDate,
            newDate: rescheduleCheck.result.newDate,
            holidayName: rescheduleCheck.result.holidayName,
            affectedStudents: rescheduleCheck.result.affectedStudentsCount,
            source: 'cod-cron-holiday-reschedule',
          },
          { status: 200 }
        );
      }
    }
    
    const dayName = new Date(codDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
    console.log('Processing COD selection for date:', codDate, '(' + dayName + ')');
    
    const codDay = new Date(codDate + 'T12:00:00').getDay();
    if (codDay === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No COD scheduled on Sunday - skipped automatically',
          date: codDate,
          next_cod_date: codTimingService.getNextCODDate(),
          source: 'cod-cron-sunday-skip',
        },
        { status: 200 }
      );
    }
    
    const { data: existingSelections, error: selectionCheckError } = await supabaseAdmin
      .from('unified_cod_selections')
      .select(`*, unified_students(class_year)`)
      .eq('cod_date', codDate);
    
    if (selectionCheckError) {
      console.error('Error checking existing selections:', selectionCheckError);
      return NextResponse.json(
        { error: 'Failed to check existing selections', details: selectionCheckError.message },
        { status: 500 }
      );
    }
    
    const existingClasses = new Set();
    if (existingSelections && existingSelections.length > 0) {
      existingSelections.forEach((selection: any) => {
        if (selection.unified_students?.class_year) {
          existingClasses.add(selection.unified_students.class_year);
        }
      });
    }
    
    const hasIIIT = existingClasses.has('II-IT');
    const hasIIIIT = existingClasses.has('III-IT');
    
    if (hasIIIT && hasIIIIT) {
      console.log('COD cron: Already have one selection from each class');
      const fineResult = await createFinesForNonBookedStudents(codDate);
      
      return NextResponse.json(
        {
          message: 'Selections already complete - one student from each class already selected',
          selections: existingSelections,
          fines: fineResult ? {
            success: fineResult.success,
            message: fineResult.message,
            finesCreated: fineResult.finesCreated,
            errors: fineResult.errors,
          } : null,
          source: 'cod-cron-validation',
        },
        { status: 200 }
      );
    }
    
    const { data: bookings, error: bookingsError } = (await supabaseAdmin
      .from('unified_cod_bookings')
      .select(`*, unified_students(*)`)
      .eq('booking_date', codDate)) as { data: BookingWithStudent[] | null; error: any };
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError.message },
        { status: 500 }
      );
    }
    
    if (!bookings || bookings.length === 0) {
      console.log('No bookings found for date:', codDate);
      return NextResponse.json(
        { message: 'No bookings found for selection', date: codDate },
        { status: 200 }
      );
    }
    
    console.log(`Found ${bookings.length} bookings for selection`);
    
    const { data: previousSelections } = await supabaseAdmin
      .from('unified_cod_selections')
      .select('student_id, cod_date');
    
    const previouslySelectedStudentIds = new Set(
      (previousSelections as any[])?.map((selection) => selection.student_id) || []
    );
    
    console.log(`Found ${previouslySelectedStudentIds.size} students who have already presented`);
    
    const eligibleBookings = bookings.filter(
      (booking) => !previouslySelectedStudentIds.has(booking.student_id)
    );
    
    if (eligibleBookings.length === 0) {
      return NextResponse.json(
        {
          message: 'No eligible students available (all have already presented)',
          date: codDate,
          total_bookings: bookings.length,
          already_presented_count: previouslySelectedStudentIds.size,
        },
        { status: 200 }
      );
    }
    
    const iiItBookings = eligibleBookings.filter(
      (booking) => booking.unified_students.class_year === 'II-IT'
    );
    const iiiItBookings = eligibleBookings.filter(
      (booking) => booking.unified_students.class_year === 'III-IT'
    );
    
    console.log(`COD cron - Eligible II-IT: ${iiItBookings.length}, III-IT: ${iiiItBookings.length}`);
    
    const selectedStudents: Array<{
      booking: BookingWithStudent;
      student: BookingWithStudent['unified_students'];
    }> = [];
    
    if (iiItBookings.length > 0 && !hasIIIT) {
      const randomIndex = Math.floor(Math.random() * iiItBookings.length);
      const selectedBooking = iiItBookings[randomIndex];
      selectedStudents.push({
        booking: selectedBooking,
        student: selectedBooking.unified_students,
      });
      console.log('COD cron - Selected II-IT student:', selectedBooking.unified_students.register_number);
    }
    
    if (iiiItBookings.length > 0 && !hasIIIIT) {
      const randomIndex = Math.floor(Math.random() * iiiItBookings.length);
      const selectedBooking = iiiItBookings[randomIndex];
      selectedStudents.push({
        booking: selectedBooking,
        student: selectedBooking.unified_students,
      });
      console.log('COD cron - Selected III-IT student:', selectedBooking.unified_students.register_number);
    }
    
    if (selectedStudents.length === 0) {
      return NextResponse.json(
        { message: 'No students available for selection from either class', date: codDate },
        { status: 200 }
      );
    }
    
    const selectionResults: any[] = [];
    for (const { booking: selectedBooking, student: selectedStudent } of selectedStudents) {
      const { data: classSelections } = await supabaseAdmin
        .from('unified_cod_selections')
        .select('id, class_year')
        .eq('cod_date', codDate);
      
      const classAlreadyFilled = (classSelections || []).some(
        (s: any) => s.class_year === selectedStudent.class_year
      );
      
      if (classAlreadyFilled) {
        console.log(`Skip insert: class ${selectedStudent.class_year} already has a selection`);
        continue;
      }
      
      const { data: selection, error: selectionError } = await (supabaseAdmin as any)
        .from('unified_cod_selections')
        .insert([{
          student_id: selectedBooking.student_id,
          cod_date: codDate,
          selected_at: new Date().toISOString(),
          class_year: selectedStudent.class_year,
        }])
        .select()
        .single();
      
      if (selectionError) {
        if ((selectionError as any).code === '23505') {
          console.warn(`Unique constraint prevented duplicate selection`);
          continue;
        }
        console.error('Error creating selection:', selectionError);
        return NextResponse.json(
          { error: 'Failed to create selection', details: selectionError.message },
          { status: 500 }
        );
      }
      
      selectionResults.push(selection);
    }
    
    const emailResults: Array<{ student: string; success: boolean; error?: string }> = [];
    
    for (const { student: selectedStudent } of selectedStudents) {
      console.log('Successfully selected student:', selectedStudent.register_number, 'for COD date:', codDate);
      
      if (selectedStudent.email) {
        try {
          console.log(`Sending COD selection email to ${selectedStudent.email}...`);
          const emailResult = await emailService.sendSeminarSelectionEmail(
            selectedStudent.email,
            selectedStudent.name || selectedStudent.register_number,
            selectedStudent.register_number,
            codDate,
            selectedStudent.class_year
          );
          
          emailResults.push({
            student: selectedStudent.register_number,
            success: emailResult.success,
            error: emailResult.error,
          });
          
          if (emailResult.success) {
            console.log(`✅ Email sent successfully to ${selectedStudent.register_number}`);
          } else {
            console.error(`❌ Email failed for ${selectedStudent.register_number}:`, emailResult.error);
          }
        } catch (emailError) {
          console.error(`❌ Email error for ${selectedStudent.register_number}:`, emailError);
          emailResults.push({
            student: selectedStudent.register_number,
            success: false,
            error: emailError instanceof Error ? emailError.message : 'Unknown email error',
          });
        }
      }
    }
    
    const fineResult = await createFinesForNonBookedStudents(codDate);
    
    console.log('COD cron selection completed successfully');
    
    return NextResponse.json(
      {
        success: true,
        message: `COD cron selection: ${selectedStudents.length} student(s) selected successfully`,
        selections: selectedStudents.map((item, index) => ({
          id: (selectionResults[index] as any)?.id,
          student: {
            register_number: item.student.register_number,
            name: item.student.name,
            email: item.student.email,
            class_year: item.student.class_year,
          },
          cod_date: codDate,
          selected_at: (selectionResults[index] as any)?.selected_at,
        })),
        emails: {
          sent: emailResults.filter((r) => r.success).length,
          failed: emailResults.filter((r) => !r.success).length,
          results: emailResults,
        },
        fines: fineResult ? {
          success: fineResult.success,
          message: fineResult.message,
          finesCreated: fineResult.finesCreated,
          errors: fineResult.errors,
        } : null,
        summary: {
          total_bookings: bookings.length,
          eligible_bookings: eligibleBookings.length,
          already_presented_excluded: previouslySelectedStudentIds.size,
          booking_date: codDate,
          cod_date: codDate,
          ii_it_bookings: iiItBookings.length,
          iii_it_bookings: iiiItBookings.length,
          selected_count: selectedStudents.length,
          emails_sent: emailResults.filter((r) => r.success).length,
          emails_failed: emailResults.filter((r) => !r.success).length,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('COD cron selection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
