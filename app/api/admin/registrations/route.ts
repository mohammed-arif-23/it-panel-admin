import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';
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

// GET - Fetch all registrations with student details
export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch registrations with student details
    const { data: registrations, error } = await (supabaseAdmin as any)
      .from('unified_student_registrations')
      .select(`
        id,
        student_id,
        registration_type,
        registration_date,
        is_active,
        unified_students (
          register_number,
          name,
          email,
          class_year
        )
      `)
      .order('registration_date', { ascending: false });

    if (error) {
      console.error('Error fetching registrations:', error);
      return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
    }

    // Format the data
    const formattedRegistrations = registrations.map((reg: any) => ({
      ...reg,
      student: reg.unified_students
    }));

    return NextResponse.json({
      success: true,
      data: formattedRegistrations || []
    });

  } catch (error) {
    console.error('Registrations fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}