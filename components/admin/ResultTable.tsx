'use client';

import { useState } from 'react';
import { Check, X, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortingControls } from '@/components/ui/SortingControls';

interface ResultData {
  stu_reg_no: string;
  stu_name: string;
  res_data: Record<string, string>;
}

interface ResultTableProps {
  resultData: ResultData[];
  onGradeUpdate: (stuRegNo: string, subjectCode: string, newGrade: string) => void;
}

const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'U', 'RA', 'UA'];

export function ResultTable({ resultData, onGradeUpdate }: ResultTableProps) {
  const [editingCell, setEditingCell] = useState<{
    stuRegNo: string;
    subjectCode: string;
  } | null>(null);
  
  const [tempGrade, setTempGrade] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('stu_reg_no');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  if (!resultData || resultData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No student data available
      </div>
    );
  }

  // Get all unique subject codes from the first student's results
  const subjectCodes = Object.keys(resultData[0]?.res_data || {}).sort();

  // Sort data based on current sort settings
  const sortedData = [...resultData].sort((a, b) => {
    let aValue: string, bValue: string;
    
    if (sortBy === 'stu_reg_no') {
      aValue = a.stu_reg_no;
      bValue = b.stu_reg_no;
    } else if (sortBy === 'stu_name') {
      aValue = a.stu_name;
      bValue = b.stu_name;
    } else {
      // Sorting by subject grade
      aValue = a.res_data[sortBy] || '';
      bValue = b.res_data[sortBy] || '';
    }
    
    const comparison = aValue.localeCompare(bValue);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const sortOptions = [
    { value: 'stu_reg_no', label: 'Registration Number' },
    { value: 'stu_name', label: 'Student Name' },
    ...subjectCodes.map(code => ({ value: code, label: `Grade: ${code}` }))
  ];

  const handleEditStart = (stuRegNo: string, subjectCode: string, currentGrade: string) => {
    setEditingCell({ stuRegNo, subjectCode });
    setTempGrade(currentGrade);
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setTempGrade('');
  };

  const handleEditSave = () => {
    if (editingCell && tempGrade) {
      onGradeUpdate(editingCell.stuRegNo, editingCell.subjectCode, tempGrade);
      setEditingCell(null);
      setTempGrade('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className="space-y-4">
      {/* Sorting Controls */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Student Results</h3>
        <SortingControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          sortOptions={sortOptions}
        />
      </div>
      
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] font-medium">Reg. Number</TableHead>
            <TableHead className="min-w-[200px] font-medium">Student Name</TableHead>
            {subjectCodes.map(code => (
              <TableHead key={code} className="text-center font-medium min-w-[80px]">
                {code}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((student, index) => (
            <TableRow key={student.stu_reg_no} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
              <TableCell className="font-mono text-sm">{student.stu_reg_no}</TableCell>
              <TableCell className="font-medium">{student.stu_name}</TableCell>
              {subjectCodes.map(subjectCode => {
                const grade = student.res_data[subjectCode] || '';
                const isEditing = editingCell?.stuRegNo === student.stu_reg_no && 
                                editingCell?.subjectCode === subjectCode;

                return (
                  <TableCell key={subjectCode} className="text-center">
                    {isEditing ? (
                      <div className="flex items-center justify-center gap-1">
                        <div onKeyDown={handleKeyDown}>
                        <Select
                          value={tempGrade}
                          onValueChange={setTempGrade}
                        >
                          <SelectTrigger className="w-20 h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADES.map(grade => (
                              <SelectItem key={grade} value={grade}>
                                {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={handleEditSave}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={handleEditCancel}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="cursor-pointer hover:bg-accent rounded px-2 py-1 transition-colors"
                        onClick={() => handleEditStart(student.stu_reg_no, subjectCode, grade)}
                      >
                        <span className={`font-medium ${
                          grade === 'U' || grade === 'RA' || grade === 'UA' ? 'text-red-600' :
                          grade === 'O' || grade === 'A+' ? 'text-green-600' :
                          'text-foreground'
                        }`}>
                          {grade || '-'}
                        </span>
                        <Edit3 className="h-3 w-3 ml-1 inline opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
        </Table>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>• Click on any grade to edit it</p>
          <p>• Use Enter to save or Escape to cancel</p>
          <p>• Grades: O (Outstanding), A+ (Excellent), A (Very Good), B+ (Good), B (Above Average), C (Average), P (Pass), U (Re-appear), RA (Re-appear Arrear), UA (University Arrear)</p>
        </div>
      </div>
    </div>
  );
}
