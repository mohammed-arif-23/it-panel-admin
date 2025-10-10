import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { isValidGrade } from '@/lib/validations';
import { checkRateLimit } from '@/lib/rate-limiter';

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

    const body = await request.json();
    const { batch, department, year, semester, updates } = body;

    // Validate required parameters
    if (!batch || !department || !year || !semester || !updates) {
      return NextResponse.json(
        { error: 'Missing required parameters: batch, department, year, semester, updates' },
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

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates must be a non-empty array' },
        { status: 400 }
      );
    }

    const collection = await getCollection('semester_result_sheets');

    // Find the result sheet
    const resultSheet = await collection.findOne({
      batch: batch.trim(),
      department: department.trim(),
      year_num: yearNum,
      semester: semesterNum
    });

    if (!resultSheet) {
      return NextResponse.json(
        { error: 'Result sheet not found' },
        { status: 404 }
      );
    }
    const bulkOps: any[] = [];
    let newStudentsCount = 0;
    let updatedStudentsCount = 0;
    const errors = [];

    for (const update of updates) {
      const { regNo, name, grades, status } = update;

      // Skip error entries
      if (status === 'error') {
        continue;
      }

      // Validate registration number and name
      if (!regNo || !name) {
        errors.push(`Missing registration number or name for update`);
        continue;
      }

      // Validate grades
      const validGrades: Record<string, string> = {};
      for (const [subject, grade] of Object.entries(grades)) {
        if (grade && typeof grade === 'string' && grade !== 'NONE') {
          if (!isValidGrade(grade)) {
            errors.push(`Invalid grade "${grade}" for ${regNo} in subject ${subject}`);
            continue;
          }
          validGrades[subject] = grade;
        }
      }

      // Find existing student in the result sheet
      const existingStudentIndex = resultSheet.result_data.findIndex(
        (student: any) => student.stu_reg_no === regNo
      );

      if (existingStudentIndex >= 0) {
        // Update existing student
        const updateFields: Record<string, any> = {};
        
        // Update name if different
        if (name !== resultSheet.result_data[existingStudentIndex].stu_name) {
          updateFields[`result_data.${existingStudentIndex}.stu_name`] = name;
        }

        // Update grades
        for (const [subject, grade] of Object.entries(validGrades)) {
          updateFields[`result_data.${existingStudentIndex}.res_data.${subject}`] = grade;
        }

        if (Object.keys(updateFields).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: {
                batch: batch.trim(),
                department: department.trim(),
                year_num: yearNum,
                semester: semesterNum
              },
              update: { $set: updateFields }
            }
          });
          updatedStudentsCount++;
        }
      } else {
        // Add new student
        const newStudent = {
          stu_reg_no: regNo,
          stu_name: name,
          res_data: validGrades
        };

        bulkOps.push({
          updateOne: {
            filter: {
              batch: batch.trim(),
              department: department.trim(),
              year_num: yearNum,
              semester: semesterNum
            },
            update: { $push: { result_data: newStudent } }
          }
        });
        newStudentsCount++;
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation errors', details: errors },
        { status: 400 }
      );
    }

    if (bulkOps.length === 0) {
      return NextResponse.json(
        { message: 'No valid updates to apply', newStudents: 0, updatedStudents: 0 }
      );
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
      await collection.bulkWrite(bulkOps);
    }

    // Update the last_updated timestamp
    await collection.updateOne(
      {
        batch: batch.trim(),
        department: department.trim(),
        year_num: yearNum,
        semester: semesterNum
      },
      {
        $set: { last_updated: new Date() }
      }
    );

    return NextResponse.json({
      message: 'Bulk update completed successfully',
      newStudents: newStudentsCount,
      updatedStudents: updatedStudentsCount,
      totalOperations: bulkOps.length
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Internal server error during bulk update' },
      { status: 500 }
    );
  }
}
