import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase';
import { verifyJWT } from '../../../../../../lib/auth';

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

// GET - Fetch student fines
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const studentId = params.id;

    // Fetch student fines
    const { data: fines, error: finesError } = await (supabaseAdmin as any)
      .from('unified_student_fines')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (finesError) {
      console.error('Error fetching fines:', finesError);
      return NextResponse.json(
        { error: 'Failed to fetch fines', details: finesError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: fines || []
    });

  } catch (error) {
    console.error('Fines fetch error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}