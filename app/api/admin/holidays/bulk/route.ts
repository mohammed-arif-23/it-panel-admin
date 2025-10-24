import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWT } from '@/lib/auth';

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

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

// POST - Create bulk holidays for a date range
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      holidayName,
      startDate,
      endDate,
      holidayType,
      description,
      isAnnounced = true,
      announcedDate,
      createdBy,
      affectsSeminars = true,
      affectsAssignments = false,
      affectsExams = false,
      rescheduleRules
    } = body;

    // Validate required fields
    if (!holidayName || !startDate || !endDate || !holidayType || !createdBy) {
      return NextResponse.json(
        { error: 'Holiday name, start date, end date, type, and creator are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before or equal to end date' },
        { status: 400 }
      );
    }

    // Generate array of dates between start and end (inclusive)
    const dates: string[] = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check for existing holidays on these dates
    const { data: existingHolidays } = await supabase
      .from('unified_holidays')
      .select('holiday_date, holiday_name')
      .in('holiday_date', dates);

    if (existingHolidays && existingHolidays.length > 0) {
      const conflictDates = existingHolidays.map((h: any) => 
        `${h.holiday_date} (${h.holiday_name})`
      ).join(', ');
      
      return NextResponse.json(
        { 
          error: 'Some dates already have holidays',
          details: `Conflicts on: ${conflictDates}`
        },
        { status: 409 }
      );
    }

    // Create holiday records for each date
    const holidayRecords = dates.map(date => ({
      holiday_name: holidayName,
      holiday_date: date,
      holiday_type: holidayType,
      description: description || null,
      is_announced: isAnnounced,
      announced_date: announcedDate || (isAnnounced ? new Date().toISOString().split('T')[0] : null),
      created_by: createdBy,
      affects_seminars: affectsSeminars,
      affects_assignments: affectsAssignments,
      affects_exams: affectsExams,
      reschedule_rules: rescheduleRules || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: newHolidays, error: insertError } = await supabase
      .from('unified_holidays')
      .insert(holidayRecords)
      .select('*');

    if (insertError) {
      console.error('Error creating bulk holidays:', insertError);
      return NextResponse.json(
        { error: 'Failed to create holidays' },
        { status: 500 }
      );
    }

    // If it's an unannounced holiday or emergency, trigger processing for each
    if (!isAnnounced || holidayType === 'emergency') {
      for (const holiday of (newHolidays || [])) {
        triggerHolidayProcessing((holiday as any).id).catch(error => {
          console.error('Background holiday processing failed:', error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${dates.length} holidays`,
      count: dates.length,
      holidays: newHolidays
    });

  } catch (error) {
    console.error('Create bulk holidays error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to trigger holiday processing
async function triggerHolidayProcessing(holidayId: string) {
  try {
    // Create basic impact assessment record
    await supabase
      .from('unified_holiday_impact_assessments')
      .insert({
        holiday_id: holidayId,
        impact_type: 'seminar',
        affected_count: 0,
        impact_severity: 'low'
      });
    
    // Get holiday details for notification
    const { data: holiday } = await supabase
      .from('unified_holidays')
      .select('*')
      .eq('id', holidayId)
      .single();
    
    if (holiday) {
      // Create holiday notification record
      await supabase
        .from('unified_holiday_notifications')
        .insert({
          holiday_id: holidayId,
          notification_type: 'holiday_announcement',
          target_audience: 'all_students',
          notification_title: `Holiday: ${(holiday as any).holiday_name}`,
          notification_body: `A holiday has been announced for ${(holiday as any).holiday_date}`,
          created_by: (holiday as any).created_by
        });
    }
    
  } catch (error) {
    console.error('Error processing holiday:', error);
  }
}
