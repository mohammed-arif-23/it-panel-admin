import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check assignments table
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('assignments')
      .select('id, title, class_year')
      .limit(10);
    
    console.log('Assignments:', { count: assignments?.length, error: assignmentsError });
    
    // Test 2: Check assignment_submissions table
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from('assignment_submissions')
      .select('id, status, student_id, assignment_id')
      .limit(10);
    
    console.log('Submissions:', { count: submissions?.length, error: submissionsError });
    
    // Test 3: Check unified_students table
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('unified_students')
      .select('id, name, register_number, class_year')
      .limit(10);
    
    console.log('Students:', { count: students?.length, error: studentsError });
    
    // Test 4: Try a join query
    const { data: joinedData, error: joinError } = await supabaseAdmin
      .from('assignment_submissions')
      .select(`
        id,
        status,
        unified_students!assignment_submissions_student_id_fkey (
          name,
          register_number,
          class_year
        ),
        assignments!assignment_submissions_assignment_id_fkey (
          title,
          class_year
        )
      `)
      .limit(5);
    
    console.log('Joined query:', { count: joinedData?.length, error: joinError });
    
    return NextResponse.json({
      success: true,
      data: {
        assignments: {
          count: assignments?.length || 0,
          sample: assignments?.slice(0, 3) || [],
          error: assignmentsError?.message
        },
        submissions: {
          count: submissions?.length || 0,
          sample: submissions?.slice(0, 3) || [],
          error: submissionsError?.message
        },
        students: {
          count: students?.length || 0,
          sample: students?.slice(0, 3) || [],
          error: studentsError?.message
        },
        joined: {
          count: joinedData?.length || 0,
          sample: joinedData?.slice(0, 3) || [],
          error: joinError?.message
        }
      }
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Database test failed: ' + (error as Error).message 
    }, { status: 500 });
  }
}
