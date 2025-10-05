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

// GET - Fetch all holidays
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const upcoming = searchParams.get('upcoming');

    let query = supabase
      .from('unified_holidays')
      .select('*')
      .order('holiday_date', { ascending: true });

    // Filter by month and year
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query = query.gte('holiday_date', startDate).lte('holiday_date', endDate);
    }

    // Filter by type
    if (type && type !== 'all') {
      query = query.eq('holiday_type', type);
    }

    // Filter upcoming holidays
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('holiday_date', today);
    }

    const { data: holidays, error: holidaysError } = await query;

    if (holidaysError) {
      console.error('Error fetching holidays:', holidaysError);
      return NextResponse.json(
        { error: 'Failed to fetch holidays' },
        { status: 500 }
      );
    }

    // Get impact assessments separately if holidays exist
    let impactAssessments: any[] = [];
    let rescheduleHistory: any[] = [];

    if (holidays && holidays.length > 0) {
      const holidayIds = holidays.map((h: any) => h.id);
      
      // Fetch impact assessments
      const { data: impacts } = await supabase
        .from('unified_holiday_impact_assessments')
        .select('*')
        .in('holiday_id', holidayIds);
      
      impactAssessments = impacts || [];
      
      // Fetch reschedule history
      const { data: reschedules } = await supabase
        .from('unified_seminar_reschedule_history')
        .select('*')
        .in('holiday_id', holidayIds);
      
      rescheduleHistory = reschedules || [];
    }

    // Combine the data
    const enrichedHolidays = holidays?.map((holiday: any) => ({
      ...holiday,
      impact_assessments: impactAssessments.filter((i: any) => i.holiday_id === holiday.id),
      reschedule_history: rescheduleHistory.filter((r: any) => r.holiday_id === holiday.id)
    })) || [];

    return NextResponse.json({
      success: true,
      holidays: enrichedHolidays,
      count: enrichedHolidays.length
    });

  } catch (error) {
    console.error('Get holidays error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new holiday
export async function POST(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      holidayName,
      holidayDate,
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
    if (!holidayName || !holidayDate || !holidayType || !createdBy) {
      return NextResponse.json(
        { error: 'Holiday name, date, type, and creator are required' },
        { status: 400 }
      );
    }

    // Validate holiday date
    const holidayDateObj = new Date(holidayDate);
    if (isNaN(holidayDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid holiday date' },
        { status: 400 }
      );
    }

    // Check if holiday already exists on this date
    const { data: existingHoliday, error: checkError } = await supabase
      .from('unified_holidays')
      .select('id, holiday_name')
      .eq('holiday_date', holidayDate)
      .single();

    if (existingHoliday && !checkError) {
      return NextResponse.json(
        { error: `Holiday "${(existingHoliday as any).holiday_name}" already exists on this date` },
        { status: 409 }
      );
    }

    // Create holiday record
    const holidayData = {
      holiday_name: holidayName,
      holiday_date: holidayDate,
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
    };

    const { data: newHoliday, error: insertError } = await supabase
      .from('unified_holidays')
      .insert(holidayData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating holiday:', insertError);
      return NextResponse.json(
        { error: 'Failed to create holiday' },
        { status: 500 }
      );
    }

    // If it's an unannounced holiday, trigger immediate impact assessment and notifications
    if (!isAnnounced || holidayType === 'emergency') {
      // Schedule impact assessment in the background
      triggerHolidayProcessing((newHoliday as any).id).catch(error => {
        console.error('Background holiday processing failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Holiday created successfully',
      holiday: newHoliday
    });

  } catch (error) {
    console.error('Create holiday error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update existing holiday
export async function PUT(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      holidayName,
      holidayDate,
      holidayType,
      description,
      isAnnounced,
      announcedDate,
      affectsSeminars,
      affectsAssignments,
      affectsExams,
      rescheduleRules
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    // Check if holiday exists
    const { data: existingHoliday, error: checkError } = await supabase
      .from('unified_holidays')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingHoliday) {
      return NextResponse.json(
        { error: 'Holiday not found' },
        { status: 404 }
      );
    }

    const updateData = {
      ...(holidayName && { holiday_name: holidayName }),
      ...(holidayDate && { holiday_date: holidayDate }),
      ...(holidayType && { holiday_type: holidayType }),
      ...(description !== undefined && { description: description }),
      ...(isAnnounced !== undefined && { is_announced: isAnnounced }),
      ...(announcedDate && { announced_date: announcedDate }),
      ...(affectsSeminars !== undefined && { affects_seminars: affectsSeminars }),
      ...(affectsAssignments !== undefined && { affects_assignments: affectsAssignments }),
      ...(affectsExams !== undefined && { affects_exams: affectsExams }),
      ...(rescheduleRules && { reschedule_rules: rescheduleRules }),
      updated_at: new Date().toISOString()
    };

    const { data: updatedHoliday, error: updateError } = await supabase
      .from('unified_holidays')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating holiday:', updateError);
      return NextResponse.json(
        { error: 'Failed to update holiday' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Holiday updated successfully',
      holiday: updatedHoliday
    });

  } catch (error) {
    console.error('Update holiday error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete holiday
export async function DELETE(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Holiday ID is required' },
        { status: 400 }
      );
    }

    // Check if holiday exists and get details
    const { data: holiday, error: checkError } = await supabase
      .from('unified_holidays')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !holiday) {
      return NextResponse.json(
        { error: 'Holiday not found' },
        { status: 404 }
      );
    }

    // Check if holiday has associated reschedules
    const { data: reschedules, error: rescheduleError } = await supabase
      .from('unified_seminar_reschedule_history')
      .select('id')
      .eq('holiday_id', id);

    if (reschedules && reschedules.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete holiday with associated reschedule history',
          details: `${reschedules.length} reschedule record(s) found`
        },
        { status: 409 }
      );
    }

    // Delete the holiday (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('unified_holidays')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting holiday:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete holiday' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully'
    });

  } catch (error) {
    console.error('Delete holiday error:', error);
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
    // Don't throw error as the holiday was created successfully
  }
}