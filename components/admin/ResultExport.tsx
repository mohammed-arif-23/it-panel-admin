'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Download, FileSpreadsheet, Printer, Mail, Share2 } from 'lucide-react';

interface ResultData {
  stu_reg_no: string;
  stu_name: string;
  res_data: Record<string, string>;
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  includeStats: boolean;
  includeHeader: boolean;
  selectedStudents: string[];
  selectedSubjects: string[];
  groupBy: 'none' | 'grade' | 'status';
  sortBy: 'regNo' | 'name' | 'grade';
}

interface ResultExportProps {
  resultData: ResultData[];
  sheetInfo: {
    department: string;
    batch: string;
    year: number;
    semester: number;
    exam_cycle: string;
  };
  onExport: (options: ExportOptions) => Promise<void>;
}

export function ResultExport({ resultData, sheetInfo, onExport }: ResultExportProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeStats: true,
    includeHeader: true,
    selectedStudents: [],
    selectedSubjects: [],
    groupBy: 'none',
    sortBy: 'regNo'
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!resultData || resultData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No result data available for export
      </div>
    );
  }

  const subjectCodes = Object.keys(resultData[0]?.res_data || {}).sort();
  const allStudents = resultData.map(s => s.stu_reg_no);

  const updateExportOption = <K extends keyof ExportOptions>(
    key: K,
    value: ExportOptions[K]
  ) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  };

  const toggleStudentSelection = (regNo: string) => {
    const current = exportOptions.selectedStudents;
    if (current.includes(regNo)) {
      updateExportOption('selectedStudents', current.filter(s => s !== regNo));
    } else {
      updateExportOption('selectedStudents', [...current, regNo]);
    }
  };

  const toggleSubjectSelection = (subject: string) => {
    const current = exportOptions.selectedSubjects;
    if (current.includes(subject)) {
      updateExportOption('selectedSubjects', current.filter(s => s !== subject));
    } else {
      updateExportOption('selectedSubjects', [...current, subject]);
    }
  };

  const selectAllStudents = () => {
    if (exportOptions.selectedStudents.length === allStudents.length) {
      updateExportOption('selectedStudents', []);
    } else {
      updateExportOption('selectedStudents', allStudents);
    }
  };

  const selectAllSubjects = () => {
    if (exportOptions.selectedSubjects.length === subjectCodes.length) {
      updateExportOption('selectedSubjects', []);
    } else {
      updateExportOption('selectedSubjects', subjectCodes);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setError(null);
    setSuccess(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onExport(exportOptions);

      clearInterval(progressInterval);
      setExportProgress(100);
      setSuccess(`Successfully exported ${exportOptions.format.toUpperCase()} file`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
      setTimeout(() => {
        setExportProgress(0);
        setSuccess(null);
      }, 3000);
    }
  };

  const getSelectedCount = () => {
    const studentCount = exportOptions.selectedStudents.length || allStudents.length;
    const subjectCount = exportOptions.selectedSubjects.length || subjectCodes.length;
    return { studentCount, subjectCount };
  };

  const { studentCount, subjectCount } = getSelectedCount();

  return (
    <div className="space-y-6">
      {/* Export Format */}
      <Card>
        <CardHeader>
          <CardTitle>Export Format</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
              { value: 'csv', label: 'CSV (.csv)', icon: Download },
              { value: 'pdf', label: 'PDF (.pdf)', icon: Printer },
              { value: 'json', label: 'JSON (.json)', icon: Share2 }
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={exportOptions.format === value ? 'default' : 'outline'}
                onClick={() => updateExportOption('format', value as any)}
                className="h-20 flex-col"
              >
                <Icon className="h-6 w-6 mb-2" />
                <span className="text-sm">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select
                value={exportOptions.sortBy}
                onValueChange={(value) => updateExportOption('sortBy', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regNo">Registration Number</SelectItem>
                  <SelectItem value="name">Student Name</SelectItem>
                  <SelectItem value="grade">Overall Grade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Group By</label>
              <Select
                value={exportOptions.groupBy}
                onValueChange={(value) => updateExportOption('groupBy', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="grade">Grade</SelectItem>
                  <SelectItem value="status">Pass/Fail Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Include</label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeHeader"
                    checked={exportOptions.includeHeader}
                    onCheckedChange={(checked) => updateExportOption('includeHeader', !!checked)}
                  />
                  <label htmlFor="includeHeader" className="text-sm">Header Information</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeStats"
                    checked={exportOptions.includeStats}
                    onCheckedChange={(checked) => updateExportOption('includeStats', !!checked)}
                  />
                  <label htmlFor="includeStats" className="text-sm">Statistics Summary</label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Select Students ({exportOptions.selectedStudents.length || allStudents.length} of {allStudents.length})</span>
            <Button onClick={selectAllStudents} variant="outline" size="sm">
              {exportOptions.selectedStudents.length === allStudents.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {resultData.map(student => (
              <div key={student.stu_reg_no} className="flex items-center space-x-2">
                <Checkbox
                  id={student.stu_reg_no}
                  checked={exportOptions.selectedStudents.includes(student.stu_reg_no) || exportOptions.selectedStudents.length === 0}
                  onCheckedChange={() => toggleStudentSelection(student.stu_reg_no)}
                />
                <label htmlFor={student.stu_reg_no} className="text-sm flex-1">
                  {student.stu_reg_no} - {student.stu_name}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Select Subjects ({exportOptions.selectedSubjects.length || subjectCodes.length} of {subjectCodes.length})</span>
            <Button onClick={selectAllSubjects} variant="outline" size="sm">
              {exportOptions.selectedSubjects.length === subjectCodes.length ? 'Deselect All' : 'Select All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {subjectCodes.map(subject => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox
                  id={subject}
                  checked={exportOptions.selectedSubjects.includes(subject) || exportOptions.selectedSubjects.length === 0}
                  onCheckedChange={() => toggleSubjectSelection(subject)}
                />
                <label htmlFor={subject} className="text-sm">
                  {subject}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Summary & Action */}
      <Card>
        <CardHeader>
          <CardTitle>Export Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-muted rounded">
              <div className="text-2xl font-bold">{studentCount}</div>
              <div className="text-sm text-muted-foreground">Students</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-2xl font-bold">{subjectCount}</div>
              <div className="text-sm text-muted-foreground">Subjects</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-2xl font-bold">{exportOptions.format.toUpperCase()}</div>
              <div className="text-sm text-muted-foreground">Format</div>
            </div>
            <div className="p-3 bg-muted rounded">
              <div className="text-2xl font-bold">{exportOptions.groupBy !== 'none' ? 'Yes' : 'No'}</div>
              <div className="text-sm text-muted-foreground">Grouped</div>
            </div>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exporting...</span>
                <span>{exportProgress}%</span>
              </div>
              <Progress value={exportProgress} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleExport} 
            disabled={isExporting || studentCount === 0}
            className="w-full"
            size="lg"
          >
            {isExporting ? (
              <>Exporting {exportOptions.format.toUpperCase()}...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {studentCount} Students as {exportOptions.format.toUpperCase()}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
