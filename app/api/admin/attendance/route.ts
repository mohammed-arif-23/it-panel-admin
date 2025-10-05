import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
import { verifyJWT } from '../../../../lib/auth';

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

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const classYear = searchParams.get('class') || 'all';
    const status = searchParams.get('status') || 'all';

    console.log('Fetching attendance for:', { date, classYear, status });

    // Get all students for the date
    let studentsQuery = supabaseAdmin
      .from('unified_students')
      .select(`
        id,
        register_number,
        name,
        email,
        class_year,
        unified_seminar_attendance!left(
          id,
          seminar_date,
          attendance_status,
          attendance_time,
          notes,
          seminar_topic
        )
      `)
      .order('register_number');

    // Filter by class if specified
    if (classYear !== 'all') {
      studentsQuery = studentsQuery.eq('class_year', classYear);
    }

    const { data: students, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Get seminar selections for the date
    const { data: selectedStudents, error: selectionsError } = await supabaseAdmin
      .from('unified_seminar_selections')
      .select(`
        student_id,
        seminar_date,
        unified_students!inner(
          id,
          register_number,
          name,
          class_year
        )
      `)
      .eq('seminar_date', date);

    if (selectionsError) {
      console.error('Error fetching selections:', selectionsError);
    }

    // Process students with attendance data
    const processedStudents = (students || []).map((student: any) => {
      // Find attendance record for this date
      const attendanceRecord = student.unified_seminar_attendance?.find(
        (att: any) => att.seminar_date === date
      );

      // Check if student was selected for seminar
      const isSelected = selectedStudents?.some(
        (sel: any) => sel.student_id === student.id
      ) || false;

      return {
        ...student,
        attendance_status: attendanceRecord?.attendance_status || (isSelected ? 'pending' : 'not_applicable'),
        attendance_time: attendanceRecord?.attendance_time,
        attendance_notes: attendanceRecord?.notes,
        seminar_topic: attendanceRecord?.seminar_topic,
        is_selected: isSelected,
        attendance_id: attendanceRecord?.id,
        unified_seminar_attendance: undefined // Clean up
      };
    });

    // Apply status filter
    let filteredStudents = processedStudents;
    if (status !== 'all') {
      filteredStudents = processedStudents.filter(student => 
        student.attendance_status === status
      );
    }

    // Calculate summary statistics
    const summary = {
      total: processedStudents.length,
      selected: processedStudents.filter(s => s.is_selected).length,
      present: processedStudents.filter(s => s.attendance_status === 'present').length,
      absent: processedStudents.filter(s => s.attendance_status === 'absent').length,
      excused: processedStudents.filter(s => s.attendance_status === 'excused').length,
      pending: processedStudents.filter(s => s.attendance_status === 'pending').length,
      byClass: {
        'II-IT': {
          total: processedStudents.filter(s => s.class_year === 'II-IT').length,
          selected: processedStudents.filter(s => s.class_year === 'II-IT' && s.is_selected).length,
          present: processedStudents.filter(s => s.class_year === 'II-IT' && s.attendance_status === 'present').length,
          absent: processedStudents.filter(s => s.class_year === 'II-IT' && s.attendance_status === 'absent').length
        },
        'III-IT': {
          total: processedStudents.filter(s => s.class_year === 'III-IT').length,
          selected: processedStudents.filter(s => s.class_year === 'III-IT' && s.is_selected).length,
          present: processedStudents.filter(s => s.class_year === 'III-IT' && s.attendance_status === 'present').length,
          absent: processedStudents.filter(s => s.class_year === 'III-IT' && s.attendance_status === 'absent').length
        }
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        students: filteredStudents,
        summary,
        filters: { date, classYear, status }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Attendance fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST - Mark attendance for students
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      attendanceRecords,
      seminarDate,
      seminarTopic,
      markedBy = 'admin'
    } = body;

    if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
      return NextResponse.json(
        { error: 'Invalid attendance records format' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const record of attendanceRecords) {
      const { studentId, status, notes } = record;

      try {
        // Check if attendance record already exists
        const { data: existingRecord } = await (supabaseAdmin as any)
          .from('unified_seminar_attendance')
          .select('id')
          .eq('student_id', studentId)
          .eq('seminar_date', seminarDate)
          .single();

        if (existingRecord) {
          // Update existing record
          const { data, error } = await (supabaseAdmin as any)
            .from('unified_seminar_attendance')
            .update({
              attendance_status: status,
              notes: notes || null,
              seminar_topic: seminarTopic || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id)
            .select()
            .single();

          if (error) throw error;
          results.push({ studentId, action: 'updated', data });
        } else {
          // Create new record
          const { data, error } = await (supabaseAdmin as any)
            .from('unified_seminar_attendance')
            .insert({
              student_id: studentId,
              seminar_date: seminarDate,
              attendance_status: status,
              notes: notes || null,
              seminar_topic: seminarTopic || null,
              marked_by: markedBy
            })
            .select()
            .single();

          if (error) throw error;
          results.push({ studentId, action: 'created', data });
        }
      } catch (error) {
        console.error(`Error processing attendance for student ${studentId}:`, error);
        errors.push({ 
          studentId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        errorsCount: errors.length,
        results,
        errors
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Attendance marking error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// PUT - Bulk update attendance
export async function PUT(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      studentIds,
      status,
      seminarDate,
      notes,
      seminarTopic
    } = body;

    if (!studentIds || !Array.isArray(studentIds) || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: studentIds and status' },
        { status: 400 }
      );
    }

    const validStatuses = ['present', 'absent', 'excused'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: present, absent, or excused' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        // Check if record exists
        const { data: existingRecord } = await (supabaseAdmin as any)
          .from('unified_seminar_attendance')
          .select('id')
          .eq('student_id', studentId)
          .eq('seminar_date', seminarDate)
          .single();

        if (existingRecord) {
          // Update existing record
          const { data, error } = await (supabaseAdmin as any)
            .from('unified_seminar_attendance')
            .update({
              attendance_status: status,
              notes: notes || null,
              seminar_topic: seminarTopic || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingRecord.id)
            .select()
            .single();

          if (error) throw error;
          results.push({ studentId, action: 'updated', data });
        } else {
          // Create new record
          const { data, error } = await (supabaseAdmin as any)
            .from('unified_seminar_attendance')
            .insert({
              student_id: studentId,
              seminar_date: seminarDate,
              attendance_status: status,
              notes: notes || null,
              seminar_topic: seminarTopic || null,
              marked_by: 'admin'
            })
            .select()
            .single();

          if (error) throw error;
          results.push({ studentId, action: 'created', data });
        }
      } catch (error) {
        console.error(`Error updating attendance for student ${studentId}:`, error);
        errors.push({ 
          studentId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: results.length,
        errorsCount: errors.length,
        results,
        errors
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Bulk attendance update error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}