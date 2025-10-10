import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rate-limiter';

// Grade point mapping for GPA calculation (Anna University system)
const GRADE_POINTS: Record<string, number> = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'D': 4,
  'U': 0,
  'AB': 0,
  'UA': 0,
  'RA': 0,
  'SA': 0,
  'W': 0,
  'WD': 0
};

const DEFAULT_CREDITS = 3;

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
    const registerNumber = searchParams.get('register_number');

    // Validate required parameters
    if (!batch || !department) {
      return NextResponse.json(
        { error: 'Missing required parameters: batch, department' },
        { status: 400 }
      );
    }

    const collection = await getCollection('semester_result_sheets');

    // Build query
    const query: any = {
      batch: batch.trim(),
      department: department.trim()
    };

    if (registerNumber) {
      query['result_data.stu_reg_no'] = registerNumber.trim();
    }

    // Find all result sheets for the batch and department
    const resultSheets = await collection.find(query).sort({ year_num: 1, semester: 1 }).toArray();

    if (resultSheets.length === 0) {
      return NextResponse.json(
        { error: 'No result sheets found' },
        { status: 404 }
      );
    }

    // Analyze comprehensive data
    const analysis = analyzeComprehensiveResults(resultSheets);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Comprehensive analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during analysis' },
      { status: 500 }
    );
  }
}

function calculateGPA(grades: Record<string, string>, subjectCredits?: Record<string, number>): number {
  const subjects = Object.entries(grades);
  if (subjects.length === 0) return 0;

  let totalWeightedPoints = 0;
  let totalCredits = 0;

  subjects.forEach(([subjectCode, grade]) => {
    const gradePoint = GRADE_POINTS[grade] || 0;
    const credits = subjectCredits?.[subjectCode] || DEFAULT_CREDITS;
    
    totalWeightedPoints += credits * gradePoint;
    totalCredits += credits;
  });

  return totalCredits > 0 ? Math.round((totalWeightedPoints / totalCredits) * 100) / 100 : 0;
}

function analyzeComprehensiveResults(resultSheets: any[]) {
  // Group by student
  const studentMap = new Map<string, any>();
  
  resultSheets.forEach(sheet => {
    sheet.result_data.forEach((student: any) => {
      const regNo = student.stu_reg_no;
      
      if (!studentMap.has(regNo)) {
        studentMap.set(regNo, {
          regNo,
          name: student.stu_name,
          semesters: [],
          totalCredits: 0,
          totalWeightedPoints: 0,
          totalArrears: 0,
          overallStatus: 'Passed'
        });
      }
      
      const studentData = studentMap.get(regNo);
      const semesterGPA = calculateGPA(student.res_data);
      const arrears = Object.values(student.res_data).filter(
        (grade: any) => grade === 'U' || grade === 'RA' || grade === 'UA'
      ).length;
      
      studentData.semesters.push({
        year: sheet.year_num,
        semester: sheet.semester,
        gpa: semesterGPA,
        grades: student.res_data,
        arrears,
        subjects: Object.keys(student.res_data).length
      });
      
      studentData.totalArrears += arrears;
      if (arrears > 0) {
        studentData.overallStatus = 'Has Arrears';
      }
      
      // Calculate weighted points for CGPA
      Object.entries(student.res_data).forEach(([subject, grade]) => {
        const gradePoint = GRADE_POINTS[grade as string] || 0;
        const credits = DEFAULT_CREDITS;
        studentData.totalWeightedPoints += gradePoint * credits;
        studentData.totalCredits += credits;
      });
    });
  });

  // Calculate CGPA and final analysis
  const students = Array.from(studentMap.values()).map(student => {
    const cgpa = student.totalCredits > 0 
      ? Math.round((student.totalWeightedPoints / student.totalCredits) * 100) / 100 
      : 0;
    
    return {
      ...student,
      cgpa,
      totalSemesters: student.semesters.length,
      averageGPA: student.semesters.length > 0 
        ? Math.round((student.semesters.reduce((sum: number, sem: any) => sum + sem.gpa, 0) / student.semesters.length) * 100) / 100
        : 0
    };
  });

  // Sort by CGPA descending
  students.sort((a, b) => b.cgpa - a.cgpa);

  // Overall statistics
  const totalStudents = students.length;
  const studentsWithArrears = students.filter(s => s.totalArrears > 0).length;
  const passedStudents = students.filter(s => s.overallStatus === 'Passed').length;
  const averageCGPA = students.length > 0 
    ? Math.round((students.reduce((sum, s) => sum + s.cgpa, 0) / students.length) * 100) / 100 
    : 0;

  // Performance categories
  const excellent = students.filter(s => s.cgpa >= 9).length;
  const veryGood = students.filter(s => s.cgpa >= 8 && s.cgpa < 9).length;
  const good = students.filter(s => s.cgpa >= 7 && s.cgpa < 8).length;
  const average = students.filter(s => s.cgpa >= 6 && s.cgpa < 7).length;
  const belowAverage = students.filter(s => s.cgpa < 6).length;

  // Semester-wise analysis
  const semesterAnalysis = resultSheets.map(sheet => ({
    year: sheet.year_num,
    semester: sheet.semester,
    totalStudents: sheet.result_data.length,
    averageGPA: sheet.result_data.length > 0 
      ? Math.round((sheet.result_data.reduce((sum: number, student: any) => 
          sum + calculateGPA(student.res_data), 0) / sheet.result_data.length) * 100) / 100
      : 0,
    passPercentage: sheet.result_data.length > 0 
      ? Math.round((sheet.result_data.filter((student: any) => 
          !Object.values(student.res_data).some((grade: any) => 
            grade === 'U' || grade === 'RA' || grade === 'UA')).length / sheet.result_data.length) * 100)
      : 0
  }));

  return {
    overview: {
      totalStudents,
      passedStudents,
      studentsWithArrears,
      averageCGPA,
      totalSemesters: resultSheets.length,
      performanceDistribution: {
        excellent,
        veryGood,
        good,
        average,
        belowAverage
      }
    },
    students,
    semesterAnalysis,
    topPerformers: students.slice(0, 10),
    needsAttention: students.filter(s => s.totalArrears > 0).slice(0, 10)
  };
}
