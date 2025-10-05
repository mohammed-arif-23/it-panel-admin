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
    // Get seminar bookings data
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('unified_seminar_bookings')
      .select(`
        *,
        unified_students(name, register_number, class_year)
      `)
      .order('booking_date', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching seminar bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch seminar bookings' }, { status: 500 });
    }

    // Get seminar selections data
    const { data: selections, error: selectionsError } = await supabaseAdmin
      .from('unified_seminar_selections')
      .select(`
        *,
        unified_students(name, register_number, class_year)
      `)
      .order('seminar_date', { ascending: false });

    if (selectionsError) {
      console.error('Error fetching seminar selections:', selectionsError);
      return NextResponse.json({ error: 'Failed to fetch seminar selections' }, { status: 500 });
    }

    // Calculate statistics
    const totalBookings = bookings?.length || 0;
    const totalSelections = selections?.length || 0;
    
    // Get unique students who booked
    const uniqueBookedStudents = new Set(bookings?.map((b: any) => b.student_id)).size || 0;
    
    // Get unique students who were selected
    const uniqueSelectedStudents = new Set(selections?.map((s: any) => s.student_id)).size || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        totalSelections,
        uniqueBookedStudents,
        uniqueSelectedStudents,
        bookings: bookings || [],
        selections: selections || []
      }
    });

  } catch (error) {
    console.error('Seminar analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}