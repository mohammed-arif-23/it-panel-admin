import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Returns distinct departments, years (number), and semesters (number) from Supabase subjects table
// Optional query params: ?department=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    
    // Fetch list (array) and derive sets; do not use single()/maybeSingle()
    const { data: allRows, error } = await supabaseAdmin
      .from('subjects')
      .select('department, semester, is_ncc_course')
      .not('department', 'is', null)
      .not('semester', 'is', null);

    if (error) {
      console.error('Supabase error fetching options:', error);
      return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 });
    }

    const usableRows = (allRows || []).filter((r: any) => r?.is_ncc_course !== true);
    const filtered = usableRows.filter((r: any) => !department || r.department === department);
    const departments = Array.from(new Set(usableRows.map((r: any) => r.department))).filter(Boolean).sort();
    const semesters = Array.from(new Set(filtered.map((r: any) => r.semester))).filter((n: any) => typeof n === 'number').sort((a: number, b: number) => a - b);
    // Fallback years since subjects.year doesn't exist in your schema
    const years = [1, 2, 3, 4];

    return NextResponse.json({ departments, years, semesters });
  } catch (e) {
    console.error('Error fetching options:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
