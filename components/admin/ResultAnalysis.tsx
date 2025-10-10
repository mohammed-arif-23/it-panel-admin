'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Users, BookOpen, Award, Calculator, Download, FileSpreadsheet, AlertTriangle, GraduationCap, Target, Star, Eye, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSubjectCredits, calculateGPA, getGradeColor, getSemesterStatus } from '@/hooks/useSubjectCredits';
import CGPAAnalysis from './CGPAAnalysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AnalysisData {
  totalStudents: number;
  totalSubjects: number;
  passedSubjects: number;
  passPercentage: number;
  passedStudents: number;
  failedStudents: number;
  averageGPA: number;
  overallCGPA: number;
  totalArrears: number;
  gradeDistribution: Record<string, number>;
  subjectWiseAnalysis: Record<string, {
    totalStudents: number;
    passCount: number;
    failCount: number;
    gradeDistribution: Record<string, number>;
    averageGPA: number;
  }>;
  topPerformers: Array<{
    regNo: string;
    name: string;
    gpa: number;
    totalGrades: number;
    excellentGrades: number;
  }>;
  needsAttention: Array<{
    regNo: string;
    name: string;
    gpa: number;
    failedSubjects: string[];
    arrearsCount: number;
  }>;
  studentDetails?: Array<{
    regNo: string;
    name: string;
    gpa: number;
    totalSubjects: number;
    passedSubjects: number;
    arrearsCount: number;
    failedSubjects: string[];
    excellentGrades: number;
    grades: Record<string, string>;
    status: string;
  }>;
}

interface ResultAnalysisProps {
  filters: {
    batch: string;
    department: string;
    year: string;
    semester: string;
  };
}

export default function ResultAnalysis({ filters }: ResultAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const { data: subjectCredits, isLoading: creditsLoading } = useSubjectCredits();

  const fetchAnalysis = async () => {
    if (!filters.batch || !filters.department || !filters.year || !filters.semester) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        batch: filters.batch,
        department: filters.department,
        year: filters.year,
        semester: filters.semester
      });

      const response = await fetch(`/api/results/analysis?${params}`);
      const data = await response.json();

      if (response.ok) {
        setAnalysisData(data);
      } else {
        setError(data.error || 'Failed to fetch analysis');
      }
    } catch (error) {
      setError('Failed to fetch analysis. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [filters.batch, filters.department, filters.year, filters.semester]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Analyzing results...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchAnalysis} className="mt-4">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysisData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Please select all filter options to view analysis</p>
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
            <Info className="h-4 w-4" />
            <span>Select Batch, Department, Year, and Semester from the filters above</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const subjects = Object.keys(analysisData.subjectWiseAnalysis);
  const currentSubjectData = selectedSubject === 'all' 
    ? null 
    : analysisData.subjectWiseAnalysis[selectedSubject];

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

  const getGradeColor = (grade: string) => {
    const gradeColors: Record<string, string> = {
      'O': 'text-green-600 bg-green-50',
      'A+': 'text-green-500 bg-green-50',
      'A': 'text-blue-600 bg-blue-50',
      'B+': 'text-blue-500 bg-blue-50',
      'B': 'text-yellow-600 bg-yellow-50',
      'C': 'text-orange-600 bg-orange-50',
      'U': 'text-red-600 bg-red-50',
      'UA': 'text-gray-600 bg-gray-50',
      'RA': 'text-red-500 bg-red-50',
    };
    return gradeColors[grade] || 'text-gray-600 bg-gray-50';
  };

  // Excel export function for result analysis
  const exportToExcel = () => {
    if (!analysisData) return;

    const workbook = XLSX.utils.book_new();
    
    // Overview Sheet
    const overviewData = [
      ['Result Analysis Report'],
      [''],
      ['Batch:', filters.batch],
      ['Department:', filters.department],
      ['Year:', filters.year],
      ['Semester:', filters.semester],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Statistics'],
      ['Total Students', analysisData.totalStudents],
      ['Total Subjects', analysisData.totalSubjects],
      ['Passed Subjects', analysisData.passedSubjects],
      ['Pass Percentage', `${analysisData.passPercentage}%`],
      ['Passed Students', analysisData.passedStudents],
      ['Failed Students', analysisData.failedStudents],
      ['Average GPA', analysisData.averageGPA],
      ['Overall CGPA', analysisData.overallCGPA || 'N/A'],
      [''],
      ['Grade Distribution'],
      ...Object.entries(analysisData.gradeDistribution || {}).map(([grade, count]) => [
        `Grade ${grade}`, count
      ])
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // Student Details Sheet
    if (analysisData.studentDetails && analysisData.studentDetails.length > 0) {
      const studentHeaders = ['Reg No', 'Name', 'GPA', 'Status', 'Passed Subjects', 'Failed Subjects'];
      const subjectCodes = Object.keys(analysisData.studentDetails[0]?.grades || {});
      const allHeaders = [...studentHeaders, ...subjectCodes];

      const studentData = [
        allHeaders,
        ...analysisData.studentDetails.map(student => [
          student.regNo,
          student.name,
          student.gpa,
          student.status,
          student.passedSubjects,
          student.failedSubjects,
          ...subjectCodes.map(code => student.grades[code] || '')
        ])
      ];

      const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
      XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student Details');
    }

    // Subject Analysis Sheet
    if (analysisData.subjectWiseAnalysis && Object.keys(analysisData.subjectWiseAnalysis).length > 0) {
      const subjectHeaders = ['Subject Code', 'Total Students', 'Passed', 'Failed', 'Pass Rate', 'Average Grade Points'];
      const subjectData = [
        subjectHeaders,
        ...Object.entries(analysisData.subjectWiseAnalysis).map(([subjectCode, subject]: [string, any]) => [
          subjectCode,
          subject.totalStudents,
          subject.passedStudents,
          subject.failedStudents,
          `${subject.passRate}%`,
          subject.averageGradePoints
        ])
      ];

      const subjectSheet = XLSX.utils.aoa_to_sheet(subjectData);
      XLSX.utils.book_append_sheet(workbook, subjectSheet, 'Subject Analysis');
    }

    // Export file
    const fileName = `Result_Analysis_${filters.batch}_${filters.department}_Y${filters.year}S${filters.semester}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Result Analysis Dashboard
            </div>
            <Button
              onClick={exportToExcel}
              disabled={!analysisData}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </CardTitle>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {filters.department === 'IT' ? 'Information Technology' :
               filters.department === 'CSE' ? 'Computer Science & Engineering' :
               filters.department === 'ECE' ? 'Electronics & Communication' :
               filters.department === 'EEE' ? 'Electrical & Electronics' :
               filters.department === 'MECH' ? 'Mechanical Engineering' :
               filters.department === 'CIVIL' ? 'Civil Engineering' : filters.department} - {filters.batch} | Year {filters.year}, Semester {filters.semester}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Generated on: {new Date().toLocaleDateString()}</span>
              <span>•</span>
              <span>Total Records: {analysisData.totalStudents}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall CGPA Panel - Matching Main Panel Design */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-blue-700">
            <GraduationCap className="h-6 w-6" />
            <span>Overall Academic Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">{analysisData.overallCGPA || analysisData.averageGPA}</div>
              <div className="text-sm text-blue-600">Overall CGPA</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{analysisData.totalStudents}</div>
              <div className="text-sm text-green-700">Total Students</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{analysisData.totalSubjects}</div>
              <div className="text-sm text-blue-700">Total Subjects</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-center mb-2">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{analysisData.passedSubjects}</div>
              <div className="text-sm text-purple-700">Passed Subjects</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Passed Students</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{analysisData.passedStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Failed Students</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {analysisData.failedStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Passed</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {analysisData.passedStudents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Arrears</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {analysisData.totalArrears}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview Analysis</TabsTrigger>
          <TabsTrigger value="cgpa">CGPA Analysis</TabsTrigger>
          <TabsTrigger value="students">Detailed Student Info</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Grade Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analysisData.gradeDistribution)
                  .sort(([a], [b]) => {
                    // Sort grades in order: O, A+, A, B+, B, C, U, RA, UA
                    const gradeOrder = ['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'UA'];
                    return gradeOrder.indexOf(a) - gradeOrder.indexOf(b);
                  })
                  .map(([grade, count]) => {
                    const totalGrades = analysisData.totalStudents * analysisData.totalSubjects;
                    const percentage = totalGrades > 0 ? Math.round((count / totalGrades) * 100) : 0;
                    return (
                      <div key={grade} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={grade === 'U' || grade === 'RA' || grade === 'UA' ? 'destructive' : 'secondary'}
                              className={grade === 'O' || grade === 'A+' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {grade}
                            </Badge>
                            <span className="text-sm">{count} occurrences</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Subject-wise Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Subject-wise Analysis</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Subjects Overview</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedSubject === 'all' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map(subject => {
                    const subjectData = analysisData.subjectWiseAnalysis[subject];
                    const passRate = subjectData.totalStudents > 0 ? Math.round((subjectData.passCount / subjectData.totalStudents) * 100) : 0;
                    return (
                      <Card key={subject} className="p-4">
                        <h4 className="font-semibold mb-2">{subject}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Pass Rate:</span>
                            <span className={passRate >= 70 ? 'text-green-600' : passRate >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                              {passRate}%
                            </span>
                          </div>
                          <Progress value={passRate} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Pass: {subjectData.passCount}</span>
                            <span>Fail: {subjectData.failCount}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avg GPA: {subjectData.averageGPA}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : currentSubjectData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">{currentSubjectData.passCount}</div>
                      <div className="text-sm text-muted-foreground">Passed</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded">
                      <div className="text-2xl font-bold text-red-600">{currentSubjectData.failCount}</div>
                      <div className="text-sm text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {currentSubjectData.totalStudents > 0 ? Math.round((currentSubjectData.passCount / currentSubjectData.totalStudents) * 100) : 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">Pass Rate</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded">
                      <div className="text-2xl font-bold text-purple-600">{currentSubjectData.averageGPA}</div>
                      <div className="text-sm text-muted-foreground">Avg GPA</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="font-medium">Grade Distribution for {selectedSubject}</h5>
                    {Object.entries(currentSubjectData.gradeDistribution).map(([grade, count]) => (
                      <div key={grade} className="flex justify-between items-center">
                        <Badge variant={grade === 'U' || grade === 'RA' || grade === 'UA' ? 'destructive' : 'secondary'}>
                          {grade}
                        </Badge>
                        <span>{count} students</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Performers & Need Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Top Performers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisData.topPerformers.length > 0 ? (
                    analysisData.topPerformers.slice(0, 10).map((student, index) => {
                      const excellenceRatio = Math.round((student.excellentGrades / student.totalGrades) * 100);
                      return (
                        <div key={student.regNo} className="flex items-center justify-between p-3 bg-green-50 rounded border border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{student.name}</div>
                              <div className="text-sm text-muted-foreground">{student.regNo}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-700">GPA: {student.gpa}</div>
                            <div className="text-xs text-muted-foreground">{excellenceRatio}% excellence</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No top performers found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Students Need Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysisData.needsAttention.length > 0 ? (
                    analysisData.needsAttention.slice(0, 10).map((student) => (
                      <div key={student.regNo} className="p-3 bg-red-50 rounded border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.regNo} • GPA: {student.gpa}</div>
                          </div>
                          <Badge variant="destructive">
                            {student.arrearsCount} arrear{student.arrearsCount > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {student.failedSubjects.map(subject => (
                            <Badge key={subject} variant="outline" className="text-xs border-red-300 text-red-700">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>All students are performing well!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cgpa" className="space-y-6">
          {/* CGPA Analysis - Individual Student CGPA across all semesters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Individual Student CGPA Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Overall CGPA for each student calculated across all semesters (like main panel)
              </p>
            </CardHeader>
            <CardContent>
              <CGPAAnalysis filters={filters} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          {/* Student Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Detailed Student Analysis
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete student-wise breakdown with GPA, pass/fail status, and arrears count
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Student</th>
                      <th className="text-left p-3 font-medium">GPA</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Passed</th>
                      <th className="text-left p-3 font-medium">Arrears</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analysisData.studentDetails || []).map((student) => (
                      <tr key={student.regNo} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div>
                            <div className="font-medium">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.regNo}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant="outline" 
                            className={student.gpa >= 8 ? 'border-green-500 text-green-700' : 
                                      student.gpa >= 6 ? 'border-blue-500 text-blue-700' : 
                                      'border-red-500 text-red-700'}
                          >
                            {student.gpa}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={student.status === 'Passed' ? 'default' : 'destructive'}>
                            {student.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-green-600 font-medium">
                          {student.passedSubjects}/{student.totalSubjects}
                        </td>
                        <td className="p-3">
                          {student.arrearsCount > 0 ? (
                            <Badge variant="destructive">{student.arrearsCount}</Badge>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{student.name} - Grade Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium">Register Number</p>
                                    <p className="text-sm text-muted-foreground">{student.regNo}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Overall GPA</p>
                                    <p className="text-sm text-muted-foreground">{student.gpa}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Total Subjects</p>
                                    <p className="text-sm text-muted-foreground">{student.totalSubjects}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Arrears Count</p>
                                    <p className="text-sm text-muted-foreground">{student.arrearsCount}</p>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium mb-3">Subject-wise Grades</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {Object.entries(student.grades).map(([subject, grade]) => (
                                      <div key={subject} className={`p-2 rounded border ${getGradeColor(grade)}`}>
                                        <div className="text-xs font-medium">{subject}</div>
                                        <div className="text-sm font-bold">{grade}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {student.failedSubjects.length > 0 && (
                                  <div>
                                    <h4 className="font-medium mb-2 text-red-600">Failed Subjects</h4>
                                    <div className="flex flex-wrap gap-1">
                                      {student.failedSubjects.map(subject => (
                                        <Badge key={subject} variant="destructive" className="text-xs">
                                          {subject}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
