import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Fetch academic calendar events
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const eventType = searchParams.get('eventType');
    const classYear = searchParams.get('classYear');
    const upcoming = searchParams.get('upcoming');

    let query = (supabase as any)
      .from('unified_academic_calendar')
      .select('*')
      .order('start_date', { ascending: true });

    // Filter by month and year
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query = query.gte('start_date', startDate).lte('start_date', endDate);
    }

    // Filter by event type
    if (eventType && eventType !== 'all') {
      query = query.eq('event_type', eventType);
    }

    // Filter by class year
    if (classYear && classYear !== 'all') {
      query = query.or(`class_year.eq.${classYear},class_year.is.null`);
    }

    // Filter upcoming events
    if (upcoming === 'true') {
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('start_date', today);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error('Error fetching calendar events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch calendar events' },
        { status: 500 }
      );
    }

    // Get holidays to include in calendar view
    const { data: holidays, error: holidaysError } = await (supabase as any)
      .from('unified_holidays')
      .select('*')
      .order('holiday_date', { ascending: true });

    if (holidaysError) {
      console.error('Error fetching holidays:', holidaysError);
    }

    return NextResponse.json({
      success: true,
      events: events || [],
      holidays: holidays || [],
      count: events?.length || 0
    });

  } catch (error) {
    console.error('Get calendar error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new calendar event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventName,
      eventType,
      startDate,
      endDate,
      classYear,
      department = 'IT',
      isFixed = false,
      priorityLevel = 1,
      description,
      recurringPattern,
      createdBy
    } = body;

    // Validate required fields
    if (!eventName || !eventType || !startDate || !createdBy) {
      return NextResponse.json(
        { error: 'Event name, type, start date, and creator are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid start date' },
        { status: 400 }
      );
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime()) || endDateObj < startDateObj) {
        return NextResponse.json(
          { error: 'Invalid end date or end date is before start date' },
          { status: 400 }
        );
      }
    }

    // Check for conflicts with holidays
    const { data: conflictingHoliday, error: holidayCheckError } = await (supabase as any)
      .from('unified_holidays')
      .select('holiday_name, holiday_date')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate || startDate);

    if (conflictingHoliday && conflictingHoliday.length > 0 && !holidayCheckError) {
      const conflictDates = conflictingHoliday.map((h: any) => `${h.holiday_date} (${h.holiday_name})`).join(', ');
      return NextResponse.json(
        { 
          warning: `Event conflicts with holidays: ${conflictDates}`,
          conflicts: conflictingHoliday
        },
        { status: 200 } // Not an error, just a warning
      );
    }

    // Create calendar event
    const eventData = {
      event_name: eventName,
      event_type: eventType,
      start_date: startDate,
      end_date: endDate || null,
      class_year: classYear || null,
      department: department,
      is_fixed: isFixed,
      priority_level: priorityLevel,
      description: description || null,
      recurring_pattern: recurringPattern || null,
      created_by: createdBy,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newEvent, error: insertError } = await (supabase as any)
      .from('unified_academic_calendar')
      .insert(eventData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error creating calendar event:', insertError);
      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar event created successfully',
      event: newEvent
    });

  } catch (error) {
    console.error('Create calendar event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update calendar event
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      eventName,
      eventType,
      startDate,
      endDate,
      classYear,
      department,
      isFixed,
      priorityLevel,
      description,
      recurringPattern,
      status,
      approvedBy
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if event exists
    const { data: existingEvent, error: checkError } = await (supabase as any)
      .from('unified_academic_calendar')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingEvent) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    const updateData = {
      ...(eventName && { event_name: eventName }),
      ...(eventType && { event_type: eventType }),
      ...(startDate && { start_date: startDate }),
      ...(endDate !== undefined && { end_date: endDate }),
      ...(classYear !== undefined && { class_year: classYear }),
      ...(department && { department: department }),
      ...(isFixed !== undefined && { is_fixed: isFixed }),
      ...(priorityLevel && { priority_level: priorityLevel }),
      ...(description !== undefined && { description: description }),
      ...(recurringPattern !== undefined && { recurring_pattern: recurringPattern }),
      ...(status && { status: status }),
      ...(approvedBy && { approved_by: approvedBy }),
      updated_at: new Date().toISOString()
    };

    const { data: updatedEvent, error: updateError } = await (supabase as any)
      .from('unified_academic_calendar')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating calendar event:', updateError);
      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar event updated successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Update calendar event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete calendar event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if event exists
    const { data: event, error: checkError } = await (supabase as any)
      .from('unified_academic_calendar')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !event) {
      return NextResponse.json(
        { error: 'Calendar event not found' },
        { status: 404 }
      );
    }

    // Check if event is fixed (cannot be deleted)
    if (event.is_fixed) {
      return NextResponse.json(
        { error: 'Cannot delete fixed calendar events' },
        { status: 409 }
      );
    }

    // Delete the event
    const { error: deleteError } = await (supabase as any)
      .from('unified_academic_calendar')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting calendar event:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Calendar event deleted successfully'
    });

  } catch (error) {
    console.error('Delete calendar event error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}