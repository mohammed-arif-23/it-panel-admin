import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../lib/auth';

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
      // Return information about available QPS endpoints
      return NextResponse.json({ 
        success: true,
        message: 'QPS API endpoints available',
        endpoints: {
          count: '/api/admin/qps/count',
          departments: '/api/admin/qps/departments/count',
          monthly: '/api/admin/qps/monthly',
          successRate: '/api/admin/qps/success-rate'
        }
      });
    } catch (error) {
      console.error('Error in QPS main route:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch QPS information'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in QPS main route:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}