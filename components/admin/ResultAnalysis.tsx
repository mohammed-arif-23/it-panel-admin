'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, Users, Award, AlertTriangle, Download } from 'lucide-react';

interface AnalysisData {
  totalStudents: number;
  totalSubjects: number;
  passPercentage: number;
  gradeDistribution: Record<string, number>;
  subjectWiseAnalysis: Record<string, {
    totalStudents: number;
    passCount: number;
    failCount: number;
    gradeDistribution: Record<string, number>;
  }>;
  topPerformers: Array<{
    regNo: string;
    name: string;
    totalGrades: number;
    excellentGrades: number;
  }>;
  needsAttention: Array<{
    regNo: string;
    name: string;
    failedSubjects: string[];
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

export function ResultAnalysis({ filters }: ResultAnalysisProps) {
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

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
          <p className="text-muted-foreground">No analysis data available</p>
        </CardContent>
      </Card>
    );
  }

  const subjects = Object.keys(analysisData.subjectWiseAnalysis);
  const currentSubjectData = selectedSubject === 'all' 
    ? null 
    : analysisData.subjectWiseAnalysis[selectedSubject];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Result Analysis Dashboard
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {filters.department} - {filters.batch} | Year {filters.year}, Semester {filters.semester}
          </p>
        </CardHeader>
      </Card>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Total Students</span>
            </div>
            <div className="text-2xl font-bold">{analysisData.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Pass Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {analysisData.passPercentage}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Subjects</span>
            </div>
            <div className="text-2xl font-bold">{analysisData.totalSubjects}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Need Attention</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {analysisData.needsAttention.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grade Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(analysisData.gradeDistribution)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, count]) => {
                const percentage = Math.round((count / (analysisData.totalStudents * analysisData.totalSubjects)) * 100);
                return (
                  <div key={grade} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={grade === 'U' || grade === 'RA' || grade === 'UA' ? 'destructive' : 'secondary'}
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
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                const passRate = Math.round((subjectData.passCount / subjectData.totalStudents) * 100);
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
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : currentSubjectData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
                    {Math.round((currentSubjectData.passCount / currentSubjectData.totalStudents) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Pass Rate</div>
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
              {analysisData.topPerformers.slice(0, 10).map((student, index) => (
                <div key={student.regNo} className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.regNo}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{student.excellentGrades}/{student.totalGrades}</div>
                    <div className="text-xs text-muted-foreground">Excellent grades</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Students Need Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysisData.needsAttention.slice(0, 10).map((student) => (
                <div key={student.regNo} className="p-3 bg-red-50 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">{student.regNo}</div>
                    </div>
                    <Badge variant="destructive">{student.failedSubjects.length} failed</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {student.failedSubjects.map(subject => (
                      <Badge key={subject} variant="outline" className="text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
