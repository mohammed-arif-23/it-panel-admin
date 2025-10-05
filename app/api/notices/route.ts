import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { sendEnhancedNotifications } from '../../../lib/enhancedNotificationService';

// GET - Fetch notices (for students and admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const classYear = searchParams.get('class_year');
    const includeExpired = searchParams.get('include_expired') === 'true';
    const noticeType = searchParams.get('type');
    const priority = searchParams.get('priority');

    let query = supabaseAdmin
      .from('unified_notices')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    // Filter by expiration
    if (!includeExpired) {
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
    }

    // Filter by type
    if (noticeType) {
      query = query.eq('notice_type', noticeType);
    }

    // Filter by priority
    if (priority) {
      query = query.eq('priority', priority);
    }

    // Filter by target audience for students
    if (classYear) {
      query = query.or(`target_audience.eq.all,target_audience.eq.students,target_audience.eq.${classYear}`);
    }

    const { data: notices, error } = await query;

    if (error) {
      console.error('Error fetching notices:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notices', details: error.message },
        { status: 500 }
      );
    }

    // If student_id is provided, enrich with view/ack status
    if (studentId && notices) {
      const noticeIds = notices.map((n: any) => n.id);

      const { data: views } = await supabaseAdmin
        .from('unified_notice_views')
        .select('notice_id')
        .eq('student_id', studentId)
        .in('notice_id', noticeIds);

      const { data: acks } = await supabaseAdmin
        .from('unified_notice_acknowledgments')
        .select('notice_id')
        .eq('student_id', studentId)
        .in('notice_id', noticeIds);

      const viewedNotices = new Set((views as any[])?.map((v: any) => v.notice_id) || []);
      const ackedNotices = new Set((acks as any[])?.map((a: any) => a.notice_id) || []);

      const enrichedNotices = notices.map((notice: any) => ({
        ...notice,
        has_viewed: viewedNotices.has(notice.id),
        has_acknowledged: ackedNotices.has(notice.id),
      }));

      return NextResponse.json({ notices: enrichedNotices }, { status: 200 });
    }

    return NextResponse.json({ notices }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/notices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Create new notice (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      notice_type = 'general',
      priority = 'medium',
      target_audience = 'all',
      is_published = false,
      expires_at,
      attachment_url,
      attachment_name,
      created_by,
    } = body;

    // Validation
    if (!title || !content || !created_by) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, created_by' },
        { status: 400 }
      );
    }

    const { data: notice, error } = await (supabaseAdmin as any)
      .from('unified_notices')
      .insert([
        {
          title,
          content,
          notice_type,
          priority,
          target_audience,
          is_published,
          published_at: is_published ? new Date().toISOString() : null,
          expires_at: expires_at || null,
          attachment_url: attachment_url || null,
          attachment_name: attachment_name || null,
          created_by,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating notice:', error);
      return NextResponse.json(
        { error: 'Failed to create notice', details: error.message },
        { status: 500 }
      );
    }

    // Send notifications if notice is published
    if (is_published) {
      try {
        const notificationTarget = target_audience === 'all' ? 'all' : 
                                   target_audience === 'students' ? 'all' :
                                   target_audience;
        
        const notificationPayload = {
          title: `📢 ${title}`,
          body: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          url: '/notice',
          icon: '/icons/android-launchericon.png',
          tag: 'notice',
          priority: priority as 'low' | 'medium' | 'high' | 'urgent',
          data: {
            type: 'notice',
            priority,
            category: notice_type,
            notice_id: notice.id
          }
        };

        await sendEnhancedNotifications(
          { 
            target: notificationTarget === 'all' ? 'all' : 'class',
            targetValue: notificationTarget === 'all' ? null : notificationTarget
          },
          notificationPayload
        );
        
        console.log(`✅ Notifications sent for notice: ${title}`);
      } catch (notifError) {
        console.error('Error sending notice notifications:', notifError);
        // Don't fail the notice creation if notification fails
      }
    }

    return NextResponse.json(
      { message: 'Notice created successfully', notice },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/notices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update notice (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Notice ID is required' },
        { status: 400 }
      );
    }

    // If publishing for the first time, set published_at
    if (updates.is_published && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const { data: notice, error } = await (supabaseAdmin as any)
      .from('unified_notices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating notice:', error);
      return NextResponse.json(
        { error: 'Failed to update notice', details: error.message },
        { status: 500 }
      );
    }

    // Send notifications if notice is being published for the first time
    if (updates.is_published && !updates.published_at) {
      try {
        const notificationTarget = notice.target_audience === 'all' ? 'all' : 
                                   notice.target_audience === 'students' ? 'all' :
                                   notice.target_audience;
        
        const notificationPayload = {
          title: `📢 ${notice.title}`,
          body: notice.content.substring(0, 100) + (notice.content.length > 100 ? '...' : ''),
          url: '/notice',
          icon: '/icons/android-launchericon.png',
          tag: 'notice',
          priority: notice.priority as 'low' | 'medium' | 'high' | 'urgent',
          data: {
            type: 'notice',
            priority: notice.priority,
            category: notice.notice_type,
            notice_id: notice.id
          }
        };

        await sendEnhancedNotifications(
          { 
            target: notificationTarget === 'all' ? 'all' : 'class',
            targetValue: notificationTarget === 'all' ? null : notificationTarget
          },
          notificationPayload
        );
        
        console.log(`✅ Notifications sent for published notice: ${notice.title}`);
      } catch (notifError) {
        console.error('Error sending notice notifications:', notifError);
        // Don't fail the notice update if notification fails
      }
    }

    return NextResponse.json(
      { message: 'Notice updated successfully', notice },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in PUT /api/notices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notice (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Notice ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('unified_notices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting notice:', error);
      return NextResponse.json(
        { error: 'Failed to delete notice', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Notice deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/notices:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
