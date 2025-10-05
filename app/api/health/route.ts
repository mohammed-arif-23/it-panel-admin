import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const currentTime = new Date();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: currentTime.toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      host: request.headers.get('host'),
      userAgent: request.headers.get('user-agent'),
      url: request.url
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}