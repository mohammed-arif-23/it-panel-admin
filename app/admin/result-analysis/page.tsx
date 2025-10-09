'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { ResultAnalysis } from '@/components/admin/ResultAnalysis';

interface FilterOptions {
  batches: string[];
  departments: string[];
  years: number[];
  semesters: number[];
}

export default function ResultAnalysisPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
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
  const [loadingFilters, setLoadingFilters] = useState(true);

  // Fetch filter options from MongoDB
  const fetchFilterOptions = async () => {
    try {
      setLoadingFilters(true);
      const response = await fetch('/api/results/filters');
      const data = await response.json();
      
      if (response.ok) {
        setFilterOptions(data);
      } else {
        console.error('Failed to fetch filter options:', data.error);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFilterOptions();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Result Analysis Dashboard</h1>
            <p className="text-slate-600">Comprehensive analytics and insights for student results</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Select Result Sheet
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFilterOptions}
                disabled={loadingFilters}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loadingFilters ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFilters ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <span className="ml-2">Loading filter options...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Batch</label>
                  <Select value={filters.batch} onValueChange={(value) => setFilters(prev => ({ ...prev, batch: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select batch" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.batches.map(batch => (
                        <SelectItem key={batch} value={batch}>{batch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Department</label>
                  <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.departments.map(dept => (
                        <SelectItem key={dept} value={dept}>
                          {dept === 'IT' ? 'Information Technology' :
                           dept === 'CSE' ? 'Computer Science & Engineering' :
                           dept === 'ECE' ? 'Electronics & Communication' :
                           dept === 'EEE' ? 'Electrical & Electronics' :
                           dept === 'MECH' ? 'Mechanical Engineering' :
                           dept === 'CIVIL' ? 'Civil Engineering' : dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Year</label>
                  <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year === 1 ? '1st Year' :
                           year === 2 ? '2nd Year' :
                           year === 3 ? '3rd Year' :
                           year === 4 ? '4th Year' : `${year}th Year`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Semester</label>
                  <Select value={filters.semester} onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterOptions.semesters.map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>
                          {sem === 1 ? '1st Semester' : '2nd Semester'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analysis Component */}
        <ResultAnalysis filters={filters} />
      </div>
    </div>
  );
}
