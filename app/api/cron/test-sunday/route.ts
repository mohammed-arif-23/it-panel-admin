import { NextRequest, NextResponse } from 'next/server';

// This test-sunday cron endpoint is disabled to prevent accidental triggering.
// Use /api/cron/direct-select for production cron runs.
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: 'Cron test-sunday endpoint is disabled. Use /api/cron/direct-select',
      disabled: true,
      timestamp: new Date().toISOString(),
    },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}