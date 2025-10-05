import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This endpoint is no longer used
// FCM tokens are now managed directly in push_subscriptions table via student panel
// Endpoint: /api/notifications/unsubscribe

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Use /api/notifications/unsubscribe instead.',
      deprecated: true 
    },
    { status: 410 } // Gone
  );
}
