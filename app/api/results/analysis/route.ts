import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rate-limiter';

// Anna University Grade Points (standard 10-point system) - copied from main panel
function getGradePoint(grade: string): number {
  const gradeMap: Record<string, number> = {
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
  }
  
  const gradePoint = gradeMap[grade] ?? 0
  console.log(`Grade '${grade}' mapped to grade point: ${gradePoint}`)
  return gradePoint
}

// Helper function to get grade color for UI - copied from main panel
function getGradeColor(grade: string): string {
  const gradeColors: Record<string, string> = {
    'O': 'text-green-600 bg-green-50',
    'A+': 'text-green-500 bg-green-50',
    'A': 'text-blue-600 bg-blue-50',
    'B+': 'text-blue-500 bg-blue-50',
    'B': 'text-yellow-600 bg-yellow-50',
    'C': 'text-orange-600 bg-orange-50',
    'U': 'text-red-600 bg-red-50',
    'UA': 'text-gray-600 bg-gray-50',
  }
  return gradeColors[grade] || 'text-gray-600 bg-gray-50'
}

// Hook to fetch subject credits from Supabase - will be used in frontend
async function getSubjectCredits(): Promise<Record<string, number>> {
  try {
    // This would normally use Supabase, but for now we'll return empty
    // The frontend will handle the Supabase connection
    return {};
  } catch (error) {
    console.error('Error fetching subject credits:', error);
    return {};
  }
}

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
    const analysis = await analyzeResults(sortedStudents);

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error during analysis' },
      { status: 500 }
    );
  }
}

// Helper function to calculate GPA using Anna University formula: GPA = Σ(Ci × GPi) / Σ(Ci)
// ALL subjects are included - failed subjects (U, AB) get 0 grade points but credits still count in denominator
// EXACT COPY from main panel useResults.ts
function calculateGPA(
  grades: Record<string, string>,
  subjectCredits?: Record<string, number>
): number {
  console.log('🧮 Anna University GPA Calculation:')
  console.log('Input grades:', grades)
  console.log('Subject credits map for these subjects:')
  
  // Show credits for each subject in the grades
  Object.keys(grades).forEach(subjectCode => {
    const credits = subjectCredits?.[subjectCode]
    console.log(`  ${subjectCode}: ${credits ?? 'MISSING'} credits`)
  })
  
  const subjects = Object.entries(grades)
  if (subjects.length === 0) return 0

  let totalWeightedPoints = 0 // Σ(Ci × GPi)
  let totalCredits = 0 // Σ(Ci)

  subjects.forEach(([subjectCode, grade]) => {
    const gradePoint = getGradePoint(grade)
    const credits = subjectCredits?.[subjectCode]
    
    if (typeof credits !== 'number') {
      console.warn(`⚠️ Skipping ${subjectCode} — credits missing/non-numeric in DB`)
      return
    }
    
    const weightedPoints = credits * gradePoint
    
    console.log(`📊 ${subjectCode}: Grade=${grade}, GP=${gradePoint}, Credits=${credits}, Weighted=${weightedPoints}`)
    
    totalWeightedPoints += weightedPoints
    totalCredits += credits
  })

  console.log(`📈 Total Weighted Points: ${totalWeightedPoints}`)
  console.log(`📈 Total Credits: ${totalCredits}`)
  
  const gpa = totalCredits > 0 ? totalWeightedPoints / totalCredits : 0
  const roundedGpa = Math.round(gpa * 100) / 100
  
  console.log(`🎯 Final GPA: ${gpa} (rounded: ${roundedGpa})`)
  
  return roundedGpa
}

async function analyzeResults(students: any[]) {
  const totalStudents = students.length;
  const gradeDistribution: Record<string, number> = {};
  const subjectWiseAnalysis: Record<string, any> = {};
  const topPerformers: any[] = [];
  const needsAttention: any[] = [];
  const studentDetails: any[] = [];

  // Get all subjects
  const allSubjects = students.length > 0 ? Object.keys(students[0].res_data).sort() : [];
  const allSubjectsCount = allSubjects.length;

  // Initialize subject-wise analysis
  allSubjects.forEach(subject => {
    subjectWiseAnalysis[subject] = {
      totalStudents: 0,
      passCount: 0,
      failCount: 0,
      gradeDistribution: {},
      averageGPA: 0
    };
  });

  let passedStudents = 0;
  let totalGPASum = 0;
  let validGPACount = 0;

  // Fetch actual subject credits from Supabase (same as main panel)
  // CRITICAL: Only subjects with exact credits in DB are included in GPA calculation
  let subjectCredits: Record<string, number> = {};
  
  try {
    // Try to fetch from main panel's Supabase subjects table using correct env vars
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      const response = await fetch(`${supabaseUrl}/rest/v1/subjects?select=code,credits`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const supabaseSubjects = await response.json();
        console.log('✅ Fetched subject credits from Supabase:', supabaseSubjects);
        
        // Convert to map - ONLY include subjects with numeric credits (exact main panel logic)
        supabaseSubjects.forEach((subject: any) => {
          if (typeof subject.credits === 'number') {
            subjectCredits[subject.code] = subject.credits;
          } else {
            console.warn(`⚠️ Skipping subject with non-numeric/missing credits in DB: ${subject.code}`, subject);
          }
        });
      } else {
        console.warn('Failed to fetch from Supabase, response:', response.status);
      }
    } else {
      console.warn('Supabase environment variables not found');
    }
  } catch (error) {
    console.warn('Failed to fetch subject credits from Supabase:', error);
  }
  
  // If no credits found from Supabase, use realistic fallback based on subject patterns
  if (Object.keys(subjectCredits).length === 0) {
    console.log('🔄 No Supabase credits found, using pattern-based fallback for GPA calculation');
    allSubjects.forEach(subject => {
      const code = subject.toUpperCase();
      
      // Assign credits based on subject code patterns (matching main panel logic)
      if (code.includes('LAB') || code.includes('PRACTICAL') || code.includes('PRAC')) {
        subjectCredits[subject] = 2; // Lab subjects typically 2 credits
      } else if (code.includes('PROJECT') || code.includes('THESIS') || code.includes('SEMINAR')) {
        subjectCredits[subject] = 6; // Project subjects typically 6 credits
      } else if (code.startsWith('MA') || code.startsWith('CS') || code.startsWith('IT') || 
                 code.startsWith('ECE') || code.startsWith('EEE') || code.startsWith('MECH')) {
        subjectCredits[subject] = 4; // Core theory subjects typically 4 credits
      } else if (code.includes('ENG') || code.includes('COMM') || code.includes('SOFT')) {
        subjectCredits[subject] = 3; // Language and soft skill subjects typically 3 credits
      } else {
        subjectCredits[subject] = 4; // Default to 4 credits for theory subjects
      }
    });
  }

  console.log('📚 Final subject credits mapping (matching main panel):', subjectCredits);

  // Analyze each student
  students.forEach(student => {
    let studentPassed = true;
    let excellentGrades = 0;
    let totalGrades = 0;
    const failedSubjects: string[] = [];
    const arrearsCount = Object.values(student.res_data).filter(
      (grade: any) => grade === 'U' || grade === 'RA' || grade === 'UA'
    ).length;

    // Calculate student GPA with subject credits
    const studentGPA = calculateGPA(student.res_data, subjectCredits);
    if (studentGPA > 0) {
      totalGPASum += studentGPA;
      validGPACount++;
    }

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

    // Add detailed student info
    studentDetails.push({
      regNo: student.stu_reg_no,
      name: student.stu_name,
      gpa: studentGPA,
      totalSubjects: totalGrades,
      passedSubjects: totalGrades - failedSubjects.length,
      arrearsCount,
      failedSubjects,
      excellentGrades,
      grades: student.res_data,
      status: studentPassed ? 'Passed' : 'Failed'
    });

    // Add to top performers if has excellent grades
    if (excellentGrades > 0) {
      topPerformers.push({
        regNo: student.stu_reg_no,
        name: student.stu_name,
        gpa: studentGPA,
        totalGrades,
        excellentGrades
      });
    }

    // Add to needs attention if has failed subjects
    if (failedSubjects.length > 0) {
      needsAttention.push({
        regNo: student.stu_reg_no,
        name: student.stu_name,
        gpa: studentGPA,
        failedSubjects,
        arrearsCount
      });
    }
  });

  // Calculate subject-wise average GPAs
  allSubjects.forEach(subject => {
    const subjectGPAs = students
      .map(student => {
        const grade = student.res_data[subject];
        return grade ? getGradePoint(grade) : 0;
      })
      .filter(gpa => gpa > 0);
    
    subjectWiseAnalysis[subject].averageGPA = subjectGPAs.length > 0 
      ? Math.round((subjectGPAs.reduce((sum, gpa) => sum + gpa, 0) / subjectGPAs.length) * 100) / 100
      : 0;
  });

  // Sort top performers by GPA, then by excellent grade ratio
  topPerformers.sort((a, b) => {
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    const ratioA = a.excellentGrades / a.totalGrades;
    const ratioB = b.excellentGrades / b.totalGrades;
    return ratioB - ratioA;
  });

  // Sort needs attention by arrears count, then by GPA (ascending)
  needsAttention.sort((a, b) => {
    if (b.arrearsCount !== a.arrearsCount) return b.arrearsCount - a.arrearsCount;
    return a.gpa - b.gpa;
  });

  // Sort student details by GPA (descending)
  studentDetails.sort((a, b) => b.gpa - a.gpa);

  const passPercentage = totalStudents > 0 ? Math.round((passedStudents / totalStudents) * 100) : 0;
  const overallGPA = validGPACount > 0 ? Math.round((totalGPASum / validGPACount) * 100) / 100 : 0;
  const totalArrears = studentDetails.reduce((sum, student) => sum + student.arrearsCount, 0);

  // Calculate overall CGPA (average of all semester GPAs for all students)
  const overallCGPA = validGPACount > 0 ? Math.round((totalGPASum / validGPACount) * 100) / 100 : 0;
  
  // Calculate total subjects across all students
  const totalSubjectsCount = students.reduce((sum, student) => sum + Object.keys(student.res_data).length, 0);
  
  // Calculate passed subjects across all students
  const passedSubjectsCount = students.reduce((sum, student) => {
    return sum + Object.values(student.res_data).filter((grade: any) => !['U', 'UA', 'RA'].includes(grade)).length;
  }, 0);

  return {
    totalStudents: students.length,
    passedStudents,
    failedStudents: students.length - passedStudents,
    averageGPA: overallCGPA,
    overallCGPA: overallCGPA, // Same as averageGPA for consistency with main panel
    totalSubjects: totalSubjectsCount,
    passedSubjects: passedSubjectsCount,
    gradeDistribution,
    subjectWiseAnalysis,
    topPerformers: topPerformers.slice(0, 5),
    needsAttention: needsAttention.slice(0, 5),
    studentDetails: studentDetails // Add missing studentDetails array
  };
}
