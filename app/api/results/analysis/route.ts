import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
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

    // Validate required parameters
    if (!batch || !department || !year || !semester) {
      return NextResponse.json(
        { error: 'Missing required parameters: batch, department, year, semester' },
        { status: 400 }
      );
    }

    const yearNum = parseInt(year);
    const semesterNum = parseInt(semester);
    
    if (isNaN(yearNum) || isNaN(semesterNum)) {
      return NextResponse.json(
        { error: 'Year and semester must be valid numbers' },
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

    // Sort students by registration number (ascending)
    const sortedStudents = resultSheet.result_data.sort((a: any, b: any) => 
      a.stu_reg_no.localeCompare(b.stu_reg_no)
    );

    // Analyze the data
    const analysis = analyzeResults(sortedStudents);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during analysis' },
      { status: 500 }
    );
  }
}

function analyzeResults(students: any[]) {
  const totalStudents = students.length;
  const gradeDistribution: Record<string, number> = {};
  const subjectWiseAnalysis: Record<string, any> = {};
  const topPerformers: any[] = [];
  const needsAttention: any[] = [];

  // Get all subjects
  const allSubjects = students.length > 0 ? Object.keys(students[0].res_data).sort() : [];
  const totalSubjects = allSubjects.length;

  // Initialize subject-wise analysis
  allSubjects.forEach(subject => {
    subjectWiseAnalysis[subject] = {
      totalStudents: 0,
      passCount: 0,
      failCount: 0,
      gradeDistribution: {}
    };
  });

  let passedStudents = 0;

  // Analyze each student
  students.forEach(student => {
    let studentPassed = true;
    let excellentGrades = 0;
    let totalGrades = 0;
    const failedSubjects: string[] = [];

    allSubjects.forEach(subject => {
      const grade = student.res_data[subject];
      
      if (grade) {
        totalGrades++;
        
        // Overall grade distribution
        gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
        
        // Subject-wise analysis
        subjectWiseAnalysis[subject].totalStudents++;
        subjectWiseAnalysis[subject].gradeDistribution[grade] = 
          (subjectWiseAnalysis[subject].gradeDistribution[grade] || 0) + 1;

        // Check if failed
        if (grade === 'U' || grade === 'RA' || grade === 'UA') {
          studentPassed = false;
          subjectWiseAnalysis[subject].failCount++;
          failedSubjects.push(subject);
        } else {
          subjectWiseAnalysis[subject].passCount++;
        }

        // Count excellent grades (O, A+, A)
        if (grade === 'O' || grade === 'A+' || grade === 'A') {
          excellentGrades++;
        }
      }
    });

    if (studentPassed) {
      passedStudents++;
    }

    // Add to top performers if has excellent grades
    if (excellentGrades > 0) {
      topPerformers.push({
        regNo: student.stu_reg_no,
        name: student.stu_name,
        totalGrades,
        excellentGrades
      });
    }

    // Add to needs attention if has failed subjects
    if (failedSubjects.length > 0) {
      needsAttention.push({
        regNo: student.stu_reg_no,
        name: student.stu_name,
        failedSubjects
      });
    }
  });

  // Sort top performers by excellent grade ratio
  topPerformers.sort((a, b) => {
    const ratioA = a.excellentGrades / a.totalGrades;
    const ratioB = b.excellentGrades / b.totalGrades;
    return ratioB - ratioA;
  });

  // Sort needs attention by number of failed subjects (descending)
  needsAttention.sort((a, b) => b.failedSubjects.length - a.failedSubjects.length);

  const passPercentage = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;

  return {
    totalStudents,
    totalSubjects,
    passPercentage,
    gradeDistribution,
    subjectWiseAnalysis,
    topPerformers,
    needsAttention
  };
}
