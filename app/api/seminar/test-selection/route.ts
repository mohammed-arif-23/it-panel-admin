import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test the new same-day selection logic
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // If tomorrow is Sunday, skip to Monday
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    const seminarDate = tomorrow.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    console.log('Testing selection logic for:');
    console.log('Today (booking date):', today);
    console.log('Seminar date:', seminarDate);

    // Get bookings for the seminar date
    const { data: bookings } = await supabase
      .from('unified_seminar_bookings')
      .select(`
        *,
        unified_students(register_number, name, class_year)
      `)
      .eq('booking_date', seminarDate);

    // Get existing selections for the same seminar date
    const { data: existingSelections } = await supabase
      .from('unified_seminar_selections')
      .select('student_id')
      .eq('seminar_date', seminarDate);

    const excludedStudentIds = new Set(
      (existingSelections as any[])?.map(s => s.student_id) || []
    );

    // Filter eligible bookings
    const eligibleBookings = (bookings as any[])?.filter(booking => 
      !excludedStudentIds.has(booking.student_id)
    ) || [];

    // Separate by class
    const iiItBookings = eligibleBookings.filter(booking => 
      booking.unified_students?.class_year === 'II-IT'
    );
    const iiiItBookings = eligibleBookings.filter(booking => 
      booking.unified_students?.class_year === 'III-IT'
    );

    return NextResponse.json({
      test_results: {
        today_date: today,
        seminar_date: seminarDate,
        is_sunday_skipped: tomorrow.getDay() !== 0,
        total_bookings: bookings?.length || 0,
        existing_selections: existingSelections?.length || 0,
        excluded_students: excludedStudentIds.size,
        eligible_bookings: eligibleBookings.length,
        ii_it_eligible: iiItBookings.length,
        iii_it_eligible: iiiItBookings.length,
        selection_basis: 'same-day bookings only',
        can_select: eligibleBookings.length > 0
      },
      bookings_sample: eligibleBookings.slice(0, 3).map(b => ({
        student: b.unified_students?.register_number,
        class: b.unified_students?.class_year,
        booking_date: b.booking_date
      }))
    });

  } catch (error) {
    console.error('Test selection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}