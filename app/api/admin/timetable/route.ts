import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Admin: Create/Update timetable JSON per class
// Secured via header: x-admin-api-key = process.env.ADMIN_API_KEY
// POST body: { dept: string, class: string, json: object }
export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-admin-api-key') || ''
    if (!process.env.ADMIN_API_KEY || apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { dept, class: className, json } = body || {}

    if (!dept || !className || !json) {
      return NextResponse.json({ success: false, error: 'dept, class and json are required' }, { status: 400 })
    }

    // Upsert into class_timetable
    const { data, error } = await (supabase as any)
      .from('class_timetable')
      .upsert(
        [{ dept, class: className, json, updated_at: new Date().toISOString() }],
        { onConflict: 'class' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}

// Optional: GET for admins to view current stored timetable for a class
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const classYear = searchParams.get('class_year')

    if (!classYear) {
      return NextResponse.json({ success: false, error: 'class_year is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('class_timetable')
      .select('*')
      .eq('class', classYear)
      .single()

    if (error) {
      const status = (error as any)?.code === 'PGRST116' ? 404 : 500
      return NextResponse.json({ success: false, error: 'Timetable not found' }, { status })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Unexpected error' }, { status: 500 })
  }
}
