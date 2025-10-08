import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded', resetTime: rl.resetTime }, { status: 429 });
    }

    const { batch, department, year, semester, class_year } = await request.json();

    if (!batch || !department || year == null || semester == null || !class_year) {
      return NextResponse.json({ error: 'Missing required fields: batch, department, year, semester, class_year' }, { status: 400 });
    }

    const semNum = Number(semester);
    if (Number.isNaN(semNum)) {
      return NextResponse.json({ error: 'semester must be a number' }, { status: 400 });
    }

    // Subjects by department+semester using "code" column (no year column in your schema)
    const { data: subjects, error: subjectsError } = await supabaseAdmin
      .from('subjects')
      .select('code, is_ncc_course')
      .eq('department', department)
      .eq('semester', semNum);

    if (subjectsError) {
      console.error('Supabase subjects error:', subjectsError);
      return NextResponse.json({ error: 'Failed to fetch subjects from Supabase' }, { status: 500 });
    }

    const subjectCodes: string[] = (subjects || [])
      .filter((s: any) => s?.is_ncc_course !== true)
      .map((s: any) => s.code)
      .filter(Boolean);

    // Students by class
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('unified_students')
      .select('register_number')
      .eq('class_year', class_year);

    if (studentsError) {
      console.error('Supabase students error:', studentsError);
      return NextResponse.json({ error: 'Failed to fetch students from Supabase' }, { status: 500 });
    }

    return NextResponse.json({
      subjectCodes,
      subjectCount: subjectCodes.length,
      studentCount: (students || []).length
    });
  } catch (e) {
    console.error('Preview error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
