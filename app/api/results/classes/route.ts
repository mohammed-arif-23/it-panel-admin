import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('unified_students')
      .select('class_year')
      .not('class_year', 'is', null)
      .neq('class_year', '')
      .order('class_year', { ascending: true });

    if (error) {
      console.error('Supabase error fetching classes:', error);
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
    }

    const classes = Array.from(new Set((data || []).map((row: any) => row.class_year))).sort();
    return NextResponse.json({ classes });
  } catch (e) {
    console.error('Error fetching classes:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
