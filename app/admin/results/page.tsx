'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, PlusSquare, Eye, Upload, Edit, FileSpreadsheet, Download } from 'lucide-react';
import { ResultTable } from '@/components/admin/ResultTable';
import { BulkResultEntry } from '@/components/admin/BulkResultEntry';
import { BulkResultUpdate } from '@/components/admin/BulkResultUpdate';
import { ResultPreview } from '@/components/admin/ResultPreview';
import { ResultExport } from '@/components/admin/ResultExport';

interface FilterOptions {
  batches: string[];
  departments: string[];
  years: number[];
  semesters: number[];
}

interface ResultSheet {
  sheet_id: number;
  department: string;
  year: number;
  semester: number;
  batch: string;
  exam_cycle: string;
  result_data: Array<{
    stu_reg_no: string;
    stu_name: string;
    res_data: Record<string, string>;
  }>;
}

export default function ResultsManagementPage() {
  const [activeTab, setActiveTab] = useState('create');
  const [filters, setFilters] = useState({
    batch: '',
    department: '',
    year: '',
    semester: ''
  });
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    batches: [],
    departments: [],
    years: [],
    semesters: []
  });
  // Additional inputs for sheet generation
  const [classYear, setClassYear] = useState('');
  const [classes, setClasses] = useState<string[]>([]);
  const [examCycle, setExamCycle] = useState('');
  
  const [resultSheet, setResultSheet] = useState<ResultSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubjects, setPreviewSubjects] = useState<string[]>([]);
  const [previewSubjectCount, setPreviewSubjectCount] = useState(0);
  const [previewStudentCount, setPreviewStudentCount] = useState(0);
  const [yearLabel, setYearLabel] = useState('');

  // Fetch filter options on component mount
  useEffect(() => {
    fetchFilterOptions();
    fetchClasses();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/results/options');
      if (response.ok) {
        const data = await response.json();
        setFilterOptions({
          batches: [], // batch will be entered manually
          departments: data.departments || [],
          years: data.years || [],
          semesters: data.semesters || []
        });
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/results/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (e) {
      console.error('Error fetching classes:', e);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setResultSheet(null);
    setError(null);
    setSuccess(null);
  };

  // When department changes, fetch years for that department and reset year + semester
  useEffect(() => {
    const loadYears = async () => {
      if (!filters.department) {
        setFilterOptions(prev => ({ ...prev, years: [], semesters: [] }));
        setFilters(prev => ({ ...prev, year: '', semester: '' }));
        return;
      }
      try {
        const res = await fetch(`/api/results/options?department=${encodeURIComponent(filters.department)}`);
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(prev => ({ ...prev, years: data.years || [], semesters: [] }));
          setFilters(prev => ({ ...prev, year: '', semester: '' }));
        }
      } catch (e) {
        console.error('Error loading years:', e);
      }
    };
    loadYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.department]);

  // When year changes, fetch semesters for department + year and reset semester
  useEffect(() => {
    const loadSemesters = async () => {
      if (!filters.department || !filters.year) {
        setFilterOptions(prev => ({ ...prev, semesters: [] }));
        setFilters(prev => ({ ...prev, semester: '' }));
        return;
      }
      try {
        const res = await fetch(`/api/results/options?department=${encodeURIComponent(filters.department)}&year=${encodeURIComponent(filters.year)}`);
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(prev => ({ ...prev, semesters: data.semesters || [] }));
          setFilters(prev => ({ ...prev, semester: '' }));
        }
      } catch (e) {
        console.error('Error loading semesters:', e);
      }
    };
    loadSemesters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.year]);

  const fetchResults = async () => {
    if (!filters.batch || !filters.department || !filters.year || !filters.semester) {
      setError('Please select all filters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const params = new URLSearchParams({
        batch: filters.batch,
        department: filters.department,
        year: filters.year,
        semester: filters.semester
      });

      const response = await fetch(`/api/results/sheet?${params}`);
      const data = await response.json();

      if (response.ok) {
        setResultSheet(data);
      } else {
        setError(data.error || 'Failed to fetch results');
        setResultSheet(null);
      }
    } catch (error) {
      setError('Failed to fetch results. Please try again.');
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeUpdate = async (
    stuRegNo: string,
    subjectCode: string,
    newGrade: string
  ) => {
    try {
      const response = await fetch('/api/results/sheet', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          stu_reg_no: stuRegNo,
          sub_code: subjectCode,
          new_grade: newGrade
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Grade updated successfully');
        setTimeout(() => setSuccess(null), 3000);
        
        // Update local state to reflect the change
        if (resultSheet) {
          setResultSheet(prev => {
            if (!prev) return null;
            return {
              ...prev,
              result_data: prev.result_data.map(student => 
                student.stu_reg_no === stuRegNo
                  ? {
                      ...student,
                      res_data: {
                        ...student.res_data,
                        [subjectCode]: newGrade
                      }
                    }
                  : student
              )
            };
          });
        }
      } else {
        setError(data.error || 'Failed to update grade');
      }
    } catch (error) {
      setError('Failed to update grade. Please try again.');
      console.error('Error updating grade:', error);
    }
  };

  const isFiltersComplete = filters.batch && filters.department && filters.year && filters.semester;
  const isGenerateReady = isFiltersComplete && classYear && examCycle;

  const handleGenerateSheet = async () => {
    if (!isGenerateReady) {
      setError('Please select Batch, Department, Year, Semester, Class and Exam Cycle');
      return;
    }
    setGenerating(true);
    setProgress('Submitting generation request...');
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        batch: filters.batch,
        department: filters.department,
        year: Number(filters.year),
        year_label: yearLabel || `Year-${filters.year}`,
        semester: Number(filters.semester),
        exam_cycle: examCycle,
        class_year: classYear,
        overwrite: false
      };
      const res = await fetch('/api/results/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate result sheet');
        return;
      }
      setSuccess('Result sheet generated successfully');
      // Auto-fetch the newly created sheet
      await fetchResults();
    } catch (e) {
      console.error('Error generating sheet:', e);
      setError('Failed to generate result sheet. Please try again.');
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  const handlePreview = async () => {
    if (!isGenerateReady) {
      setError('Please select Batch, Department, Year, Semester, Class and Exam Cycle');
      return;
    }
    setError(null);
    setSuccess(null);
    setProgress('Preparing preview...');
    try {
      const payload = {
        batch: filters.batch,
        department: filters.department,
        year: Number(filters.year),
        semester: Number(filters.semester),
        class_year: classYear
      };
      const res = await fetch('/api/results/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to prepare preview');
        return;
      }
      setPreviewSubjects(data.subjectCodes || []);
      setPreviewSubjectCount(data.subjectCount || 0);
      setPreviewStudentCount(data.studentCount || 0);
      setPreviewOpen(true);
    } catch (e) {
      console.error('Error generating preview:', e);
      setError('Failed to prepare preview. Please try again.');
    } finally {
      setProgress(null);
    }
  };

  // Handle bulk data submission
  const handleBulkDataSubmit = async (bulkData: any[]) => {
    try {
      const response = await fetch('/api/results/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          examCycle,
          bulkData
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Successfully updated ${bulkData.length} student records`);
        setActiveTab('update'); // Switch to update tab to see results
        await fetchResults(); // Refresh the data
      } else {
        setError(data.error || 'Failed to submit bulk data');
      }
    } catch (error) {
      setError('Failed to submit bulk data. Please try again.');
      console.error('Error submitting bulk data:', error);
    }
  };

  // Handle bulk updates to existing data
  const handleBulkUpdate = async (updates: any[]) => {
    try {
      const response = await fetch('/api/results/bulk-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          updates
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSuccess(`Successfully applied ${updates.length} bulk updates`);
        await fetchResults(); // Refresh the data
      } else {
        setError(data.error || 'Failed to apply bulk updates');
      }
    } catch (error) {
      setError('Failed to apply bulk updates. Please try again.');
      console.error('Error applying bulk updates:', error);
    }
  };

  // Handle export
  const handleExport = async (options: any) => {
    try {
      const response = await fetch('/api/results/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...filters,
          exportOptions: options
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileExtension = options.format === 'excel' ? 'xlsx' : options.format;
        a.download = `results_${filters.batch}_${filters.department}.${fileExtension}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        setError(data.error || 'Export failed');
      }
    } catch (error) {
      setError('Export failed. Please try again.');
      console.error('Export error:', error);
    }
  };

  const getSubjectCodes = () => {
    if (!resultSheet?.result_data?.[0]) return [];
    return Object.keys(resultSheet.result_data[0].res_data).sort();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Student Results Management</h1>
        <p className="text-muted-foreground">
          Streamlined bulk result entry and management system
        </p>
      </div>

      {/* Common Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Result Sheet Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Batch</label>
              <Input
                value={filters.batch}
                onChange={(e) => handleFilterChange('batch', e.target.value)}
                placeholder="e.g., 2023-2027"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={filters.year} onValueChange={(value) => handleFilterChange('year', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.years.map(year => (
                    <SelectItem key={year} value={year.toString()}>Year {year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Semester</label>
              <Select value={filters.semester} onValueChange={(value) => handleFilterChange('semester', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.semesters.map(sem => (
                    <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Select value={classYear} onValueChange={setClassYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Exam Cycle</label>
              <Input
                value={examCycle}
                onChange={(e) => setExamCycle(e.target.value)}
                placeholder="e.g., NOV/DEC 2024"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-medium">Year Label</label>
              <Input
                value={yearLabel}
                onChange={(e) => setYearLabel(e.target.value)}
                placeholder="e.g., II-IT"
              />
            </div>
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

      {progress && (
        <Alert>
          <AlertDescription>{progress}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Create Results
          </TabsTrigger>
          <TabsTrigger value="update" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Update/Edit
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use bulk entry methods to quickly add student results. Supports CSV import, Excel files, and direct paste from spreadsheets.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-col md:flex-row gap-3">
                <Button
                  onClick={handleGenerateSheet}
                  disabled={!isGenerateReady || generating}
                  className="w-full md:w-auto"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PlusSquare className="mr-2 h-4 w-4" />
                      Generate Empty Sheet
                    </>
                  )}
                </Button>

                <Button
                  onClick={handlePreview}
                  disabled={!isGenerateReady}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Structure
                </Button>
              </div>
              
              <BulkResultEntry
                subjects={getSubjectCodes()}
                onDataSubmit={handleBulkDataSubmit}
                onTemplateDownload={() => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="update" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Existing Results</CardTitle>
              <p className="text-sm text-muted-foreground">
                Load and edit existing result sheets. Click on individual grades to modify them.
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button 
                  onClick={fetchResults} 
                  disabled={!isFiltersComplete || loading}
                  className="w-full md:w-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Load Result Sheet
                    </>
                  )}
                </Button>
              </div>
              
              {resultSheet && (
                <div className="space-y-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold">
                      {resultSheet.department} - {resultSheet.batch}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Year {resultSheet.year}, Semester {resultSheet.semester} - {resultSheet.exam_cycle}
                    </p>
                  </div>
                  
                  {/* Bulk Update Component */}
                  <BulkResultUpdate
                    existingData={resultSheet.result_data}
                    subjects={getSubjectCodes()}
                    onBulkUpdate={handleBulkUpdate}
                  />
                  
                  {/* Individual Edit Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Individual Grade Editing</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Click on any grade to edit it individually
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ResultTable 
                        resultData={resultSheet.result_data}
                        onGradeUpdate={handleGradeUpdate}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {resultSheet ? (
            <ResultPreview
              resultData={resultSheet.result_data}
              sheetInfo={{
                department: resultSheet.department,
                batch: resultSheet.batch,
                year: resultSheet.year,
                semester: resultSheet.semester,
                exam_cycle: resultSheet.exam_cycle
              }}
              onExport={handleExport}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Data to Preview</h3>
                <p className="text-muted-foreground mb-4">
                  Load a result sheet from the Update tab to preview the data.
                </p>
                <Button onClick={() => setActiveTab('update')} variant="outline">
                  Go to Update Tab
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          {resultSheet ? (
            <ResultExport
              resultData={resultSheet.result_data}
              sheetInfo={{
                department: resultSheet.department,
                batch: resultSheet.batch,
                year: resultSheet.year,
                semester: resultSheet.semester,
                exam_cycle: resultSheet.exam_cycle
              }}
              onExport={handleExport}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Data to Export</h3>
                <p className="text-muted-foreground mb-4">
                  Load a result sheet from the Update tab to export the data.
                </p>
                <Button onClick={() => setActiveTab('update')} variant="outline">
                  Go to Update Tab
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Generation</DialogTitle>
            <DialogDescription>
              {filters.department} - {filters.batch} | Year {filters.year}, Semester {filters.semester}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded border">
                <div className="text-sm text-muted-foreground">Subjects</div>
                <div className="text-2xl font-bold">{previewSubjectCount}</div>
              </div>
              <div className="p-3 rounded border">
                <div className="text-sm text-muted-foreground">Students</div>
                <div className="text-2xl font-bold">{previewStudentCount}</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Subject Codes</div>
              <div className="max-h-60 overflow-auto border rounded p-2 text-sm">
                {previewSubjects.length === 0 ? (
                  <div className="text-muted-foreground">No subjects found.</div>
                ) : (
                  <ul className="list-disc pl-5 space-y-1">
                    {previewSubjects.map((code) => (
                      <li key={code}><span className="font-mono">{code}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={async () => { setPreviewOpen(false); await handleGenerateSheet(); }}>Confirm & Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
