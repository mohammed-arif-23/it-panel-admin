import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { student_id, class_year } = await request.json()

    if (!student_id || !class_year) {
      return NextResponse.json({ error: 'Student ID and class year are required' }, { status: 400 })
    }

    // Get assignments for student's specific class year only
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .eq('class_year', class_year)
      .order('created_at', { ascending: false })

    if (assignmentsError) {
      console.error('Error loading assignments:', assignmentsError)
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 })
    }

    // Get submissions for current student
    const { data: submissionsData, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('student_id', student_id)

    if (submissionsError) {
      console.error('Error loading submissions:', submissionsError)
      return NextResponse.json({ error: submissionsError.message }, { status: 500 })
    }

    // Combine assignments with submissions
    const assignmentsWithSubmissions = (assignments || []).map((assignment: any) => {
      const submission = submissionsData?.find((sub: any) => sub.assignment_id === assignment.id)
      return {
        ...assignment,
        submission
      }
    })

    return NextResponse.json({ data: assignmentsWithSubmissions })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}