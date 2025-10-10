'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, TrendingUp, Users, Award, AlertTriangle, FileSpreadsheet, BarChart3, GraduationCap, Trophy, Loader2 } from 'lucide-react';
import { useSubjectCredits, calculateGPA, getSemesterStatus } from '@/hooks/useSubjectCredits';
import * as XLSX from 'xlsx';

interface CGPAAnalysisProps {
  filters: {
    batch: string;
    department: string;
    year: string;
    semester: string;
  };
}

interface StudentCGPAData {
  regNo: string;
  name: string;
  department: string;
  batch: string;
  semesterResults: Array<{
    semester: number;
    year: string;
    gpa: number;
    grades: Record<string, string>;
  }>;
  overallCGPA: number;
  totalSemesters: number;
  status: string;
  rank: number;
}

export default function CGPAAnalysis({ filters }: CGPAAnalysisProps) {
  const [cgpaData, setCgpaData] = useState<StudentCGPAData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: subjectCredits } = useSubjectCredits();

  useEffect(() => {
    if (filters.batch && subjectCredits && Object.keys(subjectCredits).length > 0) {
      fetchCGPAData();
    }
  }, [filters.batch, subjectCredits]);

  const fetchCGPAData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/cgpa-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch: filters.batch,
          department: filters.department, // Remove default, let API handle all departments
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CGPA data');
      }

      const data = await response.json();
      
      // Calculate CGPA for each student
      const studentsWithCGPA = data.students.map((student: any) => {
        const semesterResults = student.allSemesters.map((semester: any) => {
          const gpa = calculateGPA(semester.res_data, subjectCredits);
          
          return {
            semester: semester.semester,
            year: semester.year,
            gpa,
            grades: semester.res_data
          };
        });

        // Calculate overall CGPA (average of all semester GPAs, excluding zero GPAs)
        const validGPAs = semesterResults.filter((s: any) => s.gpa > 0);
        
        const overallCGPA = validGPAs.length > 0 
          ? Math.round((validGPAs.reduce((sum: number, s: any) => sum + s.gpa, 0) / validGPAs.length) * 100) / 100
          : 0;


        return {
          regNo: student.regNo,
          name: student.name,
          department: student.department,
          batch: student.batch,
          semesterResults,
          overallCGPA,
          totalSemesters: semesterResults.length,
          status: getSemesterStatus(overallCGPA).status,
          rank: 0 // Will be set after sorting
        };
      });

      // Sort by CGPA and assign ranks
      studentsWithCGPA.sort((a: any, b: any) => b.overallCGPA - a.overallCGPA);
      studentsWithCGPA.forEach((student: any, index: number) => {
        student.rank = index + 1;
      });

      setCgpaData(studentsWithCGPA);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch CGPA data');
    } finally {
      setLoading(false);
    }
  };

  const getCGPAStatus = (cgpa: number) => {
    if (cgpa >= 9.0) return { status: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (cgpa >= 8.0) return { status: 'Very Good', color: 'bg-blue-100 text-blue-800' };
    if (cgpa >= 7.0) return { status: 'Good', color: 'bg-blue-50 text-blue-700' };
    if (cgpa >= 6.0) return { status: 'Average', color: 'bg-yellow-100 text-yellow-800' };
    if (cgpa >= 5.0) return { status: 'Below Average', color: 'bg-orange-100 text-orange-800' };
    return { status: 'Poor', color: 'bg-red-100 text-red-800' };
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'Excellent': 'bg-green-100 text-green-800',
      'Very Good': 'bg-blue-100 text-blue-800',
      'Good': 'bg-blue-50 text-blue-700',
      'Average': 'bg-yellow-100 text-yellow-800',
      'Below Average': 'bg-orange-100 text-orange-800',
      'Poor': 'bg-red-100 text-red-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const exportToExcel = () => {
    if (!cgpaData || cgpaData.length === 0) return;

    const workbook = XLSX.utils.book_new();
    
    // Overview Sheet
    const overviewData = [
      ['CGPA Analysis Report'],
      [''],
      ['Batch:', filters.batch],
      ['Department:', filters.department || 'All Departments'],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Students', cgpaData.length],
      ['Average CGPA', (cgpaData.reduce((sum, student) => sum + student.overallCGPA, 0) / cgpaData.length).toFixed(2)],
      ['Highest CGPA', Math.max(...cgpaData.map(s => s.overallCGPA)).toFixed(2)],
      ['Lowest CGPA', Math.min(...cgpaData.map(s => s.overallCGPA)).toFixed(2)],
      [''],
      ['CGPA Distribution'],
      ['Excellent (9.0+)', cgpaData.filter(s => s.overallCGPA >= 9.0).length],
      ['Very Good (8.0-8.9)', cgpaData.filter(s => s.overallCGPA >= 8.0 && s.overallCGPA < 9.0).length],
      ['Good (7.0-7.9)', cgpaData.filter(s => s.overallCGPA >= 7.0 && s.overallCGPA < 8.0).length],
      ['Average (6.0-6.9)', cgpaData.filter(s => s.overallCGPA >= 6.0 && s.overallCGPA < 7.0).length],
      ['Below Average (5.0-5.9)', cgpaData.filter(s => s.overallCGPA >= 5.0 && s.overallCGPA < 6.0).length],
      ['Poor (<5.0)', cgpaData.filter(s => s.overallCGPA < 5.0).length]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Student CGPA Details Sheet
    const studentHeaders = ['Rank', 'Reg No', 'Name', 'CGPA', 'Status', 'Total Semesters'];
    const studentData = [
      studentHeaders,
      ...cgpaData.map((student, index) => [
        index + 1,
        student.regNo,
        student.name,
        student.overallCGPA,
        getCGPAStatus(student.overallCGPA).status,
        student.totalSemesters
      ])
    ];

    const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
    XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student CGPA');

    // Semester-wise Details Sheet
    const semesterHeaders = ['Reg No', 'Name', 'Semester', 'GPA', 'Status'];
    const semesterData = [semesterHeaders];
    
    cgpaData.forEach(student => {
      student.semesterResults.forEach(semester => {
        semesterData.push([
          student.regNo,
          student.name,
          `Semester ${semester.semester}`,
          semester.gpa.toString(),
          getSemesterStatus(semester.gpa).status
        ]);
      });
    });

    const semesterSheet = XLSX.utils.aoa_to_sheet(semesterData);
    XLSX.utils.book_append_sheet(workbook, semesterSheet, 'Semester Details');

    // Export file
    const fileName = `CGPA_Analysis_${filters.batch}_${filters.department || 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank <= 3) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (rank <= 10) return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-muted-foreground">Loading CGPA data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <p className="text-red-600 mb-2">Error loading CGPA data</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchCGPAData} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (cgpaData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="mb-2">No CGPA data available</p>
        <p className="text-sm">Select batch to view student CGPA analysis</p>
      </div>
    );
  }

  const averageCGPA = cgpaData.length > 0 
    ? Math.round((cgpaData.reduce((sum, s) => sum + s.overallCGPA, 0) / cgpaData.length) * 100) / 100
    : 0;

  const topPerformers = cgpaData.slice(0, 5);
  const excellentStudents = cgpaData.filter(s => s.overallCGPA >= 9).length;
  const goodStudents = cgpaData.filter(s => s.overallCGPA >= 7 && s.overallCGPA < 9).length;

  return (
    <div className="space-y-6">
      {/* CGPA Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Average CGPA</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{averageCGPA}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Excellent (≥9.0)</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{excellentStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Good (7.0-8.9)</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{goodStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Total Students</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{cgpaData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Top 5 Performers by CGPA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.map((student, index) => (
              <div key={student.regNo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={getRankBadgeColor(student.rank)}>
                    #{student.rank}
                  </Badge>
                  <div>
                    <div className="font-medium">{student.name}</div>
                    <div className="text-sm text-muted-foreground">{student.regNo}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">{student.overallCGPA}</div>
                  <Badge className={getStatusColor(student.status)}>
                    {student.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Complete CGPA List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              CGPA Analysis
            </div>
            <Button
              onClick={exportToExcel}
              disabled={!cgpaData || cgpaData.length === 0}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </CardTitle>
        </CardHeader>
        <p className="text-sm text-muted-foreground">
            Individual student CGPA calculated across all semesters
          </p>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Rank</th>
                  <th className="text-left p-3 font-medium">Student</th>
                  <th className="text-left p-3 font-medium">CGPA</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Semesters</th>
                </tr>
              </thead>
              <tbody>
                {cgpaData.map((student) => (
                  <tr key={student.regNo} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Badge variant="outline" className={getRankBadgeColor(student.rank)}>
                        #{student.rank}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.regNo}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-lg font-bold text-blue-600">{student.overallCGPA}</div>
                    </td>
                    <td className="p-3">
                      <Badge className={getStatusColor(student.status)}>
                        {student.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{student.totalSemesters} semesters</div>
                        <div className="text-muted-foreground">
                          {student.semesterResults.filter(s => s.gpa > 0).length} with grades
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
