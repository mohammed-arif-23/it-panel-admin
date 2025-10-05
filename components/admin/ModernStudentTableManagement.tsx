"use client";

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import BulkStudentImport from './BulkStudentImport';
import {
  Database,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  Users,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface Student {
  id: string;
  register_number: string;
  name: string;
  email: string;
  mobile?: string;
  class_year: string;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

interface StudentTableManagementProps {
  onRefresh?: () => void;
  onExport?: (data: any[], filename: string) => void;
  formatDateTime?: (dateString: string) => string;
}

export default function ModernStudentTableManagement({
  onRefresh,
  onExport,
  formatDateTime = (date) => new Date(date).toLocaleString()
}: StudentTableManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'register_number' | 'name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    register_number: '',
    name: '',
    email: '',
    mobile: '',
    class_year: 'II-IT'
  });

  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    byClass: {
      'II-IT': 0,
      'III-IT': 0,
      'IV-IT': 0
    },
    verified: 0,
    unverified: 0
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
    calculateStats();
  }, [students, searchTerm, classFilter, verificationFilter, sortBy, sortOrder]);

  const fetchStudents = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/admin/students');
      const data = await response.json();
      
      if (data.success) {
        setStudents(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch students');
      }
    } catch (err) {
      setError('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(term) ||
        student.register_number?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term)
      );
    }

    // Class filter
    if (classFilter !== 'all') {
      filtered = filtered.filter(student => student.class_year === classFilter);
    }

    // Verification filter
    if (verificationFilter !== 'all') {
      const isVerified = verificationFilter === 'verified';
      filtered = filtered.filter(student => Boolean(student.email_verified) === isVerified);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'register_number':
          aValue = a.register_number || '';
          bValue = b.register_number || '';
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredStudents(filtered);
  };

  const calculateStats = () => {
    const total = students.length;
    const byClass = {
      'II-IT': students.filter(s => s.class_year === 'II-IT').length,
      'III-IT': students.filter(s => s.class_year === 'III-IT').length,
      'IV-IT': students.filter(s => s.class_year === 'IV-IT').length
    };
    const verified = students.filter(s => s.email_verified).length;
    const unverified = total - verified;

    setStats({ total, byClass, verified, unverified });
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!formData.register_number || formData.register_number.length !== 12) {
      errors.register_number = 'Register number must be exactly 12 digits';
    }

    if (!/^\d{12}$/.test(formData.register_number)) {
      errors.register_number = 'Register number must contain only digits';
    }

    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.class_year) {
      errors.class_year = 'Class year is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          ...formData
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student created successfully');
        setIsCreateModalOpen(false);
        resetForm();
        fetchStudents();
      } else {
        setError(data.error || 'Failed to create student');
      }
    } catch (err) {
      setError('Failed to create student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedStudent || !validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStudent.id,
          ...formData
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student updated successfully');
        setIsEditModalOpen(false);
        resetForm();
        fetchStudents();
      } else {
        setError(data.error || 'Failed to update student');
      }
    } catch (err) {
      setError('Failed to update student');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (student: Student) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Student deleted successfully');
        fetchStudents();
      } else {
        setError(data.error || 'Failed to delete student');
      }
    } catch (err) {
      setError('Failed to delete student');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      register_number: '',
      name: '',
      email: '',
      mobile: '',
      class_year: 'II-IT'
    });
    setValidationErrors({});
    setSelectedStudent(null);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      register_number: student.register_number,
      name: student.name || '',
      email: student.email || '',
      mobile: student.mobile || '',
      class_year: student.class_year || 'II-IT'
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (student: Student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleExport = () => {
    if (onExport) {
      const exportData = filteredStudents.map(student => ({
        'Register Number': student.register_number,
        'Name': student.name,
        'Email': student.email,
        'Mobile': student.mobile || 'N/A',
        'Class Year': student.class_year,
        'Email Verified': student.email_verified ? 'Yes' : 'No',
        'Created At': formatDateTime(student.created_at),
        'Updated At': formatDateTime(student.updated_at)
      }));
      onExport(exportData, 'students');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-6 w-6" />
            Student Database Management
          </h1>
          <p className="text-gray-600 mt-1">Manage unified_students table records</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchStudents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Unverified</p>
                <p className="text-2xl font-bold text-orange-600">{stats.unverified}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">By Class</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>II-IT</span>
                  <span className="font-medium">{stats.byClass['II-IT']}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>III-IT</span>
                  <span className="font-medium">{stats.byClass['III-IT']}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>IV-IT</span>
                  <span className="font-medium">{stats.byClass['IV-IT']}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Operations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BulkStudentImport />
        
        {/* Export Section */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Export Students
            </CardTitle>
            <CardDescription>
              Export student data to Excel format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">Student Records</CardTitle>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="II-IT">II-IT</SelectItem>
                <SelectItem value="III-IT">III-IT</SelectItem>
                <SelectItem value="IV-IT">IV-IT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={verificationFilter} onValueChange={setVerificationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="verified">Verified Only</SelectItem>
                <SelectItem value="unverified">Unverified Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: 'register_number' | 'name' | 'created_at') => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="register_number">Register Number</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created_at">Created Date</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1"
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setClassFilter('all');
                  setVerificationFilter('all');
                  setSortBy('created_at');
                  setSortOrder('desc');
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </div>

          {/* Students Table */}
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No students found</p>
              <p className="text-sm text-gray-400">
                {students.length === 0 ? 'No students in database' : 'Try adjusting your filters'}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => {
                        if (sortBy === 'register_number') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('register_number');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Register Number
                        {sortBy === 'register_number' ? (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => {
                        if (sortBy === 'name') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('name');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none"
                      onClick={() => {
                        if (sortBy === 'created_at') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('created_at');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {sortBy === 'created_at' ? (
                          sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">
                        {student.register_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {student.email || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.class_year}</Badge>
                      </TableCell>
                      <TableCell>
                        {student.email_verified ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Unverified
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(student.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(student)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(student)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {student.name} ({student.register_number})?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(student)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open: boolean) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isCreateModalOpen ? 'Add New Student' : 'Edit Student'}
            </DialogTitle>
            <DialogDescription>
              {isCreateModalOpen 
                ? 'Create a new student record in the database'
                : 'Update the selected student record'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="register_number">Register Number *</Label>
              <Input
                id="register_number"
                value={formData.register_number}
                onChange={(e) => setFormData({...formData, register_number: e.target.value})}
                placeholder="Enter 12-digit register number"
                className={validationErrors.register_number ? 'border-red-300' : ''}
              />
              {validationErrors.register_number && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.register_number}</p>
              )}
            </div>

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter full name"
                className={validationErrors.name ? 'border-red-300' : ''}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="Enter email address"
                className={validationErrors.email ? 'border-red-300' : ''}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                placeholder="Enter mobile number (optional)"
              />
            </div>

            <div>
              <Label htmlFor="class_year">Class Year *</Label>
              <Select
                value={formData.class_year}
                onValueChange={(value) => setFormData({...formData, class_year: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="II-IT">II-IT</SelectItem>
                  <SelectItem value="III-IT">III-IT</SelectItem>
                  <SelectItem value="IV-IT">IV-IT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={isCreateModalOpen ? handleCreate : handleUpdate}
                disabled={isLoading}
              >
                {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {isCreateModalOpen ? 'Create Student' : 'Update Student'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>
              View complete student information
            </DialogDescription>
          </DialogHeader>
          
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Register Number</Label>
                  <p className="font-mono text-sm">{selectedStudent.register_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Class Year</Label>
                  <p className="text-sm">{selectedStudent.class_year}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                <p className="text-sm">{selectedStudent.name || 'N/A'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Email Address</Label>
                <p className="text-sm">{selectedStudent.email || 'N/A'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Mobile Number</Label>
                <p className="text-sm">{selectedStudent.mobile || 'N/A'}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Email Verification</Label>
                <div className="mt-1">
                  {selectedStudent.email_verified ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Created At</Label>
                  <p className="text-xs text-gray-500">{formatDateTime(selectedStudent.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Updated At</Label>
                  <p className="text-xs text-gray-500">{formatDateTime(selectedStudent.updated_at)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success/Error Messages */}
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            {success}
          </div>
        </div>
      )}
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          <div className="flex items-center">
            <XCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
