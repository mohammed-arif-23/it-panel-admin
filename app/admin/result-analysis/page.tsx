'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import ResultAnalysis from '@/components/admin/ResultAnalysis';

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
    if (filters.department) {
      loadYears();
    }
  }, [filters.department]);

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
    if (filters.year) {
      loadSemesters();
    }
  }, [filters.year]);

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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch</label>
                  <input
                    type="text"
                    value={filters.batch}
                    onChange={(e) => setFilters(prev => ({ ...prev, batch: e.target.value }))}
                    placeholder="e.g., 2023-2027"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Year</label>
                  <Select value={filters.year} onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {filterOptions.years.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          Year {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Semester</label>
                  <Select value={filters.semester} onValueChange={(value) => setFilters(prev => ({ ...prev, semester: value }))}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {filterOptions.semesters.map(sem => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
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
