import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyJWT } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    
    // Get filter parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const target = searchParams.get('target');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    console.log('History request with filters:', {
      startDate,
      endDate,
      target,
      status,
      category
    });

    // Build query
    let query = (supabaseAdmin as any)
      .from('notification_history')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (target) {
      query = query.eq('target', target);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('created_at', new Date(endDate).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history', message: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend interface
    const notifications = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      target: row.target,
      targetValue: row.target_value,
      successCount: row.success_count || 0,
      failedCount: row.failed_count || 0,
      status: row.status,
      createdAt: row.created_at,
      sentBy: row.sent_by
    }));

    return NextResponse.json({
      notifications,
      total: notifications.length
    });
  } catch (error: any) {
    console.error('History fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history', message: error.message },
      { status: 500 }
    );
  }
}