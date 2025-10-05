import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Manual trigger for testing the dual-class selection
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000' 
        : request.url.split('/api')[0];
    
    console.log('Manually triggering COD selection...');
    
    const response = await fetch(`${baseUrl}/api/cod/auto-select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Auto-select failed with status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Manual selection trigger executed successfully',
      result: result,
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Manual selection trigger failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
