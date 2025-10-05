import { NextRequest, NextResponse } from 'next/server';
import { fineService } from '../../../../../lib/fineService';
import { supabaseAdmin } from '../../../../../lib/supabase';
import { verifyJWT } from '../../../../../lib/auth';

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

// POST - Create fines for students who didn't book for a specific date
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, date, amount = 10 } = body;

    if (action === 'create_fines_for_date') {
      if (!date) {
        return NextResponse.json(
          { error: 'Date is required' },
          { status: 400 }
        );
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }

      // Check if date is not in the future
      const today = new Date().toISOString().split('T')[0];
      if (date > today) {
        return NextResponse.json(
          { error: 'Cannot create fines for future dates' },
          { status: 400 }
        );
      }

      console.log(`Admin manually creating fines for date: ${date} with amount: ₹${amount}`);

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
          amount: amount,
          errors: result.errors
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'create_individual_fine') {
      const { studentId, fineType, referenceDate, description } = body;

      if (!studentId || !fineType || !referenceDate) {
        return NextResponse.json(
          { error: 'Missing required fields: studentId, fineType, referenceDate' },
          { status: 400 }
        );
      }

      // Verify student exists
      const { data: student, error: studentError } = await supabaseAdmin
        .from('unified_students')
        .select('id, register_number, name, class_year')
        .eq('id', studentId)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }

      // Create individual fine
      const fineResult = await fineService.createManualFine({
        student_id: studentId,
        fine_type: fineType,
        reference_date: referenceDate,
        amount: amount,
        payment_status: 'pending',
        description
      });

      if (!fineResult.success) {
        return NextResponse.json(
          { error: fineResult.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: fineResult.message,
        data: {
          fine: fineResult.fine,
          student: {
            register_number: (student as any).register_number,
            name: (student as any).name,
            class_year: (student as any).class_year
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "create_fines_for_date" or "create_individual_fine"' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Manual fine creation error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET - Get preview of students who would be fined for a specific date
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get all students
    const { data: allStudents, error: studentsError } = await supabaseAdmin
      .from('unified_students')
      .select('id, register_number, name, class_year')
      .in('class_year', ['II-IT', 'III-IT'])
      .order('register_number');

    if (studentsError) {
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Get students who booked for this date
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('unified_seminar_bookings')
      .select('student_id')
      .eq('booking_date', date);

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError.message },
        { status: 500 }
      );
    }

    // Get existing fines for this date
    const { data: existingFines, error: finesError } = await supabaseAdmin
      .from('unified_student_fines')
      .select('student_id')
      .eq('reference_date', date)
      .eq('fine_type', 'seminar_no_booking');

    if (finesError) {
      return NextResponse.json(
        { error: 'Failed to fetch existing fines', details: finesError.message },
        { status: 500 }
      );
    }

    // Find students who didn't book and don't have fines yet
    const bookedStudentIds = new Set(bookings?.map((b: any) => b.student_id) || []);
    const finedStudentIds = new Set(existingFines?.map((f: any) => f.student_id) || []);

    const studentsToFine = (allStudents || []).filter((student: any) => 
      !bookedStudentIds.has(student.id) && !finedStudentIds.has(student.id)
    );

    const studentsAlreadyFined = (allStudents || []).filter((student: any) => 
      !bookedStudentIds.has(student.id) && finedStudentIds.has(student.id)
    );

    const studentsWhoBooked = (allStudents || []).filter((student: any) => 
      bookedStudentIds.has(student.id)
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        summary: {
          totalStudents: allStudents?.length || 0,
          studentsWhoBooked: studentsWhoBooked.length,
          studentsToFine: studentsToFine.length,
          studentsAlreadyFined: studentsAlreadyFined.length
        },
        students: {
          toFine: studentsToFine,
          alreadyFined: studentsAlreadyFined,
          whoBooked: studentsWhoBooked
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fine preview error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}