import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const registerNumber = searchParams.get('registerNumber');

    if (!studentId && !registerNumber) {
      return NextResponse.json(
        { error: 'Student ID or register number is required' },
        { status: 400 }
      );
    }

    // Get student data
    let studentQuery = (supabase as any)
      .from('unified_students')
      .select('*')
      .single();

    if (studentId) {
      studentQuery = studentQuery.eq('id', studentId);
    } else {
      studentQuery = studentQuery.eq('register_number', registerNumber);
    }

    const { data: student, error: studentError } = await studentQuery;

    if (studentError || !student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get basic student info and core dashboard data (excluding fines for faster loading)
    // Fines will be loaded separately via /api/dashboard/fines
    
    // Get recent assignments
    const { data: assignments, error: assignmentsError } = await (supabase as any)
      .from('assignments')
      .select(`
        *,
        assignment_submissions!left(
          id,
          submitted_at,
          status,
          marks
        )
      `)
      .eq('class_year', (student as any).class_year)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent seminar bookings
    const { data: recentBookings, error: bookingsError } = await (supabase as any)
      .from('unified_seminar_bookings')
      .select('*')
      .eq('student_id', (student as any).id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get seminar selections
    const { data: selections, error: selectionsError } = await (supabase as any)
      .from('unified_seminar_selections')
      .select('*')
      .eq('student_id', (student as any).id)
      .order('selected_at', { ascending: false })
      .limit(5);

    // Get NPTEL progress (if applicable)
    const { data: nptelProgress, error: nptelError } = await (supabase as any)
      .from('ii_it_students')
      .select('*')
      .eq('register_number', (student as any).register_number)
      .single();

    if (nptelError && (student as any).class_year === 'II-IT') {
      // Try III-IT table
      const { data: nptelProgress3, error: nptelError3 } = await (supabase as any)
        .from('iii_it_students')
        .select('*')
        .eq('register_number', (student as any).register_number)
        .single();
    }

    // Get upcoming deadlines
    const today = new Date().toISOString();
    const { data: upcomingAssignments, error: upcomingError } = await (supabase as any)
      .from('assignments')
      .select('*')
      .eq('class_year', (student as any).class_year)
      .gte('due_date', today)
      .order('due_date', { ascending: true })
      .limit(3);

    // Calculate statistics (excluding fines for faster loading)
    const stats = {
      totalAssignments: assignments?.length || 0,
      submittedAssignments: assignments?.filter((a: any) => (a as any).assignment_submissions?.length > 0).length || 0,
      totalBookings: recentBookings?.length || 0,
      totalSelections: selections?.length || 0,
      upcomingDeadlines: upcomingAssignments?.length || 0
    };

    // Recent activity
    const recentActivity: any[] = [];
    
    // Add recent bookings to activity
    (recentBookings || []).forEach((booking: any) => {
      recentActivity.push({
        type: 'booking',
        title: 'Seminar Booked',
        description: `Booked seminar for ${(booking as any).booking_date}`,
        date: (booking as any).created_at,
        icon: 'calendar'
      });
    });

    // Add recent selections to activity
    (selections || []).forEach((selection: any) => {
      recentActivity.push({
        type: 'selection',
        title: 'Seminar Selected',
        description: `Selected for seminar on ${(selection as any).seminar_date}`,
        date: (selection as any).selected_at,
        icon: 'award'
      });
    });

    // Add recent submissions to activity
    (assignments || []).forEach((assignment: any) => {
      if ((assignment as any).assignment_submissions?.length > 0) {
        recentActivity.push({
          type: 'submission',
          title: 'Assignment Submitted',
          description: `Submitted "${(assignment as any).title}"`,
          date: (assignment as any).assignment_submissions[0].submitted_at,
          icon: 'file-text'
        });
      }
    });

    // Sort activity by date
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        student,
        stats,
        recentAssignments: assignments || [],
        recentBookings: recentBookings || [],
        selections: selections || [],
        upcomingAssignments: upcomingAssignments || [],
        recentActivity: recentActivity.slice(0, 10),
        nptelProgress: nptelProgress || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}