import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

interface Student {
  id: string;
  register_number: string;
  name: string;
  email: string;
  class_year: string;
}

interface Booking {
  id: string;
  student_id: string;
  booking_date: string;
  seminar_topic: string;
  created_at: string;
  unified_students: Student;
}

interface BookingAnalytics {
  totalStudents: number;
  totalBooked: number;
  totalNotBooked: number;
  totalSelected: number;
  bookedStudents: any[];
  notBookedStudents: Student[];
  selectedSeminarStudents: Student[];
  bookingsByClass: {
    'II-IT': { booked: number; total: number; notBooked: number };
    'III-IT': { booked: number; total: number; notBooked: number };
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const selectedClass = searchParams.get('class') || 'all'; // 'all', 'II-IT', 'III-IT'

    console.log('Fetching booking analytics for:', { selectedDate, selectedClass });

    // Get students based on class filter - for 'all', only get II-IT and III-IT (matching fine logic)
    let studentsQuery = supabase
      .from('unified_students')
      .select('id, register_number, name, email, class_year')
      .order('register_number');

    // Apply class filter - for 'all', only include IT students (matching create-for-date logic)
    if (selectedClass === 'all') {
      studentsQuery = studentsQuery.in('class_year', ['II-IT', 'III-IT']);
    } else {
      studentsQuery = studentsQuery.eq('class_year', selectedClass);
    }

    const { data: allStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      console.error('Error fetching students:', studentsError);
      return NextResponse.json(
        { error: 'Failed to fetch students', details: studentsError.message },
        { status: 500 }
      );
    }

    // Get bookings for the selected date
    const { data: bookings, error: bookingsError } = await supabase
      .from('unified_seminar_bookings')
      .select(`
        id,
        student_id,
        booking_date,
        seminar_topic,
        created_at,
        unified_students(
          id,
          register_number,
          name,
          email,
          class_year
        )
      `)
      .eq('booking_date', selectedDate);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings', details: bookingsError.message },
        { status: 500 }
      );
    }

    // Type the arrays properly
    const studentsData = (allStudents || []) as Student[];
    const bookingsData = (bookings || []) as Booking[];

    // All students are already filtered by the query above
    const filteredStudents = studentsData;

    // Create a set of student IDs who have booked
    const bookedStudentIds = new Set(bookingsData.map(booking => booking.student_id));

    // Get students who have been selected for any seminar (past or future)
    // If they're in selections, they shouldn't get fines
    const { data: selectedStudents, error: selectedError } = await supabase
      .from('unified_seminar_selections')
      .select('student_id, seminar_date');

    if (selectedError) {
      console.error('Error fetching selected students:', selectedError);
    }

    // Create sets for filtering
    const selectedStudentIds = new Set(
      (selectedStudents || []).map((record: any) => record.student_id)
    );

    // Separate students into categories
    const bookedStudents = filteredStudents.filter(student => bookedStudentIds.has(student.id));
    const selectedSeminarStudents = filteredStudents.filter(student => selectedStudentIds.has(student.id));

    // Not Booked should exclude students who have already selected a seminar
    // i.e., no booking on the selected date AND not selected for any seminar
    let notBookedStudents = filteredStudents.filter(student => {
      const didNotBook = !bookedStudentIds.has(student.id);
      const notSelected = !selectedStudentIds.has(student.id);
      return didNotBook && notSelected;
    });

    // Apply explicit skip list (same behavior as FineService):
    // Do not show these register numbers in Not Booked list
    const SKIPPED_REGS = new Set(['620123205015', '620123205027']);
    const skipCountByClass: Record<string, number> = {};
    notBookedStudents = notBookedStudents.filter((s) => {
      if (SKIPPED_REGS.has(s.register_number)) {
        const cls = s.class_year || 'UNKNOWN';
        skipCountByClass[cls] = (skipCountByClass[cls] || 0) + 1;
        return false;
      }
      return true;
    });

    // Calculate class-wise statistics
    const allStudentsByClass = studentsData.reduce((acc, student) => {
      if (!acc[student.class_year]) {
        acc[student.class_year] = [];
      }
      acc[student.class_year].push(student);
      return acc;
    }, {} as Record<string, Student[]>);

    const bookingsByClass = {
      'II-IT': {
        total: allStudentsByClass['II-IT']?.length || 0,
        booked: bookingsData.filter(b => b.unified_students?.class_year === 'II-IT').length,
        notBooked: 0
      },
      'III-IT': {
        total: allStudentsByClass['III-IT']?.length || 0,
        booked: bookingsData.filter(b => b.unified_students?.class_year === 'III-IT').length,
        notBooked: 0
      }
    };

    // Calculate not booked counts
    bookingsByClass['II-IT'].notBooked = bookingsByClass['II-IT'].total - bookingsByClass['II-IT'].booked;
    bookingsByClass['III-IT'].notBooked = bookingsByClass['III-IT'].total - bookingsByClass['III-IT'].booked;
    // Adjust not booked counts to account for skipped registers
    if (skipCountByClass['II-IT']) {
      bookingsByClass['II-IT'].notBooked = Math.max(0, bookingsByClass['II-IT'].notBooked - skipCountByClass['II-IT']);
    }
    if (skipCountByClass['III-IT']) {
      bookingsByClass['III-IT'].notBooked = Math.max(0, bookingsByClass['III-IT'].notBooked - skipCountByClass['III-IT']);
    }

    // Add booking details to booked students
    const bookedStudentsWithDetails = bookedStudents.map(student => {
      const booking = bookingsData.find(b => b.student_id === student.id);
      return {
        ...student,
        booking_date: booking?.booking_date,
        seminar_topic: booking?.seminar_topic,
        booking_time: booking?.created_at
      };
    });

    const analytics: BookingAnalytics = {
      totalStudents: filteredStudents.length,
      totalBooked: bookedStudents.length,
      totalNotBooked: notBookedStudents.length,
      totalSelected: selectedSeminarStudents.length,
      bookedStudents: bookedStudentsWithDetails,
      notBookedStudents,
      selectedSeminarStudents,
      bookingsByClass
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      filters: {
        date: selectedDate,
        class: selectedClass
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Booking analytics error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Support POST method for more complex queries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, class: selectedClass, includeBookingDetails } = body;

    // Create URL search params for the GET method
    const searchParams = new URLSearchParams();
    if (date) searchParams.set('date', date);
    if (selectedClass) searchParams.set('class', selectedClass);

    // Create a new request with the search params
    const url = new URL(request.url);
    url.search = searchParams.toString();
    
    const newRequest = new NextRequest(url.toString(), {
      method: 'GET',
      headers: request.headers
    });

    return GET(newRequest);

  } catch (error) {
    console.error('POST booking analytics error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}