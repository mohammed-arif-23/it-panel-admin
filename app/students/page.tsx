"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Filter,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';
import { ExcelExportDialog, ExcelExportField } from '@/components/admin/ExcelExportDialog';
import { useExcelExport } from '@/hooks/useExcelExport';

interface Student {
  id: string;
  register_number: string;
  name: string;
  email: string;
  mobile: string | null;
  class_year: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export default function StudentsManagement() {
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'none' | 'delete' | 'export'>('none');
  const studentsPerPage = 20;

  // Excel export configuration
  const exportFields: ExcelExportField[] = [
    { key: 'register_number', label: 'Register Number', selected: true },
    { key: 'name', label: 'Student Name', selected: true },
    { key: 'email', label: 'Email Address', selected: true },
    { key: 'mobile', label: 'Mobile Number', selected: true },
    { key: 'class_year', label: 'Class/Year', selected: true },
    { key: 'email_verified', label: 'Email Verified', selected: true, formatter: (v) => v ? 'Yes' : 'No' },
    { key: 'created_at', label: 'Registration Date', selected: true, formatter: (v) => new Date(v).toLocaleDateString() },
    { key: 'updated_at', label: 'Last Updated', selected: false, formatter: (v) => new Date(v).toLocaleDateString() },
  ];

  const {
    isExportDialogOpen,
    exportFields: fields,
    openExportDialog,
    closeExportDialog
  } = useExcelExport({
    data: selectedStudents.length > 0 ? students.filter(s => selectedStudents.includes(s.id)) : filteredStudents,
    fields: exportFields,
    fileName: 'students_list',
    sheetName: 'Students'
  });

  // Redirect if not authenticated or not authorized
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || userRole === 'STAFF')) {
      router.push('/admin');
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  // Fetch students
  useEffect(() => {
    if (isAuthenticated && userRole === 'HOD') {
      fetchStudents();
    }
  }, [isAuthenticated, userRole, currentPage, classFilter, verificationFilter]);

  // Filter students based on search term
  useEffect(() => {
    let result = students;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(student => 
        student.name.toLowerCase().includes(term) ||
        student.register_number.toLowerCase().includes(term) ||
        student.email.toLowerCase().includes(term)
      );
    }
    
    // Apply class filter
    if (classFilter !== 'all') {
      result = result.filter(student => student.class_year === classFilter);
    }
    
    // Apply verification filter
    if (verificationFilter !== 'all') {
      const isVerified = verificationFilter === 'verified';
      result = result.filter(student => student.email_verified === isVerified);
    }
    
    setFilteredStudents(result);
  }, [students, searchTerm, classFilter, verificationFilter]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/admin/students?page=${currentPage}&limit=${studentsPerPage}&class=${classFilter}&verification=${verificationFilter}&search=${searchTerm}`);
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data);
        setTotalPages(data.totalPages);
        setTotalCount(data.count);
      } else {
        setError(data.error || 'Failed to fetch students');
      }
    } catch (err) {
      setError('Failed to fetch students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchStudents();
  };

  const handleViewStudent = (studentId: string) => {
    router.push(`/students/${studentId}`);
  };

  const handleEditStudent = (studentId: string) => {
    router.push(`/students/edit/${studentId}`);
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/admin/students', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: studentId }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchStudents(); // Refresh the list
        // Remove from selected students if it was selected
        setSelectedStudents(prev => prev.filter(id => id !== studentId));
      } else {
        alert(data.error || 'Failed to delete student');
      }
    } catch (err) {
      alert('Failed to delete student');
      console.error('Error deleting student:', err);
    }
  };

  const handleAddStudent = () => {
    router.push('/students/create');
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(student => student.id));
    }
  };

  const handleBulkAction = async () => {
    if (bulkAction === 'none') return;
    
    if (bulkAction === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedStudents.length} students? This action cannot be undone.`)) {
        return;
      }
      
      try {
        const response = await fetch('/api/admin/students/bulk-delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: selectedStudents }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          fetchStudents(); // Refresh the list
          setSelectedStudents([]);
          setBulkAction('none');
          alert(`${data.deletedCount} students deleted successfully`);
        } else {
          alert(data.error || 'Failed to delete students');
        }
      } catch (err) {
        alert('Failed to delete students');
        console.error('Error deleting students:', err);
      }
    } else if (bulkAction === 'export') {
      openExportDialog();
      setSelectedStudents([]);
      setBulkAction('none');
    }
  };

  // Show loading while checking auth
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

  // Redirect if not authorized
  if (!isAuthenticated || userRole !== 'HOD') {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="max-w-md text-center p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            You don't have permission to access this page. Only HOD users can manage students.
          </p>
          <Button onClick={() => router.push('/admin')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--color-background)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border-light)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Student Management</h1>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Manage all student accounts and registrations
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={openExportDialog}
                  disabled={loading || filteredStudents.length === 0}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="sm" onClick={handleAddStudent}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="saas-card mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                  <Input
                    placeholder="Search by name, register number, or email..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <select
                      className="pl-10 pr-8 py-2 border border-[var(--color-border-light)] rounded-xl bg-[var(--color-background)] text-sm"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="all">All Classes</option>
                      <option value="II-IT">II-IT</option>
                      <option value="III-IT">III-IT</option>
                    </select>
                  </div>
                  
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <select
                      className="pl-10 pr-8 py-2 border border-[var(--color-border-light)] rounded-xl bg-[var(--color-background)] text-sm"
                      value={verificationFilter}
                      onChange={(e) => setVerificationFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Total Students</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{totalCount}</p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Verified Accounts</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {students.filter(s => s.email_verified).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Pending Verification</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {students.filter(s => !s.email_verified).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Eye className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          {selectedStudents.length > 0 && (
            <Card className="saas-card mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedStudents([])}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      className="px-3 py-2 border border-blue-300 rounded-lg bg-white text-sm"
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value as any)}
                    >
                      <option value="none">Select action</option>
                      <option value="delete">Delete selected</option>
                      <option value="export">Export selected</option>
                    </select>
                    <Button 
                      size="sm"
                      onClick={handleBulkAction}
                      disabled={bulkAction === 'none'}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students Table */}
          <Card className="saas-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Student Records</span>
                <span className="text-sm font-normal text-[var(--color-text-muted)]">
                  Showing {filteredStudents.length} of {totalCount} students
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-center py-8">
                  <p className="text-red-500">{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-muted)]">No students found</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={handleAddStudent}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Student
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border-light)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)] w-12">
                          <input
                            type="checkbox"
                            checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                            onChange={handleSelectAll}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Register Number</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Class</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-accent)]">
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-[var(--color-text-primary)]">
                            {student.register_number}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                            {student.name}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                            {student.email}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                            <span className="px-2 py-1 bg-[var(--color-accent)] rounded-full text-xs">
                              {student.class_year}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {student.email_verified ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                Verified
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewStudent(student.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditStudent(student.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteStudent(student.id, student.name)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-4 mt-4">
                  <div className="text-sm text-[var(--color-text-muted)]">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Excel Export Dialog */}
        <ExcelExportDialog
          isOpen={isExportDialogOpen}
          onClose={closeExportDialog}
          title="Export Students Data"
          data={selectedStudents.length > 0 ? students.filter(s => selectedStudents.includes(s.id)) : filteredStudents}
          fields={fields}
          fileName="students_list"
          sheetName="Students"
          headerTitle="IT Department - Student Management"
          headerSubtitle={`Students Export Report - ${selectedStudents.length > 0 ? 'Selected Students' : 'All Students'}`}
        />
      </div>
    </PageTransition>
  );
}