import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { jwtVerify } from 'jose';

// Check admin authentication using JWT
async function checkAdminAuth(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) return false;
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const secretKey = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token, secretKey);
    return true;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get assignments data
    const { data: assignments, error } = await (supabaseAdmin as any)
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    // Calculate statistics
    const totalAssignments = assignments?.length || 0;
    const activeAssignments = assignments?.filter((a: any) => new Date(a.due_date) > new Date()).length || 0;
    
    // Get submission data
    const { data: submissions, error: submissionError } = await (supabaseAdmin as any)
      .from('assignments_submissions')
      .select('*');

    if (submissionError) {
      console.error('Error fetching submissions:', submissionError);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    const totalSubmissions = submissions?.length || 0;
    const gradedSubmissions = submissions?.filter((s: any) => s.status === 'graded').length || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalAssignments,
        activeAssignments,
        totalSubmissions,
        gradedSubmissions,
        assignments: assignments || []
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}