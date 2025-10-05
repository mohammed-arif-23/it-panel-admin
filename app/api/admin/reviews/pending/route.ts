import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Replace with actual database query
    // const count = await db.reviews.count({ where: { status: 'pending' } });
    
    // For now, return 0 until real database is connected
    return NextResponse.json({ 
      success: true, 
      count: 0 
    });
  } catch (error) {
    console.error('Error fetching pending reviews count:', error);
    return NextResponse.json({ 
      success: false, 
      count: 0,
      error: 'Failed to fetch pending reviews count' 
    }, { status: 500 });
  }
}
