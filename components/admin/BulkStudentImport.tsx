'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StudentData {
  register_number: string;
  name: string;
  email: string;
  mobile?: string;
  class_year: string;
}

export default function BulkStudentImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ 
    type: 'success' | 'error' | 'warning'; 
    message: string; 
    details?: string;
    count?: number;
  } | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setStudents([]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setResult(null);
      setStudents([]);
    }
  };

  const parseFile = async (): Promise<StudentData[]> => {
    if (!file) return [];

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first worksheet
          const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[worksheetName];
          
          // Convert to JSON
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
          
          // Map to our expected format
          const students: StudentData[] = jsonData.map(row => ({
            register_number: String(row['Register Number'] || row['register_number'] || row['RegisterNumber'] || ''),
            name: String(row['Name'] || row['name'] || ''),
            email: String(row['Email'] || row['email'] || ''),
            mobile: row['Mobile'] || row['mobile'] || undefined,
            class_year: String(row['Class Year'] || row['ClassYear'] || row['class_year'] || 'II-IT')
          }));
          
          resolve(students);
        } catch (error) {
          reject(new Error('Failed to parse file. Please ensure it is a valid Excel or CSV file.'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      setResult({
        type: 'error',
        message: 'Please select a file to import'
      });
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      // Parse the file
      const parsedStudents = await parseFile();
      
      if (parsedStudents.length === 0) {
        setResult({
          type: 'error',
          message: 'No student data found in the file'
        });
        setIsProcessing(false);
        return;
      }

      setStudents(parsedStudents);

      // Validate the data
      const validationErrors: string[] = [];
      
      parsedStudents.forEach((student, index) => {
        const rowNumber = index + 1;
        
        // Validate register number
        if (!student.register_number || student.register_number.length !== 12) {
          validationErrors.push(`Row ${rowNumber}: Register number must be exactly 12 digits`);
        } else if (!/^\d{12}$/.test(student.register_number)) {
          validationErrors.push(`Row ${rowNumber}: Register number must contain only digits`);
        }
        
        // Validate name
        if (!student.name || !student.name.trim()) {
          validationErrors.push(`Row ${rowNumber}: Name is required`);
        }
        
        // Validate email
        if (!student.email || !student.email.trim()) {
          validationErrors.push(`Row ${rowNumber}: Email is required`);
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
          validationErrors.push(`Row ${rowNumber}: Invalid email format`);
        }
        
        // Validate class year
        const validClassYears = ['II-IT', 'III-IT'];
        if (!student.class_year || !validClassYears.includes(student.class_year)) {
          validationErrors.push(`Row ${rowNumber}: Invalid class year. Must be II-IT or III-IT`);
        }
      });

      if (validationErrors.length > 0) {
        setResult({
          type: 'error',
          message: `Validation failed for ${validationErrors.length} rows`,
          details: validationErrors.join('; ')
        });
        setIsProcessing(false);
        return;
      }

      // Send to API for import
      const response = await fetch('/api/admin/students/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ students: parsedStudents }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult({
          type: 'success',
          message: 'Students imported successfully',
          count: data.importedCount
        });
        
        // Reset form
        setFile(null);
        setStudents([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setResult({
          type: 'error',
          message: data.error || 'Failed to import students',
          details: data.details
        });
      }
    } catch (error: any) {
      setResult({
        type: 'error',
        message: 'Failed to import students',
        details: error.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        'Register Number': '620123205001',
        'Name': 'John Doe',
        'Email': 'john.doe@example.com',
        'Mobile': '9876543210',
        'Class Year': 'II-IT'
      },
      {
        'Register Number': '620123205002',
        'Name': 'Jane Smith',
        'Email': 'jane.smith@example.com',
        'Mobile': '9876543211',
        'Class Year': 'III-IT'
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Students_Template');

    // Generate and download file
    XLSX.writeFile(wb, 'students_import_template.xlsx');
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Bulk Student Import
        </CardTitle>
        <CardDescription>
          Import multiple students from an Excel or CSV file
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-blue-900">Download Template</h3>
              <p className="text-sm text-blue-700">
                Download the Excel template to ensure correct formatting
              </p>
            </div>
            <Button 
              onClick={downloadTemplate}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>
        </div>

        {/* File Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          
          {file ? (
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-900">Drag and drop your file here</p>
              <p className="text-sm text-gray-500 mt-1">
                or click to browse (Excel or CSV files only)
              </p>
            </div>
          )}
          
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: .xlsx, .xls, .csv
          </p>
        </div>

        {/* Result Message */}
        {result && (
          <Alert className={
            result.type === 'success' ? 'bg-green-50 border-green-200' :
            result.type === 'error' ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }>
            {result.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={
              result.type === 'success' ? 'text-green-900' :
              result.type === 'error' ? 'text-red-900' :
              'text-yellow-900'
            }>
              <div>
                <p className="font-medium">{result.message}</p>
                {result.details && (
                  <p className="text-sm mt-1">{result.details}</p>
                )}
                {result.count !== undefined && (
                  <p className="text-sm mt-1">{result.count} students imported successfully</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={!file || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Students
              </>
            )}
          </Button>
        </div>

        {/* Preview (if file is selected) */}
        {students.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h3 className="font-medium text-gray-900">Preview ({students.length} students)</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Register Number</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Name</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Email</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Class</th>
                  </tr>
                </thead>
                <tbody>
                  {students.slice(0, 5).map((student, index) => (
                    <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-900">{student.register_number}</td>
                      <td className="px-4 py-2 text-gray-900">{student.name}</td>
                      <td className="px-4 py-2 text-gray-600">{student.email}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {student.class_year}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {students.length > 5 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-gray-500 text-sm">
                        + {students.length - 5} more students
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}