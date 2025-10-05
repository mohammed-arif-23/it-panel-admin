import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get distinct departments from subjects table
    const { data, error } = await (supabase as any)
      .from('subjects')
      .select('department')
      .not('department', 'is', null)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch departments' }, { status: 500 })
    }

    const departments = Array.from(new Set((data || []).map((r: any) => r.department).filter(Boolean)))
    return NextResponse.json({ success: true, departments })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
