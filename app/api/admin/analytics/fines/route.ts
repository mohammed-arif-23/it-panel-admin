import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { jwtVerify } from 'jose';

// Check admin authentication using JWT
async function checkAdminAuth(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) return false;
  
  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    const secretKey = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token, secretKey);
    return true;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await checkAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get fines data
    const { data: fines, error } = await (supabaseAdmin as any)
      .from('unified_student_fines')
      .select(`
        *,
        unified_students(name, register_number, class_year)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fines:', error);
      return NextResponse.json({ error: 'Failed to fetch fines' }, { status: 500 });
    }

    // Calculate statistics
    const totalFines = fines?.length || 0;
    const totalAmount = fines?.reduce((sum: number, fine: any) => sum + (fine.base_amount || 0), 0) || 0;
    const pendingFines = fines?.filter((f: any) => !f.paid_at).length || 0;
    const paidFines = fines?.filter((f: any) => f.paid_at).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        totalFines,
        totalAmount,
        pendingFines,
        paidFines,
        fines: fines || []
      }
    });

  } catch (error) {
    console.error('Fines analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}