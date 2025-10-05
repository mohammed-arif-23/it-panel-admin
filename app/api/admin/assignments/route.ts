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
        success: true,
        data: [],
        message: 'Supabase not configured. Please set up your Supabase environment variables.',
        timestamp: new Date().toISOString()
      });
    }

    // First check if assignments table exists
    let assignmentsExist = false;
    let assignments: any[] = [];
    
    try {
      const { data: assignmentData, error } = await supabaseAdmin
        .from('assignments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      assignmentsExist = !error;
      assignments = assignmentData || [];
      
      if (!assignmentsExist) {
        // Assignment fetch error - operation failed silently
        return NextResponse.json({
          success: true,
          data: [],
          message: 'Assignments table not found or not accessible. Please check your database setup.',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      // Error checking assignments table - operation failed silently
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Could not access assignments table.',
        timestamp: new Date().toISOString()
      });
    }

    // Process assignments to calculate proper statistics
    const processedAssignments = await Promise.all(assignments.map(async (assignment: any) => {
      // Get submission statistics for this assignment
      try {
        const { data: submissions, error: submissionError } = await supabaseAdmin
          .from('assignment_submissions')
          .select('marks')
          .eq('assignment_id', assignment.id);

        if (submissionError) {
          // Error fetching submissions for assignment - operation failed silently
        }

        const submissionCount = submissions?.length || 0;
        const gradedSubmissions = submissions?.filter((sub: any) => sub.marks !== null) || [];
        const averageMarks = gradedSubmissions.length > 0 
          ? gradedSubmissions.reduce((sum: number, sub: any) => sum + (sub.marks || 0), 0) / gradedSubmissions.length 
          : 0;

        return {
          ...assignment,
          submission_count: submissionCount,
          graded_count: gradedSubmissions.length,
          average_marks: Math.round(averageMarks * 100) / 100 // Round to 2 decimal places
        };
      } catch (submissionError) {
        // Error processing assignment submissions - operation failed silently
        return {
          ...assignment,
          submission_count: 0,
          graded_count: 0,
          average_marks: 0
        };
      }
    }));

    return NextResponse.json({
      success: true,
      data: processedAssignments,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Assignments fetch error - returning error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, description, class_year, due_date } = await request.json();

    console.log('Received assignment creation request:', { title, class_year, due_date });

    // Validate required fields
    if (!title || !class_year || !due_date) {
      return NextResponse.json({ error: 'Title, class year, and due date are required' }, { status: 400 });
    }

    // Validate class_year
    if (!['II-IT', 'III-IT'].includes(class_year)) {
      return NextResponse.json({ error: 'Invalid class year. Must be "II-IT" or "III-IT"' }, { status: 400 });
    }

    // Helper to format a naive datetime (e.g., from <input type="datetime-local">) to IST with explicit offset
    const toISTWithOffset = (dt: string) => {
      // If already has timezone offset or Z, convert to IST
      if (/Z$/.test(dt)) {
        // UTC format - convert to IST
        const utcDate = new Date(dt);
        // Add 5.5 hours for IST
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())}T${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}+05:30`;
      }
      if (/[+-]\d{2}:?\d{2}$/.test(dt)) {
        // Already has timezone - return as is
        return dt;
      }
      // Naive datetime from datetime-local input - treat as IST
      const withSeconds = dt.match(/:\d{2}$/) ? dt : `${dt}:00`;
      // Append IST offset to indicate this time is in IST
      return `${withSeconds}+05:30`;
    };

    // Current timestamp in IST with explicit +05:30 offset
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    const istTimestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}T${pad(istNow.getUTCHours())}:${pad(istNow.getUTCMinutes())}:${pad(istNow.getUTCSeconds())}+05:30`;

    // Normalize due date to IST (if admin provided naive local time, we treat it as IST)
    const normalizedDue = toISTWithOffset(due_date);
    console.log('Normalized due date (IST):', normalizedDue);

    // Insert new assignment using service role (bypasses RLS)
    const { data, error } = await (supabaseAdmin as any)
      .from('assignments')
      .insert({
        title,
        description: description || '',
        class_year,
        due_date: normalizedDue,
        created_at: istTimestamp,
        updated_at: istTimestamp
      })
      .select()
      .single();

    if (error) {
      // Database error during assignment creation
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    // Server error during assignment creation
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, due_date, title, description, class_year } = await request.json();

    console.log('Received assignment update request:', { id, due_date });

    if (!id) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Helper to format datetime to IST
    const toISTWithOffset = (dt: string) => {
      if (/Z$/.test(dt)) {
        const utcDate = new Date(dt);
        const istDate = new Date(utcDate.getTime() + (5.5 * 60 * 60 * 1000));
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${istDate.getUTCFullYear()}-${pad(istDate.getUTCMonth() + 1)}-${pad(istDate.getUTCDate())}T${pad(istDate.getUTCHours())}:${pad(istDate.getUTCMinutes())}:${pad(istDate.getUTCSeconds())}+05:30`;
      }
      if (/[+-]\d{2}:?\d{2}$/.test(dt)) {
        return dt;
      }
      const withSeconds = dt.match(/:\d{2}$/) ? dt : `${dt}:00`;
      return `${withSeconds}+05:30`;
    };

    // Current timestamp in IST
    const now = new Date();
    const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    const istTimestamp = `${istNow.getUTCFullYear()}-${pad(istNow.getUTCMonth() + 1)}-${pad(istNow.getUTCDate())}T${pad(istNow.getUTCHours())}:${pad(istNow.getUTCMinutes())}:${pad(istNow.getUTCSeconds())}+05:30`;

    // Build update object
    const updateData: {
      updated_at: string;
      due_date?: string;
      title?: string;
      description?: string;
      class_year?: string;
    } = {
      updated_at: istTimestamp
    };

    if (due_date) {
      const normalizedDue = toISTWithOffset(due_date);
      console.log('Normalized due date (IST):', normalizedDue);
      updateData.due_date = normalizedDue;
    }
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (class_year) updateData.class_year = class_year;

    // Update assignment
    const { data, error } = await (supabaseAdmin as any)
      .from('assignments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 });
    }

    // Delete assignment (will cascade delete submissions due to foreign key)
    const { error } = await supabaseAdmin
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      // Database error during assignment deletion
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    // Server error during assignment deletion
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}