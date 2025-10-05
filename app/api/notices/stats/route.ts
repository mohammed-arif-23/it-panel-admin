import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

// GET - Get notice statistics (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noticeId = searchParams.get('notice_id');

    if (noticeId) {
      // Get stats for a specific notice
      const { data: notice, error: noticeError } = await supabaseAdmin
        .from('unified_notices')
        .select('*')
        .eq('id', noticeId)
        .single();

      if (noticeError) {
        return NextResponse.json(
          { error: 'Notice not found', details: noticeError.message },
          { status: 404 }
        );
      }

      const { data: views } = await supabaseAdmin
        .from('unified_notice_views')
        .select('*')
        .eq('notice_id', noticeId);

      const { data: acks } = await supabaseAdmin
        .from('unified_notice_acknowledgments')
        .select('*')
        .eq('notice_id', noticeId);

      return NextResponse.json(
        {
          notice,
          views_count: views?.length || 0,
          acknowledgments_count: acks?.length || 0,
        },
        { status: 200 }
      );
    }

    // Get overall statistics
    const { data: totalNotices } = await supabaseAdmin
      .from('unified_notices')
      .select('id', { count: 'exact' });

    const { data: publishedNotices } = await supabaseAdmin
      .from('unified_notices')
      .select('id', { count: 'exact' })
      .eq('is_published', true);

    const { data: urgentNotices } = await supabaseAdmin
      .from('unified_notices')
      .select('id', { count: 'exact' })
      .eq('is_published', true)
      .in('priority', ['high', 'urgent']);

    return NextResponse.json(
      {
        total_notices: totalNotices?.length || 0,
        published_notices: publishedNotices?.length || 0,
        urgent_notices: urgentNotices?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in GET /api/notices/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
