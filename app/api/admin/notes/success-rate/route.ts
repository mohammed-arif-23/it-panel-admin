import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../../lib/auth';

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
  try {
    if (!(await checkAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Replace with actual database query for success rate calculation
      // const total = await db.notes.count();
      // const successful = await db.notes.count({ where: { status: 'success' } });
      // const rate = total > 0 ? Math.round((successful / total) * 100) : 0;
      
      // For now, return 0 until real database is connected
      return NextResponse.json({ 
        success: true, 
        rate: 0 
      });
    } catch (error) {
      console.error('Error fetching Notes success rate:', error);
      return NextResponse.json({ 
        success: false, 
        rate: 0,
        error: 'Failed to fetch Notes success rate' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in Notes success rate route:', error);
    return NextResponse.json({ 
      success: false, 
      rate: 0,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}