import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Fetch reschedule history and options
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const holidayId = searchParams.get('holidayId');
    const type = searchParams.get('type'); // 'history' or 'suggestions'
    const classYear = searchParams.get('classYear');

    if (type === 'history') {
      // Fetch reschedule history
      let query = (supabase as any)
        .from('unified_seminar_reschedule_history')
        .select(`
          *,
          unified_holidays(
            holiday_name,
            holiday_date,
            holiday_type
          )
        `)
        .order('created_at', { ascending: false });

      if (holidayId) {
        query = query.eq('holiday_id', holidayId);
      }

      if (classYear) {
        query = query.eq('class_year', classYear);
      }

      const { data: history, error: historyError } = await query;

      if (historyError) {
        console.error('Error fetching reschedule history:', historyError);
        return NextResponse.json(
          { error: 'Failed to fetch reschedule history' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        history: history || [],
        count: history?.length || 0
      });

    } else if (type === 'suggestions') {
      // Get reschedule suggestions for a specific date
      const originalDate = searchParams.get('originalDate');
      
      if (!originalDate) {
        return NextResponse.json(
          { error: 'Original date is required for suggestions' },
          { status: 400 }
        );
      }

      const suggestions = await generateRescheduleSuggestions(originalDate, classYear || undefined);
      
      return NextResponse.json({
        success: true,
        suggestions: suggestions,
        originalDate: originalDate
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid type parameter. Use "history" or "suggestions"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Get reschedule data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create manual reschedule or approve automatic reschedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      holidayId,
      originalDate,
      newDate,
      seminarTopic,
      classYear,
      rescheduleReason,
      rescheduleType = 'manual',
      rescheduledBy,
      affectedStudentIds = [],
      autoRescheduleRules
    } = body;

    // Validate required fields
    if (!originalDate || !newDate || !rescheduleReason || !rescheduledBy) {
      return NextResponse.json(
        { error: 'Original date, new date, reason, and rescheduler are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const originalDateObj = new Date(originalDate);
    const newDateObj = new Date(newDate);
    
    if (isNaN(originalDateObj.getTime()) || isNaN(newDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (newDateObj <= originalDateObj) {
      return NextResponse.json(
        { error: 'New date must be after the original date' },
        { status: 400 }
      );
    }

    // Check if new date is a holiday
    const { data: newDateHoliday, error: holidayCheckError } = await (supabase as any)
      .from('unified_holidays')
      .select('holiday_name')
      .eq('holiday_date', newDate)
      .single();

    if (newDateHoliday && !holidayCheckError) {
      return NextResponse.json(
        { error: `Cannot reschedule to ${newDate} as it is also a holiday: ${(newDateHoliday as any).holiday_name}` },
        { status: 409 }
      );
    }

    // Check for existing reschedule on the same original date
    const { data: existingReschedule, error: existingError } = await (supabase as any)
      .from('unified_seminar_reschedule_history')
      .select('id, new_date')
      .eq('original_date', originalDate)
      .eq('class_year', classYear || 'ALL')
      .single();

    if (existingReschedule && !existingError) {
      return NextResponse.json(
        { 
          error: `Seminar for ${originalDate} has already been rescheduled to ${(existingReschedule as any).new_date}`,
          existingRescheduleId: (existingReschedule as any).id
        },
        { status: 409 }
      );
    }

    // Get affected students and bookings count
    const { affectedStudentsCount, affectedBookingsCount } = await getAffectedCounts(
      originalDate, 
      classYear, 
      affectedStudentIds
    );

    // Create reschedule record
    const rescheduleData = {
      holiday_id: holidayId || null,
      original_date: originalDate,
      new_date: newDate,
      seminar_topic: seminarTopic || 'College Seminar',
      class_year: classYear || 'ALL',
      reschedule_reason: rescheduleReason,
      reschedule_type: rescheduleType,
      affected_students_count: affectedStudentsCount,
      affected_bookings_count: affectedBookingsCount,
      status: 'scheduled',
      rescheduled_by: rescheduledBy,
      auto_reschedule_rules: autoRescheduleRules || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newReschedule, error: insertError } = await (supabase as any)
      .from('unified_seminar_reschedule_history')
      .insert(rescheduleData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating reschedule:', insertError);
      return NextResponse.json(
        { error: 'Failed to create reschedule record' },
        { status: 500 }
      );
    }

    // Schedule notifications for affected students
    await scheduleRescheduleNotifications(newReschedule);

    return NextResponse.json({
      success: true,
      message: 'Seminar rescheduled successfully',
      reschedule: newReschedule,
      affectedCounts: {
        students: affectedStudentsCount,
        bookings: affectedBookingsCount
      }
    });

  } catch (error) {
    console.error('Create reschedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update reschedule status or details
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      status,
      newDate,
      notes,
      updatedBy
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Reschedule ID is required' },
        { status: 400 }
      );
    }

    // Check if reschedule exists
    const { data: existingReschedule, error: checkError } = await (supabase as any)
      .from('unified_seminar_reschedule_history')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingReschedule) {
      return NextResponse.json(
        { error: 'Reschedule record not found' },
        { status: 404 }
      );
    }

    const updateData = {
      ...(status && { status }),
      ...(newDate && { new_date: newDate }),
      ...(notes && { notes }),
      updated_at: new Date().toISOString()
    };

    const { data: updatedReschedule, error: updateError } = await (supabase as any)
      .from('unified_seminar_reschedule_history')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating reschedule:', updateError);
      return NextResponse.json(
        { error: 'Failed to update reschedule record' },
        { status: 500 }
      );
    }

    // If status changed to confirmed, send confirmation notifications
    if (status === 'confirmed' && (existingReschedule as any).status !== 'confirmed') {
      await scheduleRescheduleNotifications(updatedReschedule, 'confirmation');
    }

    return NextResponse.json({
      success: true,
      message: 'Reschedule updated successfully',
      reschedule: updatedReschedule
    });

  } catch (error) {
    console.error('Update reschedule error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to generate reschedule suggestions
async function generateRescheduleSuggestions(originalDate: string, classYear?: string) {
  const suggestions = [];
  const originalDateObj = new Date(originalDate);
  
  // Get active reschedule rules
  const { data: rules, error: rulesError } = await (supabase as any)
    .from('unified_auto_reschedule_rules')
    .select('*')
    .eq('is_active', true)
    .eq('rule_type', 'seminar_reschedule')
    .order('priority', { ascending: true });

  if (rulesError || !rules || rules.length === 0) {
    // Default suggestions if no rules found
    for (let i = 1; i <= 7; i++) {
      const suggestedDate = new Date(originalDateObj);
      suggestedDate.setDate(suggestedDate.getDate() + i);
      
      // Skip weekends
      if (suggestedDate.getDay() !== 0 && suggestedDate.getDay() !== 6) {
        // Check if it's not a holiday
        const { data: holiday } = await (supabase as any)
          .from('unified_holidays')
          .select('holiday_name')
          .eq('holiday_date', suggestedDate.toISOString().split('T')[0])
          .single();

        if (!holiday) {
          suggestions.push({
            date: suggestedDate.toISOString().split('T')[0],
            reason: 'Next available working day',
            priority: i,
            isRecommended: i <= 3
          });
        }
      }
    }
  } else {
    // Generate suggestions based on rules
    for (const rule of rules) {
      const logic = (rule as any).reschedule_logic;
      const rescheduledays = logic.reschedule_days || 3;
      
      for (let i = 1; i <= rescheduledays; i++) {
        const suggestedDate = new Date(originalDateObj);
        suggestedDate.setDate(suggestedDate.getDate() + i);
        
        // Apply rule logic
        if (logic.avoid_weekends && (suggestedDate.getDay() === 0 || suggestedDate.getDay() === 6)) {
          continue;
        }
        
        // Check conflicts if required
        if (logic.check_conflicts) {
          const { data: conflicts } = await (supabase as any)
            .from('unified_holidays')
            .select('holiday_name')
            .eq('holiday_date', suggestedDate.toISOString().split('T')[0])
            .single();
            
          if (conflicts) continue;
        }
        
        suggestions.push({
          date: suggestedDate.toISOString().split('T')[0],
          reason: `Auto-suggestion based on rule: ${(rule as any).rule_name}`,
          priority: (rule as any).priority,
          isRecommended: (rule as any).priority <= 2,
          ruleId: (rule as any).id
        });
        
        if (suggestions.length >= 5) break;
      }
      
      if (suggestions.length >= 5) break;
    }
  }
  
  return suggestions.slice(0, 5);
}

// Helper function to get affected counts
async function getAffectedCounts(originalDate: string, classYear?: string, affectedStudentIds: string[] = []) {
  let affectedStudentsCount = 0;
  let affectedBookingsCount = 0;
  
  // This is a placeholder - you'll need to adapt this based on your actual booking/seminar table structure
  // Example queries:
  
  // Count affected bookings
  // const { data: bookings } = await supabase
  //   .from('your_booking_table')
  //   .select('id')
  //   .eq('booking_date', originalDate)
  //   .eq('class_year', classYear || 'ALL');
  // affectedBookingsCount = bookings?.length || 0;
  
  // Count affected students
  if (affectedStudentIds.length > 0) {
    affectedStudentsCount = affectedStudentIds.length;
  } else if (classYear) {
    const { data: students } = await (supabase as any)
      .from('unified_students')
      .select('id')
      .eq('class_year', classYear);
    affectedStudentsCount = students?.length || 0;
  }
  
  return { affectedStudentsCount, affectedBookingsCount };
}

// Helper function to schedule reschedule notifications
async function scheduleRescheduleNotifications(reschedule: any, type: string = 'reschedule') {
  try {
    const notificationTitle = type === 'confirmation' 
      ? 'Seminar Reschedule Confirmed'
      : 'Seminar Rescheduled';
      
    const notificationBody = type === 'confirmation'
      ? `Your seminar originally scheduled for ${reschedule.original_date} has been confirmed for ${reschedule.new_date}.`
      : `Your seminar scheduled for ${reschedule.original_date} has been rescheduled to ${reschedule.new_date}. Reason: ${reschedule.reschedule_reason}`;

    // Schedule notification (integrate with your notification system)
    await (supabase as any)
      .from('unified_holiday_notifications')
      .insert({
        holiday_id: (reschedule as any).holiday_id,
        notification_type: 'seminar_reschedule',
        target_audience: (reschedule as any).class_year ? 'specific_class' : 'all_students',
        class_year: (reschedule as any).class_year,
        notification_title: notificationTitle,
        notification_body: notificationBody,
        notification_data: {
          reschedule_id: (reschedule as any).id,
          original_date: (reschedule as any).original_date,
          new_date: (reschedule as any).new_date,
          seminar_topic: (reschedule as any).seminar_topic
        },
        created_by: (reschedule as any).rescheduled_by
      });
      
  } catch (error) {
    console.error('Error scheduling reschedule notifications:', error);
  }
}