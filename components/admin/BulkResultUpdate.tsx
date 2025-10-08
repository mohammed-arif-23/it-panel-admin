'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Upload, RefreshCw, CheckCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ResultData {
  stu_reg_no: string;
  stu_name: string;
  res_data: Record<string, string>;
}

interface BulkUpdateData {
  regNo: string;
  name: string;
  grades: Record<string, string>;
  status: 'new' | 'update' | 'match' | 'error';
  errorMessage?: string;
}

interface BulkResultUpdateProps {
  existingData: ResultData[];
  subjects: string[];
  onBulkUpdate: (updates: BulkUpdateData[]) => void;
}

const GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'U', 'RA', 'UA'];

export function BulkResultUpdate({ existingData, subjects, onBulkUpdate }: BulkResultUpdateProps) {
  const [pasteText, setPasteText] = useState('');
  const [parsedUpdates, setParsedUpdates] = useState<BulkUpdateData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [updateMode, setUpdateMode] = useState<'merge' | 'overwrite'>('merge');

  const handlePasteData = () => {
    if (!pasteText.trim()) {
      setError('Please paste data first');
      return;
    }

    try {
      const lines = pasteText.trim().split('\n');
      const updates: BulkUpdateData[] = [];

      lines.forEach((line, lineIndex) => {
        const cells = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        
        if (cells.length < 2) {
          updates.push({
            regNo: '',
            name: '',
            grades: {},
            status: 'error',
            errorMessage: `Line ${lineIndex + 1}: Invalid format. Need at least Reg No and Name`
          });
          return;
        }

        const regNo = cells[0]?.trim() || '';
        const name = cells[1]?.trim() || '';
        
        if (!regNo || !name) {
          updates.push({
            regNo,
            name,
            grades: {},
            status: 'error',
            errorMessage: `Line ${lineIndex + 1}: Registration number and name are required`
          });
          return;
        }

        // Find existing student
        const existingStudent = existingData.find(s => s.stu_reg_no === regNo);
        
        const grades: Record<string, string> = {};
        let hasValidGrades = false;
        let hasInvalidGrades = false;
        let invalidGradeMessage = '';

        // Process grades for each subject
        subjects.forEach((subject, subjectIndex) => {
          const gradeValue = cells[subjectIndex + 2]?.trim() || '';
          if (gradeValue) {
            if (GRADES.includes(gradeValue)) {
              grades[subject] = gradeValue;
              hasValidGrades = true;
            } else {
              hasInvalidGrades = true;
              invalidGradeMessage = `Invalid grade "${gradeValue}" for ${subject}`;
            }
          }
        });

        if (hasInvalidGrades) {
          updates.push({
            regNo,
            name,
            grades,
            status: 'error',
            errorMessage: invalidGradeMessage
          });
          return;
        }

        // Determine status
        let status: 'new' | 'update' | 'match' = 'new';
        
        if (existingStudent) {
          // Check if grades are different
          const hasChanges = subjects.some(subject => {
            const newGrade = grades[subject] || '';
            const existingGrade = existingStudent.res_data[subject] || '';
            return newGrade !== existingGrade && newGrade !== '';
          });
          
          status = hasChanges ? 'update' : 'match';
        }

        updates.push({
          regNo,
          name,
          grades,
          status
        });
      });

      setParsedUpdates(updates);
      setError(null);
      
      const newCount = updates.filter(u => u.status === 'new').length;
      const updateCount = updates.filter(u => u.status === 'update').length;
      const matchCount = updates.filter(u => u.status === 'match').length;
      const errorCount = updates.filter(u => u.status === 'error').length;
      
      setSuccess(`Parsed ${updates.length} records: ${newCount} new, ${updateCount} updates, ${matchCount} matches, ${errorCount} errors`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse data');
    }
  };

  const handleApplyUpdates = () => {
    const validUpdates = parsedUpdates.filter(u => u.status !== 'error');
    if (validUpdates.length === 0) {
      setError('No valid updates to apply');
      return;
    }

    onBulkUpdate(validUpdates);
    setSuccess(`Applied ${validUpdates.length} updates successfully`);
    setParsedUpdates([]);
    setPasteText('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">New</Badge>;
      case 'update':
        return <Badge variant="default" className="bg-orange-100 text-orange-800">Update</Badge>;
      case 'match':
        return <Badge variant="secondary">No Change</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return null;
    }
  };

  const stats = {
    total: parsedUpdates.length,
    new: parsedUpdates.filter(u => u.status === 'new').length,
    update: parsedUpdates.filter(u => u.status === 'update').length,
    match: parsedUpdates.filter(u => u.status === 'match').length,
    error: parsedUpdates.filter(u => u.status === 'error').length
  };

  return (
    <div className="space-y-6">
      {/* Paste Area */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Update Existing Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Update Mode</label>
              <Select value={updateMode} onValueChange={(value: 'merge' | 'overwrite') => setUpdateMode(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">Merge (keep existing)</SelectItem>
                  <SelectItem value="overwrite">Overwrite all</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Paste data to update existing results. Format: Reg_No, Name, {subjects.join(', ')}
            <br />
            <strong>Merge mode:</strong> Only updates grades you provide, keeps existing grades
            <br />
            <strong>Overwrite mode:</strong> Replaces all grades with your data
          </div>
          
          <Textarea
            placeholder="Paste your updated data here (tab or comma separated)..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
          />
          
          <div className="flex gap-2">
            <Button onClick={handlePasteData} disabled={!pasteText.trim()}>
              <Copy className="mr-2 h-4 w-4" />
              Parse Updates
            </Button>
            
            {parsedUpdates.length > 0 && (
              <Button onClick={handleApplyUpdates} disabled={stats.error === stats.total}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Apply {stats.new + stats.update} Updates
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
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

      {/* Statistics */}
      {parsedUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Update Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{stats.new}</div>
                <div className="text-sm text-muted-foreground">New</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">{stats.update}</div>
                <div className="text-sm text-muted-foreground">Updates</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-600">{stats.match}</div>
                <div className="text-sm text-muted-foreground">No Change</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Updates */}
      {parsedUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {parsedUpdates.map((update, index) => (
                  <div key={index} className={`p-3 rounded border ${
                    update.status === 'error' ? 'bg-red-50 border-red-200' :
                    update.status === 'update' ? 'bg-orange-50 border-orange-200' :
                    update.status === 'new' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{update.regNo}</span>
                        <span className="font-medium">{update.name}</span>
                        {getStatusBadge(update.status)}
                      </div>
                      
                      {update.status !== 'error' && (
                        <div className="flex gap-1">
                          {Object.entries(update.grades).map(([subject, grade]) => (
                            grade && (
                              <Badge key={subject} variant="outline" className="text-xs">
                                {subject}: {grade}
                              </Badge>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {update.errorMessage && (
                      <div className="mt-2 text-sm text-red-600">
                        {update.errorMessage}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
