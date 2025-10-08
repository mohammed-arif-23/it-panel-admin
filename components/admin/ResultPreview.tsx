'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, FileSpreadsheet, Printer } from 'lucide-react';

interface ResultData {
  stu_reg_no: string;
  stu_name: string;
  res_data: Record<string, string>;
}

interface ResultPreviewProps {
  resultData: ResultData[];
  sheetInfo: {
    department: string;
    batch: string;
    year: number;
    semester: number;
    exam_cycle: string;
  };
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

export function ResultPreview({ resultData, sheetInfo, onExport }: ResultPreviewProps) {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  if (!resultData || resultData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No result data to preview
      </div>
    );
  }

  const subjectCodes = Object.keys(resultData[0]?.res_data || {}).sort();
  
  // Calculate statistics
  const stats = {
    totalStudents: resultData.length,
    totalSubjects: subjectCodes.length,
    gradeDistribution: {} as Record<string, number>,
    passPercentage: 0
  };

  // Calculate grade distribution and pass percentage
  const allGrades: string[] = [];
  let passedStudents = 0;

  resultData.forEach(student => {
    let studentPassed = true;
    Object.values(student.res_data).forEach(grade => {
      if (grade) {
        allGrades.push(grade);
        if (grade === 'U' || grade === 'RA' || grade === 'UA') {
          studentPassed = false;
        }
      }
    });
    if (studentPassed) passedStudents++;
  });

  allGrades.forEach(grade => {
    stats.gradeDistribution[grade] = (stats.gradeDistribution[grade] || 0) + 1;
  });

  stats.passPercentage = Math.round((passedStudents / resultData.length) * 100);

  const toggleStudentSelection = (regNo: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(regNo)) {
      newSelection.delete(regNo);
    } else {
      newSelection.add(regNo);
    }
    setSelectedStudents(newSelection);
  };

  const selectAll = () => {
    if (selectedStudents.size === resultData.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(resultData.map(s => s.stu_reg_no)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {sheetInfo.department} - {sheetInfo.batch}
              </h2>
              <p className="text-lg text-muted-foreground">
                Year {sheetInfo.year}, Semester {sheetInfo.semester} - {sheetInfo.exam_cycle}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => onExport('csv')} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button onClick={() => onExport('excel')} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button onClick={() => onExport('pdf')} variant="outline" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalSubjects}</div>
            <p className="text-xs text-muted-foreground">Subjects</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.passPercentage}%</div>
            <p className="text-xs text-muted-foreground">Pass Percentage</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{selectedStudents.size}</div>
            <p className="text-xs text-muted-foreground">Selected</p>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.gradeDistribution)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, count]) => (
                <Badge 
                  key={grade} 
                  variant={grade === 'U' || grade === 'RA' || grade === 'UA' ? 'destructive' : 'secondary'}
                  className="text-sm"
                >
                  {grade}: {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student Results</span>
            <Button onClick={selectAll} variant="outline" size="sm">
              {selectedStudents.size === resultData.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === resultData.length}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead className="w-[120px]">Reg. Number</TableHead>
                  <TableHead className="min-w-[200px]">Student Name</TableHead>
                  {subjectCodes.map(code => (
                    <TableHead key={code} className="text-center min-w-[80px]">
                      {code}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultData.map((student, index) => {
                  const hasFailure = Object.values(student.res_data).some(grade => 
                    grade === 'U' || grade === 'RA' || grade === 'UA'
                  );
                  
                  return (
                    <TableRow 
                      key={student.stu_reg_no} 
                      className={`${index % 2 === 0 ? 'bg-muted/50' : ''} ${
                        selectedStudents.has(student.stu_reg_no) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.stu_reg_no)}
                          onChange={() => toggleStudentSelection(student.stu_reg_no)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.stu_reg_no}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.stu_name}
                      </TableCell>
                      {subjectCodes.map(subjectCode => {
                        const grade = student.res_data[subjectCode] || '';
                        return (
                          <TableCell key={subjectCode} className="text-center">
                            <span className={`font-medium ${
                              grade === 'U' || grade === 'RA' || grade === 'UA' ? 'text-red-600' :
                              grade === 'O' || grade === 'A+' ? 'text-green-600' :
                              'text-foreground'
                            }`}>
                              {grade || '-'}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <Badge variant={hasFailure ? 'destructive' : 'default'}>
                          {hasFailure ? 'Fail' : 'Pass'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Export Options for Selected */}
      {selectedStudents.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Export Selected Students ({selectedStudents.size})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={() => onExport('csv')} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Selected as CSV
              </Button>
              <Button onClick={() => onExport('excel')} variant="outline">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Selected as Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
