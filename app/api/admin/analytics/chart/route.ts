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
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get student registration data
    const { data: students, error: studentsError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 });
    }

    // Get assignment data
    const { data: assignments, error: assignmentsError } = await (supabaseAdmin as any)
      .from('assignments')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assignment data' }, { status: 500 });
    }

    // Get submission data
    const { data: submissions, error: submissionsError } = await (supabaseAdmin as any)
      .from('assignments_submissions')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at');

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
      return NextResponse.json({ error: 'Failed to fetch submission data' }, { status: 500 });
    }

    // Generate chart data
    const chartData = [];
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split('T')[0];

      const studentsCount = students?.filter((s: any) => 
        s.created_at.split('T')[0] === dateString
      ).length || 0;

      const assignmentsCount = assignments?.filter((a: any) => 
        a.created_at.split('T')[0] === dateString
      ).length || 0;

      const submissionsCount = submissions?.filter((s: any) => 
        s.created_at.split('T')[0] === dateString
      ).length || 0;

      chartData.push({
        date: dateString,
        students: studentsCount,
        assignments: assignmentsCount,
        submissions: submissionsCount
      });
    }

    return NextResponse.json({
      success: true,
      data: chartData
    });

  } catch (error) {
    console.error('Chart data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}