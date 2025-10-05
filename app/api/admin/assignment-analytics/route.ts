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

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co') {
      return NextResponse.json({
        success: false,
        error: 'Supabase not configured. Please set up your Supabase environment variables.',
      }, { status: 500 });
    }
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignment');
    const classFilter = searchParams.get('class') || 'all';

    if (!assignmentId) {
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    // Get assignment details
    const { data: assignment, error: assignmentError } = await (supabaseAdmin as any)
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Build students query
    let studentsQuery = (supabaseAdmin as any)
      .from('unified_students')
      .select('id, register_number, name, email, class_year');

    // Apply class filter if specified
    if (classFilter !== 'all') {
      studentsQuery = studentsQuery.eq('class_year', classFilter);
    } else if (assignment.class_year && assignment.class_year !== 'all') {
      // If assignment has specific class, filter by that
      studentsQuery = studentsQuery.eq('class_year', assignment.class_year);
    }

    const { data: allStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      // Error fetching students - operation failed silently
      return NextResponse.json(
        { success: false, error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    // Get submissions for this assignment
    const { data: submissions, error: submissionsError } = await (supabaseAdmin as any)
      .from('assignments_submissions')
      .select(`
        *,
        unified_students!inner(
          id,
          register_number,
          name,
          email,
          class_year
        )
      `)
      .eq('assignment_id', assignmentId);

    if (submissionsError) {
      // Error fetching submissions - operation failed silently
      return NextResponse.json(
        { success: false, error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Process submissions
    const submittedStudents = (submissions || []).map((submission: any) => ({
      id: submission.unified_students.id,
      register_number: submission.unified_students.register_number,
      name: submission.unified_students.name,
      email: submission.unified_students.email,
      class_year: submission.unified_students.class_year,
      submission_id: submission.id,
      submitted_at: submission.created_at,
      marks: submission.marks,
      status: submission.status || 'submitted',
      file_url: submission.file_url
    }));

    // Find students who haven't submitted
    const submittedStudentIds = submittedStudents.map((s: any) => s.id);
    const notSubmittedStudents = (allStudents || []).filter(
      (student: any) => !submittedStudentIds.includes(student.id)
    );

    // Calculate statistics by class
    const submissionsByClass = {
      'II-IT': {
        submitted: submittedStudents.filter((s: any) => s.class_year === 'II-IT').length,
        total: (allStudents || []).filter((s: any) => s.class_year === 'II-IT').length,
        notSubmitted: notSubmittedStudents.filter((s: any) => s.class_year === 'II-IT').length
      },
      'III-IT': {
        submitted: submittedStudents.filter((s: any) => s.class_year === 'III-IT').length,
        total: (allStudents || []).filter((s: any) => s.class_year === 'III-IT').length,
        notSubmitted: notSubmittedStudents.filter((s: any) => s.class_year === 'III-IT').length
      }
    };

    const analytics = {
      totalStudents: (allStudents || []).length,
      totalSubmitted: submittedStudents.length,
      totalNotSubmitted: notSubmittedStudents.length,
      submittedStudents,
      notSubmittedStudents,
      submissionsByClass,
      assignment
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Assignment analytics error - returning error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}