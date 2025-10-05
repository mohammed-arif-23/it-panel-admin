import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase';
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

// GET - Fetch student analytics
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get total students count
    const { count: totalStudents, error: totalError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total students:', totalError);
      return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 });
    }

    // Get active students (students with recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeStudents, error: activeError } = await (supabaseAdmin as any)
      .from('unified_students')
      .select('*', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo.toISOString());

    if (activeError) {
      console.error('Error fetching active students:', activeError);
      return NextResponse.json({ error: 'Failed to fetch student data' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      total: totalStudents || 0,
      active: activeStudents || 0
    });

  } catch (error) {
    console.error('Student analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}