import { NextRequest, NextResponse } from 'next/server';

// This endpoint is intentionally disabled to prevent duplicate cron executions.
// Use /api/cron/direct-select exclusively.
export async function GET(_request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      message: 'This cron endpoint is disabled. Use /api/cron/direct-select',
      disabled: true,
      timestamp: new Date().toISOString(),
    },
    { status: 410 }
  );
}

export async function POST(request: NextRequest) {
  return GET(request);
}