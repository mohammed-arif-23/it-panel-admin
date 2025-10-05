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
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignment_id');
    const classYear = searchParams.get('class') || 'all';
    const status = searchParams.get('status') || 'all'; // all, submitted, not_submitted

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Check if Supabase is properly configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co') {
      return NextResponse.json({
        success: true,
        data: {
          submittedStudents: [],
          notSubmittedStudents: [],
          assignment: null,
          summary: { total: 0, submitted: 0, notSubmitted: 0 }
        },
        message: 'Supabase not configured.',
        timestamp: new Date().toISOString()
      });
    }

    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Get all students for the assignment's class year (or filter by class if specified)
    let studentsQuery = supabaseAdmin
      .from('unified_students')
      .select('id, register_number, name, email, class_year');

    // Apply class filter
    if (classYear !== 'all') {
      studentsQuery = studentsQuery.eq('class_year', classYear);
    } else {
      studentsQuery = studentsQuery.eq('class_year', (assignment as any).class_year);
    }

    const { data: allStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      // Error fetching students - operation failed silently
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // Get all submissions for this assignment
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('assignment_submissions')
      .select(`
        id,
        student_id,
        submitted_at,
        marks,
        graded_at,
        file_url
      `)
      .eq('assignment_id', assignmentId);

    if (submissionsError) {
      // Error fetching submissions - operation failed silently
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    // Create a map of submitted student IDs for quick lookup
    const submittedStudentIds = new Set((submissions as any[])?.map((sub: any) => sub.student_id) || []);

    // Get student details for submitted students
    let submittedStudents: any[] = [];
    if (submittedStudentIds.size > 0) {
      const { data: submittedStudentDetails, error: submittedStudentsError } = await supabaseAdmin
        .from('unified_students')
        .select('id, register_number, name, email, class_year')
        .in('id', Array.from(submittedStudentIds));

      if (submittedStudentsError) {
        // Error fetching submitted student details - handling silently
      } else {
        // Process submitted students with their submission details
        submittedStudents = (submittedStudentDetails || []).map((student: any) => {
          const submission = (submissions as any[])?.find((sub: any) => sub.student_id === student.id);
          return {
            ...student,
            submissionDetails: {
              id: submission?.id,
              submitted_at: submission?.submitted_at,
              marks: submission?.marks,
              graded_at: submission?.graded_at,
              file_url: submission?.file_url,
              status: submission?.marks !== null ? 'graded' : 'submitted'
            }
          };
        });
      }
    }

    // Process not submitted students
    const notSubmittedStudents = (allStudents as any[] || [])
      .filter((student: any) => !submittedStudentIds.has(student.id))
      .map((student: any) => ({
        ...student,
        submissionDetails: {
          status: 'not_submitted'
        }
      }));

    // Apply status filter
    let filteredSubmitted = submittedStudents;
    let filteredNotSubmitted = notSubmittedStudents;

    if (status === 'submitted') {
      filteredNotSubmitted = [];
    } else if (status === 'not_submitted') {
      filteredSubmitted = [];
    }

    // Calculate summary
    const summary = {
      total: (allStudents as any[] || []).length,
      submitted: submittedStudents.length,
      notSubmitted: notSubmittedStudents.length,
      graded: submittedStudents.filter((s: any) => s.submissionDetails?.status === 'graded').length,
      averageMarks: submittedStudents.length > 0 
        ? submittedStudents
            .filter((s: any) => s.submissionDetails?.marks !== null && s.submissionDetails?.marks !== undefined)
            .reduce((sum: number, s: any) => sum + (s.submissionDetails?.marks || 0), 0) / submittedStudents.filter((s: any) => s.submissionDetails?.marks !== null && s.submissionDetails?.marks !== undefined).length
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        assignment,
        submittedStudents: filteredSubmitted,
        notSubmittedStudents: filteredNotSubmitted,
        summary,
        filters: { classYear, status }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Assignment submissions fetch error - returning error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}