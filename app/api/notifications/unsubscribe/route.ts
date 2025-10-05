import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, endpoint } = body;

    if (!userId && !endpoint) {
      return NextResponse.json(
        { error: 'Missing userId or endpoint' },
        { status: 400 }
      );
    }

    console.log('Push unsubscribe request:', { userId, endpoint });

    // Delete subscription from database
    let query = (supabaseAdmin as any).from('push_subscriptions').delete();
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    // Note: endpoint is stored in JSONB, so we filter by user_id only

    const { error } = await query;

    if (error) {
      console.error('Subscription delete error:', error);
      return NextResponse.json(
        { error: 'Failed to remove subscription', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription removed successfully'
    });
  } catch (error: any) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription', message: error.message },
      { status: 500 }
    );
  }
}
