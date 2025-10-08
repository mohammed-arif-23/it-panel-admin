import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rate-limiter';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
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
    const { batch, department, year, semester, exportOptions } = body;

    // Validate required parameters
    if (!batch || !department || !year || !semester || !exportOptions) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    const { format, selectedStudents, selectedSubjects, includeStats, includeHeader, sortBy, groupBy } = exportOptions;

    // Filter data based on selections
    let filteredData = resultSheet.result_data;
    
    if (selectedStudents && selectedStudents.length > 0) {
      filteredData = filteredData.filter((student: any) => 
        selectedStudents.includes(student.stu_reg_no)
      );
    }

    // Sort students by name or registration number (default: registration number ascending)
    filteredData.sort((a: any, b: any) => {
      if (sortBy === 'name') {
        return a.stu_name.localeCompare(b.stu_name);
      } else {
        return a.stu_reg_no.localeCompare(b.stu_reg_no);
      }
    });

    // Get subject codes
    const allSubjects = filteredData.length > 0 ? Object.keys(filteredData[0].res_data).sort() : [];
    const subjectsToExport = selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : allSubjects;

    if (format === 'csv') {
      return exportAsCSV(filteredData, subjectsToExport, resultSheet, includeHeader);
    } else if (format === 'excel') {
      return exportAsExcel(filteredData, subjectsToExport, resultSheet, includeHeader, includeStats);
    } else if (format === 'json') {
      return exportAsJSON(filteredData, subjectsToExport, resultSheet, includeHeader);
    } else {
      return NextResponse.json(
        { error: 'Unsupported export format' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Internal server error during export' },
      { status: 500 }
    );
  }
}

function exportAsCSV(data: any[], subjects: string[], resultSheet: any, includeHeader: boolean) {
  const rows = [];
  
  if (includeHeader) {
    rows.push([`${resultSheet.department} - ${resultSheet.batch}`]);
    rows.push([`Year ${resultSheet.year_num}, Semester ${resultSheet.semester} - ${resultSheet.exam_cycle}`]);
    rows.push([]);
  }

  // Headers
  const headers = ['Reg_No', 'Student_Name', ...subjects];
  rows.push(headers);

  // Data rows
  data.forEach((student: any) => {
    const row = [
      student.stu_reg_no,
      student.stu_name,
      ...subjects.map(subject => student.res_data[subject] || '')
    ];
    rows.push(row);
  });

  const csvContent = rows.map(row => row.join(',')).join('\n');
  
  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="results_${resultSheet.batch}_${resultSheet.department}.csv"`
    }
  });
}

function exportAsExcel(data: any[], subjects: string[], resultSheet: any, includeHeader: boolean, includeStats: boolean) {
  const workbook = XLSX.utils.book_new();
  
  // Main data sheet
  const worksheetData = [];
  
  if (includeHeader) {
    worksheetData.push([`${resultSheet.department} - ${resultSheet.batch}`]);
    worksheetData.push([`Year ${resultSheet.year_num}, Semester ${resultSheet.semester} - ${resultSheet.exam_cycle}`]);
    worksheetData.push([]);
  }

  // Headers
  const headers = ['Reg_No', 'Student_Name', ...subjects];
  worksheetData.push(headers);

  // Data rows
  data.forEach((student: any) => {
    const row = [
      student.stu_reg_no,
      student.stu_name,
      ...subjects.map(subject => student.res_data[subject] || '')
    ];
    worksheetData.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');

  // Statistics sheet
  if (includeStats) {
    const statsData = [];
    statsData.push(['Statistics Summary']);
    statsData.push([]);
    statsData.push(['Total Students', data.length]);
    statsData.push(['Total Subjects', subjects.length]);
    
    // Grade distribution
    const gradeCount: Record<string, number> = {};
    let passedStudents = 0;
    
    data.forEach((student: any) => {
      let studentPassed = true;
      subjects.forEach(subject => {
        const grade = student.res_data[subject];
        if (grade) {
          gradeCount[grade] = (gradeCount[grade] || 0) + 1;
          if (grade === 'U' || grade === 'RA' || grade === 'UA') {
            studentPassed = false;
          }
        }
      });
      if (studentPassed) passedStudents++;
    });

    statsData.push([]);
    statsData.push(['Pass Percentage', `${Math.round((passedStudents / data.length) * 100)}%`]);
    statsData.push([]);
    statsData.push(['Grade Distribution']);
    
    Object.entries(gradeCount).forEach(([grade, count]) => {
      statsData.push([grade, count]);
    });

    const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Statistics');
  }

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return new NextResponse(excelBuffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="results_${resultSheet.batch}_${resultSheet.department}.xlsx"`
    }
  });
}

function exportAsJSON(data: any[], subjects: string[], resultSheet: any, includeHeader: boolean) {
  const exportData = {
    ...(includeHeader && {
      metadata: {
        department: resultSheet.department,
        batch: resultSheet.batch,
        year: resultSheet.year_num,
        semester: resultSheet.semester,
        exam_cycle: resultSheet.exam_cycle,
        exported_at: new Date().toISOString()
      }
    }),
    subjects,
    students: data.map((student: any) => ({
      registration_number: student.stu_reg_no,
      name: student.stu_name,
      grades: subjects.reduce((acc: any, subject: string) => {
        acc[subject] = student.res_data[subject] || null;
        return acc;
      }, {})
    }))
  };

  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="results_${resultSheet.batch}_${resultSheet.department}.json"`
    }
  });
}
