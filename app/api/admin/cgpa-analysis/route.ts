import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

// Create a new client for each request to avoid connection issues
export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;
  
  try {
    const { batch, department } = await request.json();

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch is required' },
        { status: 400 }
      );
    }

    // Create new client instance for this request
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection('semester_result_sheets');



    // Query strategy: Start with batch only (as requested by user)
    let query: any = { batch: { $regex: new RegExp(batch, 'i') } };
    
    // Add department filter if provided
    if (department) {
      query.department = { $regex: new RegExp(department, 'i') };
    }

    let allResults = await collection.find(query).toArray();

    // If no results with case-insensitive, try exact match
    if (allResults.length === 0) {
      query = { batch: batch };
      if (department) {
        query.department = department;
      }
      allResults = await collection.find(query).toArray();
    }

    // If still no results, try any documents with similar batch pattern
    if (allResults.length === 0) {
      const batchYear = batch.split('-')[0]; // Extract year like "2023" from "2023-2027"
      allResults = await collection.find({
        batch: { $regex: new RegExp(batchYear, 'i') }
      }).toArray();
    }

    if (allResults.length === 0) {
      return NextResponse.json({
        students: [],
        message: 'No results found for the specified batch and department'
      });
    }

    // Group results by student
    const studentMap = new Map();

    allResults.forEach(result => {
      // Check if result has result_data array (matching working API structure)
      if (!result.result_data || !Array.isArray(result.result_data)) {
        return;
      }

      result.result_data.forEach((student: any) => {
        const regNo = student.stu_reg_no;
        
        if (!regNo) {
          return;
        }
        
        if (!studentMap.has(regNo)) {
          studentMap.set(regNo, {
            regNo: regNo,
            name: student.stu_name || 'Unknown',
            department: result.department,
            batch: result.batch,
            allSemesters: []
          });
        }

        studentMap.get(regNo).allSemesters.push({
          semester: result.semester,
          year: result.year,
          year_num: result.year_num,
          res_data: student.res_data || {},
          sheet_id: result._id
        });
      });
    });


    // Convert map to array and sort semesters for each student
    const students = Array.from(studentMap.values()).map(student => {
      // Sort semesters by year_num and semester
      student.allSemesters.sort((a: any, b: any) => {
        if (a.year_num !== b.year_num) {
          return a.year_num - b.year_num;
        }
        return a.semester - b.semester;
      });
      
      return student;
    });

    // Sort students by registration number
    students.sort((a, b) => a.regNo.localeCompare(b.regNo));

    return NextResponse.json({
      students: students,
      totalStudents: students.length,
      batchInfo: {
        batch: batch,
        department: department,
        totalSemesters: allResults.length > 0 ? Math.max(...allResults.map(r => r.semester)) : 0
      }
    });

  } catch (error) {
    console.error('Error in CGPA analysis API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}
