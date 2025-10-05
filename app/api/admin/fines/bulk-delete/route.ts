import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase";

export async function POST(request: Request) {
  try {
    const { date, fine_type, class_year } = await request.json();

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    console.log(`Bulk deleting fines for date: ${date}, type: ${fine_type || 'all'}, class: ${class_year || 'all'}`);

    // Build the query
    let query = (supabaseAdmin as any)
      .from('unified_student_fines')
      .delete()
      .eq('reference_date', date);

    // Add optional filters
    if (fine_type && fine_type !== 'all') {
      query = query.eq('fine_type', fine_type);
    }

    // If class filter is specified, we need to join with students table
    if (class_year && class_year !== 'all') {
      // First get student IDs for the specified class
      const { data: students, error: studentsError } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('id')
        .eq('class_year', class_year);

      if (studentsError) {
        console.error("Error fetching students for class filter:", studentsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch students for class filter" },
          { status: 500 }
        );
      }

      const studentIds = (students || []).map((s: any) => s.id);
      if (studentIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No students found for class ${class_year}`,
          deleted_count: 0
        });
      }

      query = query.in('student_id', studentIds);
    }

    // Execute the delete query and get the deleted records
    const { data: deletedFines, error: deleteError } = await query.select();

    if (deleteError) {
      console.error("Error deleting fines:", deleteError);
      return NextResponse.json(
        { success: false, error: "Failed to delete fines", details: deleteError.message },
        { status: 500 }
      );
    }

    const deletedCount = deletedFines?.length || 0;

    console.log(`Successfully deleted ${deletedCount} fines for date ${date}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} fine(s) for ${date}`,
      deleted_count: deletedCount,
      filters: {
        date,
        fine_type: fine_type || 'all',
        class_year: class_year || 'all'
      }
    });

  } catch (error) {
    console.error("Bulk delete fines error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to bulk delete fines",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const fine_type = searchParams.get('fine_type');
    const class_year = searchParams.get('class_year');

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    console.log(`Previewing fines for bulk delete - date: ${date}, type: ${fine_type || 'all'}, class: ${class_year || 'all'}`);

    // Build the query to preview what would be deleted
    let query = (supabaseAdmin as any)
      .from('unified_student_fines')
      .select(`
        id,
        student_id,
        fine_type,
        reference_date,
        base_amount,
        payment_status
      `)
      .eq('reference_date', date);

    // Add optional filters
    if (fine_type && fine_type !== 'all') {
      query = query.eq('fine_type', fine_type);
    }

    // If class filter is specified, we need to join with students table
    if (class_year && class_year !== 'all') {
      // First get student IDs for the specified class
      const { data: students, error: studentsError } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('id')
        .eq('class_year', class_year);

      if (studentsError) {
        console.error("Error fetching students for class filter:", studentsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch students for class filter" },
          { status: 500 }
        );
      }

      const studentIds = (students || []).map((s: any) => s.id);
      if (studentIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: `No students found for class ${class_year}`,
          fines: [],
          count: 0
        });
      }

      query = query.in('student_id', studentIds);
    }

    const { data: fines, error } = await query;

    if (error) {
      console.error("Error previewing fines:", error);
      return NextResponse.json(
        { success: false, error: "Failed to preview fines", details: error.message },
        { status: 500 }
      );
    }

    // Get student details for the fines
    let enrichedFines = fines || [];
    if (fines && fines.length > 0) {
      const studentIds = fines.map((f: any) => f.student_id);
      const { data: students } = await (supabaseAdmin as any)
        .from('unified_students')
        .select('id, register_number, name, class_year')
        .in('id', studentIds);

      // Enrich fines with student data
      enrichedFines = fines.map((fine: any) => {
        const student = students?.find((s: any) => s.id === fine.student_id);
        return {
          ...fine,
          unified_students: student || null
        };
      });
    }

    return NextResponse.json({
      success: true,
      fines: enrichedFines,
      count: enrichedFines.length,
      filters: {
        date,
        fine_type: fine_type || 'all',
        class_year: class_year || 'all'
      }
    });

  } catch (error) {
    console.error("Preview fines error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to preview fines",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}