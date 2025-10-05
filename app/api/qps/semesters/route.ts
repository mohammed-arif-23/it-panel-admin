import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dept = searchParams.get('dept')
    const year = searchParams.get('year')

    if (!dept || !year) {
      return NextResponse.json({ success: false, error: 'dept and year are required' }, { status: 400 })
    }

    // Convert year to semester range
    let semesterRange: number[] = []
    switch (year) {
      case 'I-IT':
        semesterRange = [1, 2]
        break
      case 'II-IT':
        semesterRange = [3, 4]
        break
      case 'III-IT':
        semesterRange = [5, 6]
        break
      case 'IV-IT':
        semesterRange = [7, 8]
        break
      default:
        return NextResponse.json({ success: false, error: 'Invalid year' }, { status: 400 })
    }

    // Get distinct semesters from subjects table for the department and year range
    const { data, error } = await (supabase as any)
      .from('subjects')
      .select('semester')
      .eq('department', dept)
      .in('semester', semesterRange)
      .not('semester', 'is', null)

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch semesters' }, { status: 500 })
    }

    // Convert semester numbers to semester format
    const semesters = Array.from(new Set((data || []).map((r: any) => r.semester).filter(Boolean)))
      .map((sem: any) => `Semester ${sem}`)
      .sort()

    return NextResponse.json({ success: true, data: semesters })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
