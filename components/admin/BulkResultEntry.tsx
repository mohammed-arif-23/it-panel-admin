'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { GRADES, isValidGrade } from '@/lib/validations';
import { SortingControls } from '@/components/ui/SortingControls';

interface BulkResultData {
  regNo: string;
  name: string;
  grades: Record<string, string>;
}

interface BulkResultEntryProps {
  subjects: string[];
  onDataSubmit: (data: BulkResultData[]) => void;
  onTemplateDownload: () => void;
}

const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'U', 'RA', 'UA'];

export function BulkResultEntry({ subjects, onDataSubmit, onTemplateDownload }: BulkResultEntryProps) {
  const [bulkData, setBulkData] = useState<BulkResultData[]>([]);
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add empty row
  const addRow = () => {
    const newRow: BulkResultData = {
      regNo: '',
      name: '',
      grades: subjects.reduce((acc, subject) => ({ ...acc, [subject]: '' }), {})
    };
    setBulkData([...bulkData, newRow]);
  };

  // Remove row
  const removeRow = (index: number) => {
    setBulkData(bulkData.filter((_, i) => i !== index));
  };

  // Update cell data
  const updateCell = (index: number, field: string, value: string) => {
    const updated = [...bulkData];
    if (field === 'regNo' || field === 'name') {
      updated[index][field] = value;
    } else {
      updated[index].grades[field] = value;
    }
    setBulkData(updated);
  };

  // Parse pasted data (tab-separated or comma-separated)
  const handlePasteData = () => {
    if (!pasteText.trim()) {
      setError('Please paste data first');
      return;
    }

    try {
      const lines = pasteText.trim().split('\n');
      const parsedData: BulkResultData[] = [];
      let detectedSubjects: string[] = [];

      lines.forEach((line, lineIndex) => {
        const cells = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        
        if (cells.length < 2) {
          throw new Error(`Line ${lineIndex + 1}: Invalid format. Need at least Reg No and Name`);
        }

        const regNo = cells[0]?.trim() || '';
        const name = cells[1]?.trim() || '';
        
        if (!regNo || !name) {
          throw new Error(`Line ${lineIndex + 1}: Registration number and name are required`);
        }

        const grades: Record<string, string> = {};
        
        // If subjects are provided, use them. Otherwise, auto-detect from data
        const subjectsToUse = subjects.length > 0 ? subjects : detectedSubjects;
        
        // Auto-detect subjects from first row if not provided
        if (subjects.length === 0 && lineIndex === 0) {
          // Assume remaining columns after reg_no and name are subject codes
          for (let i = 2; i < cells.length; i++) {
            const subjectCode = `SUB${i - 1}`; // Default subject naming
            detectedSubjects.push(subjectCode);
          }
        }
        
        // Process grades for each subject
        const currentSubjects = subjects.length > 0 ? subjects : detectedSubjects;
        currentSubjects.forEach((subject, subjectIndex) => {
          const gradeValue = cells[subjectIndex + 2]?.trim() || '';
          if (gradeValue && !GRADES.includes(gradeValue)) {
            throw new Error(`Line ${lineIndex + 1}: Invalid grade "${gradeValue}" for ${subject}. Valid grades: ${GRADES.join(', ')}`);
          }
          grades[subject] = gradeValue;
        });

        parsedData.push({ regNo, name, grades });
      });

      setBulkData(parsedData);
      setPasteText('');
      setError(null);
      setSuccess(`Successfully parsed ${parsedData.length} student records${subjects.length === 0 ? ' (auto-detected subjects)' : ''}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse data');
    }
  };

  // Handle file upload (CSV/Excel)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPasteText(text);
      handlePasteData();
    };
    reader.readAsText(file);
  };

  // Generate CSV template
  const generateTemplate = () => {
    const headers = ['Reg_No', 'Student_Name', ...subjects];
    const csvContent = headers.join(',') + '\n';
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export current data as CSV
  const exportData = () => {
    if (bulkData.length === 0) {
      setError('No data to export');
      return;
    }

    const headers = ['Reg_No', 'Student_Name', ...subjects];
    const csvRows = [
      headers.join(','),
      ...bulkData.map(row => [
        row.regNo,
        row.name,
        ...subjects.map(subject => row.grades[subject] || '')
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Submit data
  const handleSubmit = () => {
    if (bulkData.length === 0) {
      setError('No data to submit');
      return;
    }

    // Validate data
    const errors: string[] = [];
    bulkData.forEach((row, index) => {
      if (!row.regNo.trim()) {
        errors.push(`Row ${index + 1}: Registration number is required`);
      }
      if (!row.name.trim()) {
        errors.push(`Row ${index + 1}: Student name is required`);
      }
      
      Object.entries(row.grades).forEach(([subject, grade]) => {
        if (grade && grade !== 'NONE' && !GRADES.includes(grade)) {
          errors.push(`Row ${index + 1}: Invalid grade "${grade}" for ${subject}. Valid grades: ${GRADES.join(', ')}`);
        }
      });
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    try {
      onDataSubmit(bulkData);
      setSuccess('Data submitted successfully');
      setTimeout(() => {
        setBulkData([]);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError('Failed to submit data. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Import/Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Data Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={generateTemplate} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            
            <Button onClick={() => fileInputRef.current?.click()} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV/Excel
            </Button>
            
            <Button onClick={exportData} variant="outline" disabled={bulkData.length === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            
            <Button onClick={addRow} variant="outline">
              Add Row
            </Button>
            
            <Button onClick={handleSubmit} disabled={bulkData.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              Submit All Data
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Paste Area */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Paste from Excel/Sheets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Copy data from Excel/Google Sheets and paste here. Format: Reg_No, Name, Grade1, Grade2, ...
            {subjects.length > 0 && (
              <div className="mt-1">
                Expected subjects: {subjects.join(', ')}
              </div>
            )}
          </div>
          <Textarea
            placeholder="Paste your data here (tab or comma separated)..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
          />
          <Button onClick={handlePasteData} disabled={!pasteText.trim()}>
            <Copy className="mr-2 h-4 w-4" />
            Parse Pasted Data
          </Button>
        </CardContent>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Data Grid */}
      {bulkData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Preview ({bulkData.length} students)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Reg. No</TableHead>
                    <TableHead className="min-w-[200px]">Student Name</TableHead>
                    {subjects.map(subject => (
                      <TableHead key={subject} className="text-center min-w-[80px]">
                        {subject}
                      </TableHead>
                    ))}
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={row.regNo}
                          onChange={(e) => updateCell(index, 'regNo', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={(e) => updateCell(index, 'name', e.target.value)}
                          className="w-full"
                        />
                      </TableCell>
                      {subjects.map(subject => (
                        <TableCell key={subject} className="text-center">
                          <Select
                            value={row.grades[subject] || 'NONE'}
                            onValueChange={(value) => updateCell(index, subject, value === 'NONE' ? '' : value)}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">-</SelectItem>
                              {GRADES.map(grade => (
                                <SelectItem key={grade} value={grade}>
                                  {grade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeRow(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
