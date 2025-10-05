'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DollarSign, 
  Plus, 
  Save, 
  X, 
  Edit, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  User,
  Trash2,
  Calendar,
  Eye
} from 'lucide-react'
import FineCreationPanel from './FineCreationPanel'
import { exportArrayToExcel } from '@/lib/exportExcel'

interface Fine {
  id: string
  student_id: string
  fine_type: string
  reference_date: string
  base_amount: number
  payment_status: string
  paid_amount?: number
  created_at: string
  unified_students?: {
    id: string
    register_number: string
    name: string
    email: string
    class_year: string
  }
}

interface Student {
  id: string
  register_number: string
  name: string
  email: string
  class_year: string
}

interface ModernFineManagementProps {
  fines: Fine[]
  isLoading: boolean
  filters: {
    class: string
    status: string
    type: string
  }
  onFiltersChange: (filters: any) => void
  onRefresh: () => void
  onAddFine: (fine: any) => Promise<void>
  onUpdateFine: (id: string, status: string, amount?: number) => Promise<void>
  onExport: () => void
  formatDateTime: (date: string) => string
}

export default function ModernFineManagement({
  fines,
  isLoading,
  filters,
  onFiltersChange,
  onRefresh,
  onAddFine,
  onUpdateFine,
  onExport,
  formatDateTime
}: ModernFineManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingFine, setEditingFine] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState<number>(0)
  const [newFine, setNewFine] = useState({
    student_id: '',
    fine_type: 'seminar_no_booking',
    reference_date: new Date().toISOString().split('T')[0],
    amount: 10
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<keyof Fine | 'student_name' | 'student_register' | 'student_class' | 'payment_status'>('created_at' as any)
  const [sortAsc, setSortAsc] = useState<boolean>(false)
  const [columnsDialog, setColumnsDialog] = useState(false)
  const allColumns = [
    { key: 'student_name', label: 'Student' },
    { key: 'student_register', label: 'Register No.' },
    { key: 'student_class', label: 'Class' },
    { key: 'fine_type', label: 'Type' },
    { key: 'base_amount', label: 'Amount' },
    { key: 'payment_status', label: 'Status' },
    { key: 'reference_date', label: 'Date' },
  ] as const
  const [selectedColumns, setSelectedColumns] = useState<string[]>(allColumns.map(c => c.key))
  
  // Row selection helpers
  const isAllSelected = fines.length > 0 && selectedIds.length === fines.length
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < fines.length

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(fines.map(f => f.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const set = new Set(prev)
      if (checked) set.add(id); else set.delete(id)
      return Array.from(set)
    })
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} selected fine(s)? This action cannot be undone.`)) return
    try {
      const res = await fetch('/api/admin/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_delete_by_ids', ids: selectedIds })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(`Failed to delete selected: ${data.error || res.statusText}`)
        return
      }
      setSelectedIds([])
      onRefresh()
    } catch (e) {
      console.error('Bulk delete error:', e)
      alert('Failed to delete selected fines')
    }
  }
  
  // Bulk delete states
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleteFilters, setBulkDeleteFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    fine_type: 'all',
    class_year: 'all'
  })
  const [previewFines, setPreviewFines] = useState<Fine[]>([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  
  // Bulk create states
  const [showBulkCreate, setShowBulkCreate] = useState(false)
  
  // Student search states
  const [students, setStudents] = useState<Student[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  // Fetch students based on search query
  const fetchStudents = async (search: string) => {
    if (search.length < 2) {
      setStudents([])
      return
    }
    
    setIsLoadingStudents(true)
    try {
      const params = new URLSearchParams({
        search,
        class: 'all'
      })
      const response = await fetch(`/api/admin/students?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setStudents(data.data || [])
      } else {
        console.error('Students API error:', data.error)
        setStudents([])
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
      setStudents([])
    } finally {
      setIsLoadingStudents(false)
    }
  }

  // Handle student search input change
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (studentSearch) {
        fetchStudents(studentSearch)
      } else {
        setStudents([])
      }
    }, 300) // 300ms delay for debouncing
    
    return () => clearTimeout(delayedSearch)
  }, [studentSearch])

  // Handle student selection
  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student)
    setNewFine(prev => ({
      ...prev,
      student_id: student.id
    }))
    setStudentSearch(`${student.name} (${student.register_number})`)
    setShowStudentDropdown(false)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.student-search-container')) {
        setShowStudentDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Use the student_id from selectedStudent if newFine.student_id is not set
    const studentId = newFine.student_id || selectedStudent?.id
    if (!studentId) {
      alert('Please select a student')
      return
    }
    
    const fineToSubmit = {
      ...newFine,
      student_id: studentId
    }
    
    try {
      await onAddFine(fineToSubmit)
      setNewFine({
        student_id: '',
        fine_type: 'seminar_no_booking',
        reference_date: new Date().toISOString().split('T')[0],
        amount: 10
      })
      setSelectedStudent(null)
      setStudentSearch('')
      setStudents([])
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding fine:', error)
    }
  }, [selectedStudent, newFine, onAddFine])

  const handleEditFine = (fine: Fine) => {
    setEditingFine(fine.id)
    setEditAmount(fine.base_amount)
  }

  const handleSaveFine = async (fineId: string, fine: Fine) => {
    try {
      // If amount was changed, update with pending status and new amount
      // If it's being marked as paid, use paid status
      const status = editAmount !== fine.base_amount ? 'pending' : 'paid'
      await onUpdateFine(fineId, status, editAmount)
      setEditingFine(null)
      setEditAmount(0)
    } catch (error) {
      console.error('Error updating fine:', error)
    }
  }

  const handleMarkAsPaid = async (fineId: string) => {
    if (!confirm('Are you sure you want to mark this fine as paid?')) {
      return
    }
    
    try {
      await onUpdateFine(fineId, 'paid', 0)
    } catch (error) {
      console.error('Error marking fine as paid:', error)
    }
  }

  const handleDeleteFine = async (fineId: string) => {
    if (!confirm('Are you sure you want to delete this fine? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/fines?id=${encodeURIComponent(fineId)}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(`Failed to delete fine: ${data.error || res.statusText}`)
        return
      }
      onRefresh()
    } catch (error) {
      console.error('Error deleting fine:', error)
      alert('Failed to delete fine')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'waived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFineTypeLabel = (type: string) => {
    switch (type) {
      case 'seminar_no_booking': return 'Seminar No Booking'
      case 'assignment_late': return 'Assignment Late'
      case 'attendance_absent': return 'Attendance Absent'
      default: return type.replace('_', ' ').toUpperCase()
    }
  }

  const totalPending = fines.filter(f => f.payment_status === 'pending').length
  const totalPaid = fines.filter(f => f.payment_status === 'paid').length
  const totalAmount = fines.reduce((sum, f) => sum + f.base_amount, 0)

  // Bulk delete functions
  const handlePreviewBulkDelete = async () => {
    if (!bulkDeleteFilters.date) {
      alert('Please select a date')
      return
    }

    setIsLoadingPreview(true)
    try {
      const params = new URLSearchParams({
        date: bulkDeleteFilters.date,
        fine_type: bulkDeleteFilters.fine_type,
        class_year: bulkDeleteFilters.class_year
      })
      
      const response = await fetch(`/api/admin/fines/bulk-delete?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setPreviewFines(data.fines || [])
      } else {
        alert(`Failed to preview fines: ${data.error}`)
        setPreviewFines([])
      }
    } catch (error) {
      console.error('Error previewing fines:', error)
      alert('Failed to preview fines')
      setPreviewFines([])
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const handleBulkDelete = async () => {
    if (previewFines.length === 0) {
      alert('No fines to delete')
      return
    }

    const confirmMessage = `Are you sure you want to delete ${previewFines.length} fine(s) for ${bulkDeleteFilters.date}?\n\nThis action cannot be undone.`
    
    if (!confirm(confirmMessage)) {
      return
    }

    setIsDeletingBulk(true)
    try {
      const response = await fetch('/api/admin/fines/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkDeleteFilters)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Successfully deleted ${data.deleted_count} fine(s)`)
        setPreviewFines([])
        setShowBulkDelete(false)
        onRefresh() // Refresh the main fines list
      } else {
        alert(`Failed to delete fines: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting fines:', error)
      alert('Failed to delete fines')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  const sortedFines = [...fines].sort((a, b) => {
    const getVal = (f: Fine) => {
      switch (sortBy) {
        case 'student_name': return f.unified_students?.name || ''
        case 'student_register': return f.unified_students?.register_number || ''
        case 'student_class': return f.unified_students?.class_year || ''
        default: return (f as any)[sortBy]
      }
    }
    const av = getVal(a); const bv = getVal(b)
    if (av === bv) return 0
    return (av > bv ? 1 : -1) * (sortAsc ? 1 : -1)
  })

  const exportSelectedColumns = () => {
    const rows = sortedFines.map(f => ({
      student_name: f.unified_students?.name || '',
      student_register: f.unified_students?.register_number || '',
      student_class: f.unified_students?.class_year || '',
      fine_type: f.fine_type,
      base_amount: f.base_amount,
      payment_status: f.payment_status,
      reference_date: f.reference_date,
    }))
    const headerMap: Record<string, string> = {}
    allColumns.forEach(c => headerMap[c.key] = c.label)
    exportArrayToExcel(rows, 'fines', selectedColumns, headerMap)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Fine Management</h2>
          <p className="text-gray-600">Manage student fines and penalties</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowBulkCreate(!showBulkCreate)}
            variant="outline"
            className="border-green-200 text-green-600 hover:bg-green-50"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Bulk Create
          </Button>
          <Button
            onClick={() => setShowBulkDelete(!showBulkDelete)}
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Bulk Delete
          </Button>
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Fine
          </Button>
        </div>
      </div>

      {/* Add Fine Form */}
      {showAddForm && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900">Create New Fine</CardTitle>
            <CardDescription>Add a fine for a student</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="student_search">Search Student *</Label>
                  <div className="relative student-search-container">
                    <div className="relative">
                      <Input
                        id="student_search"
                        value={studentSearch}
                        onChange={(e) => {
                          const value = e.target.value
                          setStudentSearch(value)
                          setShowStudentDropdown(true)
                          
                          // Only reset student if the user is typing something different
                          // than the selected student display text
                          if (selectedStudent) {
                            const selectedDisplayText = `${selectedStudent.name} (${selectedStudent.register_number})`
                            if (value !== selectedDisplayText && !selectedDisplayText.toLowerCase().includes(value.toLowerCase())) {
                              setSelectedStudent(null)
                              setNewFine(prev => ({...prev, student_id: ''}))
                            }
                          } else if (!value) {
                            setSelectedStudent(null)
                            setNewFine(prev => ({...prev, student_id: ''}))
                          }
                        }}
                        onFocus={() => setShowStudentDropdown(true)}
                        placeholder="Type student name or register number"
                        className="bg-white pl-10"
                        required
                      />
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>
                    
                    {/* Student Dropdown */}
                    {showStudentDropdown && (studentSearch.length >= 2 || students.length > 0) && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {isLoadingStudents ? (
                          <div className="flex items-center justify-center p-3">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-gray-600">Searching...</span>
                          </div>
                        ) : students.length > 0 ? (
                          students.map((student) => (
                            <div
                              key={student.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => handleStudentSelect(student)}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <User className="h-8 w-8 text-gray-400 bg-gray-100 rounded-full p-1" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {student.name}
                                  </p>
                                  <p className="text-sm text-gray-500 truncate">
                                    {student.register_number} • {student.class_year}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">
                                    {student.email}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : studentSearch.length >= 2 ? (
                          <div className="p-3 text-center text-sm text-gray-500">
                            No students found matching "{studentSearch}"
                          </div>
                        ) : (
                          <div className="p-3 text-center text-sm text-gray-500">
                            Type at least 2 characters to search
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Student Indicator */}
                  {selectedStudent && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800">
                          Selected: {selectedStudent.name} ({selectedStudent.register_number})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="fine_type">Fine Type *</Label>
                  <Select
                    value={newFine.fine_type}
                    onValueChange={(value) => setNewFine({...newFine, fine_type: value})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="seminar_no_booking">Seminar No Booking</SelectItem>
                      <SelectItem value="assignment_late">Assignment Late</SelectItem>
                      <SelectItem value="attendance_absent">Attendance Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reference_date">Reference Date *</Label>
                  <Input
                    id="reference_date"
                    type="date"
                    value={newFine.reference_date}
                    onChange={(e) => setNewFine({...newFine, reference_date: e.target.value})}
                    className="bg-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={newFine.amount}
                    onChange={(e) => setNewFine({...newFine, amount: Number(e.target.value)})}
                    className="bg-white"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  Create Fine
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewFine({
                      student_id: '',
                      fine_type: 'seminar_no_booking',
                      reference_date: new Date().toISOString().split('T')[0],
                      amount: 10
                    })
                    setSelectedStudent(null)
                    setStudentSearch('')
                    setStudents([])
                    setShowStudentDropdown(false)
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bulk Create Form */}
      {showBulkCreate && (
        <div className="space-y-4">
          <FineCreationPanel />
        </div>
      )}

      {/* Bulk Delete Form */}
      {showBulkDelete && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-900">Bulk Delete Fines</CardTitle>
            <CardDescription>Delete multiple fines for a specific date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="bulk_date">Date *</Label>
                  <Input
                    id="bulk_date"
                    type="date"
                    value={bulkDeleteFilters.date}
                    onChange={(e) => setBulkDeleteFilters({...bulkDeleteFilters, date: e.target.value})}
                    className="bg-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bulk_fine_type">Fine Type</Label>
                  <Select
                    value={bulkDeleteFilters.fine_type}
                    onValueChange={(value) => setBulkDeleteFilters({...bulkDeleteFilters, fine_type: value})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="seminar_no_booking">Seminar No Booking</SelectItem>
                      <SelectItem value="assignment_late">Assignment Late</SelectItem>
                      <SelectItem value="attendance_absent">Attendance Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bulk_class_year">Class</Label>
                  <Select
                    value={bulkDeleteFilters.class_year}
                    onValueChange={(value) => setBulkDeleteFilters({...bulkDeleteFilters, class_year: value})}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="II-IT">II-IT</SelectItem>
                      <SelectItem value="III-IT">III-IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handlePreviewBulkDelete}
                    disabled={isLoadingPreview || !bulkDeleteFilters.date}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {isLoadingPreview ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview
                  </Button>
                </div>
              </div>

              {/* Preview Results */}
              {previewFines.length > 0 && (
                <div className="mt-4 p-4 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-red-900">
                      Found {previewFines.length} fine(s) to delete
                    </h4>
                    <Badge className="bg-red-100 text-red-800">
                      Total: ₹{previewFines.reduce((sum, f) => sum + f.base_amount, 0)}
                    </Badge>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Student</TableHead>
                          <TableHead className="text-xs">Register No.</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewFines.map((fine) => (
                          <TableRow key={fine.id} className="text-sm">
                            <TableCell>{fine.unified_students?.name || 'Unknown'}</TableCell>
                            <TableCell>{fine.unified_students?.register_number || '-'}</TableCell>
                            <TableCell>{getFineTypeLabel(fine.fine_type)}</TableCell>
                            <TableCell>₹{fine.base_amount}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(fine.payment_status)}>
                                {fine.payment_status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {previewFines.length === 0 && !isLoadingPreview && bulkDeleteFilters.date && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No fines found for the selected criteria</p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk || previewFines.length === 0}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeletingBulk ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  {isDeletingBulk ? 'Deleting...' : `Delete ${previewFines.length} Fine(s)`}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBulkDelete(false)
                    setPreviewFines([])
                    setBulkDeleteFilters({
                      date: new Date().toISOString().split('T')[0],
                      fine_type: 'all',
                      class_year: 'all'
                    })
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fine Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Fines</p>
                <p className="text-3xl font-bold text-gray-900">{fines.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{totalPending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid</p>
                <p className="text-3xl font-bold text-green-600">{totalPaid}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900">₹{totalAmount}</p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <Label>Class Filter</Label>
            <Select
              value={filters.class}
              onValueChange={(value) => onFiltersChange({...filters, class: value})}
            >
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200">
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="II-IT">II-IT</SelectItem>
                <SelectItem value="III-IT">III-IT</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Label>Status Filter</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => onFiltersChange({...filters, status: value})}
            >
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="waived">Waived</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Label>Type Filter</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => onFiltersChange({...filters, type: value})}
            >
              <SelectTrigger className="mt-2 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="seminar_no_booking">Seminar No Booking</SelectItem>
                <SelectItem value="assignment_late">Assignment Late</SelectItem>
                <SelectItem value="attendance_absent">Attendance Absent</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Label>Actions</Label>
            <div className="mt-2 space-y-2">
              <Button
                onClick={onRefresh}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button
                onClick={() => setColumnsDialog(true)}
                variant="outline"
                className="w-full"
                size="sm"
                disabled={fines.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={handleDeleteSelected}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                size="sm"
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fine Records</CardTitle>
          <CardDescription>Manage student fines and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Loading fines...</span>
            </div>
          ) : fines.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No fines found</p>
              <p className="text-sm text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected ? true : (isIndeterminate ? 'indeterminate' : false)}
                        onCheckedChange={(v) => toggleSelectAll(!!v)}
                        aria-label="Select all"
                        className={isIndeterminate ? 'data-[state=indeterminate]:opacity-100' : ''}
                      />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'student_name') setSortAsc(!sortAsc); else { setSortBy('student_name'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Student {sortBy === 'student_name' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'student_register') setSortAsc(!sortAsc); else { setSortBy('student_register'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Register No. {sortBy === 'student_register' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'student_class') setSortAsc(!sortAsc); else { setSortBy('student_class'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Class {sortBy === 'student_class' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'fine_type') setSortAsc(!sortAsc); else { setSortBy('fine_type'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Type {sortBy === 'fine_type' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'base_amount') setSortAsc(!sortAsc); else { setSortBy('base_amount'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Amount {sortBy === 'base_amount' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'payment_status') setSortAsc(!sortAsc); else { setSortBy('payment_status'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Status {sortBy === 'payment_status' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => { if (sortBy === 'reference_date') setSortAsc(!sortAsc); else { setSortBy('reference_date'); setSortAsc(true) } }}
                    >
                      <div className="flex items-center gap-1">Date {sortBy === 'reference_date' ? (sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-50" />}</div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFines.map((fine) => (
                    <TableRow key={fine.id}>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.includes(fine.id)}
                          onCheckedChange={(v) => toggleRow(fine.id, !!v)}
                          aria-label={`Select fine ${fine.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {fine.unified_students?.name || 'Unknown Student'}
                      </TableCell>
                      <TableCell>{fine.unified_students?.register_number || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={fine.unified_students?.class_year === 'II-IT' ? 'border-blue-200 text-blue-800' : 'border-green-200 text-green-800'}
                        >
                          {fine.unified_students?.class_year || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getFineTypeLabel(fine.fine_type)}</TableCell>
                      <TableCell>
                        {editingFine === fine.id ? (
                          <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(Number(e.target.value))}
                            className="w-20"
                            min="0"
                          />
                        ) : (
                          `₹${fine.base_amount}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(fine.payment_status)}>
                          {fine.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(fine.reference_date)}</TableCell>
                      <TableCell>
                        {editingFine === fine.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSaveFine(fine.id, fine)}
                              className="bg-blue-600 hover:bg-blue-700"
                              title="Save Amount"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                handleMarkAsPaid(fine.id)
                                setEditingFine(null)
                                setEditAmount(0)
                              }}
                              className="bg-green-600 hover:bg-green-700"
                              title="Mark as Paid"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingFine(null)
                                setEditAmount(0)
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditFine(fine)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(fine.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Mark as Paid"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteFine(fine.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Fine"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
