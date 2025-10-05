import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dept = searchParams.get('dept')
    const year = searchParams.get('year')
    const semester = searchParams.get('semester')

    if (!dept || !year || !semester) {
      return NextResponse.json({ success: false, error: 'dept, year, and semester are required' }, { status: 400 })
    }

    // Subjects table uses abbreviated department names (IT, CSE, etc.) - same as UI
    // No mapping needed for subjects table
    const dbDepartment = dept

    // Map semester text to semester number
    const semesterMap: { [key: string]: number } = {
      'Semester 1': 1,
      'Semester 2': 2,
      'Semester 3': 3,
      'Semester 4': 4,
      'Semester 5': 5,
      'Semester 6': 6,
      'Semester 7': 7,
      'Semester 8': 8
    }

    const semesterNumber = semesterMap[semester]
    if (!semesterNumber) {
      return NextResponse.json({ success: false, error: 'Invalid semester format' }, { status: 400 })
    }

    // Query subjects table for theory and elective courses
    const { data, error } = await (supabase as any)
      .from('subjects')
      .select('code, name, category, course_type, credits, semester, department')
      .eq('department', dbDepartment)
      .eq('semester', semesterNumber)
      .order('code')

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch subjects' }, { status: 500 })
    }

    // Filter for theory and elective courses only, exclude NCC courses
    const filteredData = (data || []).filter((subject: any) => 
      ['THEORY', 'ELECTIVE'].includes(subject.course_type?.toUpperCase()) &&
      !subject.code?.toUpperCase().startsWith('NCC')
    )

    const subjects = filteredData.map((subject: any) => ({
      code: subject.code,
      name: subject.name,
      staff: null, // Not available in subjects table
      internal: subject.category || null
    }))

    return NextResponse.json({ success: true, subjects: subjects })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
