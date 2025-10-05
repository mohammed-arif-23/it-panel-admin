import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This endpoint is no longer used
// FCM tokens are now saved directly to push_subscriptions table via student panel
// Endpoint: /api/notifications/subscribe

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Use /api/notifications/subscribe instead.',
      deprecated: true 
    },
    { status: 410 } // Gone
  );
}
