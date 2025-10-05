import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dept = searchParams.get('dept')

    if (!dept) {
      return NextResponse.json({ success: false, error: 'dept is required' }, { status: 400 })
    }

    // Get distinct years/semesters from subjects table for the department
    const { data, error } = await (supabase as any)
      .from('subjects')
      .select('semester')
      .eq('department', dept)
      .not('semester', 'is', null)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch years' }, { status: 500 })
    }

    // Convert semester numbers to year format
    const semesters = Array.from(new Set((data || []).map((r: any) => r.semester).filter(Boolean)))
    const years = semesters.map((sem: any) => {
      const semNum = Number(sem)
      if (semNum <= 2) return 'I-IT'
      if (semNum <= 4) return 'II-IT'
      if (semNum <= 6) return 'III-IT'
      return 'IV-IT'
    })

    const uniqueYears = Array.from(new Set(years)).sort()
    return NextResponse.json({ success: true, years: uniqueYears })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
