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
      // Return information about available Lab Manuals endpoints
      return NextResponse.json({ 
        success: true,
        message: 'Lab Manuals API endpoints available',
        endpoints: {
          count: '/api/admin/lab-manuals/count',
          departments: '/api/admin/lab-manuals/departments/count',
          monthly: '/api/admin/lab-manuals/monthly',
          successRate: '/api/admin/lab-manuals/success-rate'
        }
      });
    } catch (error) {
      console.error('Error in Lab Manuals main route:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to fetch Lab Manuals information'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in Lab Manuals main route:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}