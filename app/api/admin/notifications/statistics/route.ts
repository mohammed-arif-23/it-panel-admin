import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth';

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
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    // TODO: Implement actual database queries for statistics
    // This is mock data
    
    const mockStats = {
      totalSent: 1247,
      todaySent: 12,
      weekSent: 89,
      monthSent: 342,
      successRate: 97.5,
      activeSubscriptions: 248,
      categoryBreakdown: {
        general: 450,
        assignments: 320,
        seminars: 180,
        fines: 150,
        cod: 147
      },
      recentNotifications: [
        {
          id: '1',
          title: 'Assignment Reminder',
          body: 'Submit your assignment by tomorrow',
          target: 'class',
          targetValue: 'II-IT',
          successCount: 45,
          failedCount: 0,
          status: 'sent',
          createdAt: new Date().toISOString(),
          sentBy: 'admin'
        },
        {
          id: '2',
          title: 'Exam Schedule',
          body: 'Exam schedule has been updated',
          target: 'all',
          targetValue: 'all',
          successCount: 248,
          failedCount: 2,
          status: 'sent',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          sentBy: 'admin'
        }
      ]
    };

    return NextResponse.json(mockStats);
  } catch (error: any) {
    console.error('Statistics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', message: error.message },
      { status: 500 }
    );
  }
}