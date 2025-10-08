import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { isValidGrade } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limiter';

export async function GET(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimit.resetTime },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batch = searchParams.get('batch');
    const department = searchParams.get('department');
    const year = searchParams.get('year');
    const semester = searchParams.get('semester');

    // Validate all required parameters
    if (!batch || !department || !year || !semester) {
      return NextResponse.json(
        { error: 'Missing required parameters: batch, department, year, semester' },
        { status: 400 }
      );
    }

    // Validate parameter types
    const yearNum = parseInt(year);
    const semesterNum = parseInt(semester);
    
    if (isNaN(yearNum) || isNaN(semesterNum)) {
      return NextResponse.json(
        { error: 'Year and semester must be valid numbers' },
        { status: 400 }
      );
    }

    const collection = await getCollection('semester_result_sheets');

    const resultSheet = await collection.findOne({
      batch: batch.trim(),
      department: department.trim(),
      year_num: yearNum,
      semester: semesterNum
    });

    if (!resultSheet) {
      return NextResponse.json(
        { error: 'No result sheet found for the given filters' },
        { status: 404 }
      );
    }

    // Sort result_data by registration number (ascending)
    const sortedResultData = resultSheet.result_data.sort((a: any, b: any) => 
      a.stu_reg_no.localeCompare(b.stu_reg_no)
    );

    return NextResponse.json({
      sheet_id: resultSheet.sheet_id,
      department: resultSheet.department,
      year: resultSheet.year,
      semester: resultSheet.semester,
      batch: resultSheet.batch,
      exam_cycle: resultSheet.exam_cycle,
      result_data: sortedResultData
    });

  } catch (error) {
    console.error('Error fetching result sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = checkRateLimit(request);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', resetTime: rateLimit.resetTime },
        { status: 429 }
      );
    }

    const { 
      batch, 
      department, 
      year, 
      semester, 
      stu_reg_no, 
      sub_code, 
      new_grade 
    } = await request.json();

    // Validate all required parameters
    if (!batch || !department || !year || !semester || !stu_reg_no || !sub_code || !new_grade) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate parameter types
    const yearNum = parseInt(year);
    const semesterNum = parseInt(semester);
    
    if (isNaN(yearNum) || isNaN(semesterNum)) {
      return NextResponse.json(
        { error: 'Year and semester must be valid numbers' },
        { status: 400 }
      );
    }

    // Validate grade
    if (!isValidGrade(new_grade)) {
      return NextResponse.json(
        { error: 'Invalid grade value. Valid grades: O, A+, A, B+, B, C, P, U, AB, RA, SA' },
        { status: 400 }
      );
    }

    // Validate student registration number format
    if (!/^\d{12}$/.test(stu_reg_no)) {
      return NextResponse.json(
        { error: 'Invalid student registration number format' },
        { status: 400 }
      );
    }

    // Validate subject code format
    if (!/^[A-Z]{2}\d{4}$/.test(sub_code)) {
      return NextResponse.json(
        { error: 'Invalid subject code format' },
        { status: 400 }
      );
    }

    const collection = await getCollection('semester_result_sheets');

    const result = await collection.updateOne(
      {
        batch: batch.trim(),
        department: department.trim(),
        year_num: yearNum,
        semester: semesterNum
      },
      {
        $set: {
          [`result_data.$[student].res_data.${sub_code.trim()}`]: new_grade.trim()
        }
      },
      {
        arrayFilters: [
          { "student.stu_reg_no": stu_reg_no.trim() }
        ]
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Result sheet not found for the specified filters' },
        { status: 404 }
      );
    }

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: 'Student registration number or subject code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Grade updated successfully',
      updatedFields: {
        student: stu_reg_no,
        subject: sub_code,
        grade: new_grade
      }
    });

  } catch (error) {
    console.error('Error updating grade:', error);
    return NextResponse.json(
      { error: 'Failed to update grade. Please try again later.' },
      { status: 500 }
    );
  }
}
