import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// POST - Mark notice as viewed by student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notice_id, student_id } = body;

    if (!notice_id || !student_id) {
      return NextResponse.json(
        { error: 'Missing required fields: notice_id, student_id' },
        { status: 400 }
      );
    }

    // Insert or update view record
    const { error } = await (supabaseAdmin as any)
      .from('unified_notice_views')
      .insert([{ notice_id, student_id, viewed_at: new Date().toISOString() }])
      .onConflict('notice_id,student_id')
      .ignore();

    if (error && error.code !== '23505') { // Ignore unique constraint errors
      console.error('Error marking notice as viewed:', error);
      return NextResponse.json(
        { error: 'Failed to mark notice as viewed', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Notice marked as viewed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/notices/view:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
