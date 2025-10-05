import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        students: []
      });
    }

    // Search for students by name or register number
    const { data: students, error } = await supabase
      .from('unified_students')
      .select('id, name, register_number, class_year, password')
      .or(`name.ilike.%${query}%, register_number.ilike.%${query}%`)
      .limit(limit)
      .order('name');

    if (error) {
      console.error('Student search error:', error);
      return NextResponse.json(
        { error: 'Failed to search students' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      students: students || []
    });

  } catch (error) {
    console.error('Student search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}