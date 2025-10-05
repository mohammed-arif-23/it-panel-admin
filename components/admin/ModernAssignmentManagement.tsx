'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { 
  BookOpen, 
  Plus, 
  Save, 
  X, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  FileSpreadsheet,
  Users,
  Clock,
  Download,
  Eye,
  ArrowLeft,
  FileText,
  Edit,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Assignment {
  id: string
  title: string
  description: string
  class_year: string
  due_date: string
  created_at: string
  submission_count?: number
  graded_count?: number
  average_marks?: number
}

interface Student {
  id: string
  register_number: string
  name: string
  email: string
  class_year: string
  submissionDetails?: {
    id?: string
    submitted_at?: string
    marks?: number
    graded_at?: string
    file_url?: string
    status: 'submitted' | 'graded' | 'not_submitted'
  }
}

interface SubmissionData {
  assignment: Assignment
  submittedStudents: Student[]
  notSubmittedStudents: Student[]
  summary: {
    total: number
    submitted: number
    notSubmitted: number
    graded: number
    averageMarks: number
  }
}

interface ModernAssignmentManagementProps {
  assignments: Assignment[]
  isLoading: boolean
  onRefresh: () => void
  onAddAssignment: (assignment: any) => Promise<void>
  onUpdateAssignment?: (id: string, assignment: any) => Promise<void>
  onDeleteAssignment: (id: string, title: string) => Promise<void>
  formatDateTime: (date: string) => string
  exportToExcel?: (data: any[], filename: string) => void
}

export default function ModernAssignmentManagement({
  assignments,
  isLoading,
  onRefresh,
  onAddAssignment,
  onUpdateAssignment,
  onDeleteAssignment,
  formatDateTime,
  exportToExcel
}: ModernAssignmentManagementProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    class_year: '',
    due_date: ''
  })
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    class_year: '',
    due_date: ''
  })
  
  // Submission view states
  const [viewMode, setViewMode] = useState<'list' | 'submissions'>('list')
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionData, setSubmissionData] = useState<SubmissionData | null>(null)
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)
  const [submissionFilters, setSubmissionFilters] = useState({
    class: 'all',
    status: 'all' // all, submitted, not_submitted
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAssignment.title || !newAssignment.class_year || !newAssignment.due_date) {
      alert('Please fill in all required fields')
      return
    }
    
    try {
      await onAddAssignment(newAssignment)
      setNewAssignment({ title: '', description: '', class_year: '', due_date: '' })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding assignment:', error)
      alert('Failed to add assignment. Please try again.')
    }
  }

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
    const date = new Date(assignment.due_date)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`
    
    setEditForm({
      title: assignment.title,
      description: assignment.description,
      class_year: assignment.class_year,
      due_date: localDateTime
    })
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAssignment || !onUpdateAssignment) return
    
    if (!editForm.title || !editForm.class_year || !editForm.due_date) {
      alert('Please fill in all required fields')
      return
    }
    
    try {
      await onUpdateAssignment(editingAssignment.id, editForm)
      setEditingAssignment(null)
      setEditForm({ title: '', description: '', class_year: '', due_date: '' })
    } catch (error) {
      console.error('Error updating assignment:', error)
      alert('Failed to update assignment. Please try again.')
    }
  }

  // Fetch submission details for an assignment
  const fetchSubmissionDetails = async (assignment: Assignment) => {
    setIsLoadingSubmissions(true)
    setSelectedAssignment(assignment)
    setViewMode('submissions')
    
    try {
      const params = new URLSearchParams({
        assignment_id: assignment.id,
        class: submissionFilters.class,
        status: submissionFilters.status
      })
      
      const response = await fetch(`/api/admin/assignment-submissions?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setSubmissionData(data.data)
      } else {
        console.error('Submission data error:', data.error)
        setSubmissionData(null)
      }
    } catch (error) {
      console.error('Failed to fetch submission details:', error)
      setSubmissionData(null)
    } finally {
      setIsLoadingSubmissions(false)
    }
  }

  // Handle filter changes
  useEffect(() => {
    if (selectedAssignment) {
      fetchSubmissionDetails(selectedAssignment)
    }
  }, [submissionFilters])

  // Go back to assignments list
  const handleBackToList = () => {
    setViewMode('list')
    setSelectedAssignment(null)
    setSubmissionData(null)
  }

  // Calculate statistics
  const activeAssignments = assignments.filter(a => new Date(a.due_date) > new Date()).length
  const totalSubmissions = assignments.reduce((sum, a) => sum + (a.submission_count || 0), 0)
  const totalGraded = assignments.reduce((sum, a) => sum + (a.graded_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center space-x-4">
            {viewMode === 'submissions' && (
              <Button
                onClick={handleBackToList}
                variant="outline"
                size="sm"
                className="hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {viewMode === 'list' ? 'Assignment Management' : `Submissions: ${selectedAssignment?.title}`}
              </h2>
              <p className="text-gray-600">
                {viewMode === 'list' 
                  ? 'Create, manage, and track student assignments'
                  : `View submission details for ${selectedAssignment?.class_year} students`
                }
              </p>
            </div>
          </div>
        </div>
        {viewMode === 'list' && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Assignment
          </motion.button>
        )}
      </motion.div>

      {/* Add Assignment Form */}
      <AnimatePresence>
        {viewMode === 'list' && showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-t-lg">
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Create New Assignment
                </CardTitle>
                <CardDescription>Add a new assignment for students to submit</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title" className="text-gray-700">Assignment Title *</Label>
                      <Input
                        id="title"
                        value={newAssignment.title}
                        onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                        placeholder="Enter assignment title"
                        className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="class_year" className="text-gray-700">Class Year *</Label>
                      <Select
                        value={newAssignment.class_year}
                        onValueChange={(value) => setNewAssignment({...newAssignment, class_year: value})}
                      >
                        <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                          <SelectValue placeholder="Select class year" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200">
                          <SelectItem value="II-IT">II-IT (2nd Year)</SelectItem>
                          <SelectItem value="III-IT">III-IT (3rd Year)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-gray-700">Description</Label>
                    <textarea
                      id="description"
                      value={newAssignment.description}
                      onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                      placeholder="Enter assignment description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date" className="text-gray-700">Due Date & Time (IST) *</Label>
                    <Input
                      id="due_date"
                      type="datetime-local"
                      value={newAssignment.due_date}
                      onChange={(e) => setNewAssignment({...newAssignment, due_date: e.target.value})}
                      className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter time in Indian Standard Time (IST)</p>
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Create Assignment
                    </motion.button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        setNewAssignment({ title: '', description: '', class_year: '', due_date: '' })
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Assignment Form */}
      <AnimatePresence>
        {editingAssignment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6 border-orange-200 bg-gradient-to-br from-orange-50/50 to-amber-50/50 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit Assignment: {editingAssignment.title}
                </CardTitle>
                <CardDescription className="text-orange-100">
                  Update assignment details and due date
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="edit_title" className="text-gray-700">Assignment Title *</Label>
                    <Input
                      id="edit_title"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      placeholder="Enter assignment title"
                      className="bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_class_year" className="text-gray-700">Class Year *</Label>
                    <select
                      id="edit_class_year"
                      value={editForm.class_year}
                      onChange={(e) => setEditForm({...editForm, class_year: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all"
                      required
                    >
                      <option value="">Select Class Year</option>
                      <option value="II-IT">II-IT (2nd Year)</option>
                      <option value="III-IT">III-IT (3rd Year)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit_description" className="text-gray-700">Description</Label>
                    <textarea
                      id="edit_description"
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      placeholder="Enter assignment description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white transition-all"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_due_date" className="text-gray-700">Due Date & Time (IST) *</Label>
                    <Input
                      id="edit_due_date"
                      type="datetime-local"
                      value={editForm.due_date}
                      onChange={(e) => setEditForm({...editForm, due_date: e.target.value})}
                      className="bg-white border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter time in Indian Standard Time (IST)</p>
                  </div>
                  <div className="flex space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Update Assignment
                    </motion.button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingAssignment(null)
                        setEditForm({ title: '', description: '', class_year: '', due_date: '' })
                      }}
                      className="border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assignment Statistics */}
      {viewMode === 'list' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{assignments.length}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                  <p className="text-3xl font-bold text-green-600">
                    {activeAssignments}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Submissions</p>
                  <p className="text-3xl font-bold text-indigo-600">
                    {totalSubmissions}
                  </p>
                </div>
                <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Graded</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {totalGraded}
                  </p>
                </div>
                <div className="h-12 w-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}      

      {/* Assignments Table */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                All Assignments
              </CardTitle>
              <CardDescription>Manage and view assignment submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-600" />
                  <span className="text-blue-600">Loading assignments...</span>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                  <p className="text-gray-500 mb-4">Create your first assignment to get started.</p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Title</TableHead>
                        <TableHead className="font-semibold text-gray-700">Class Year</TableHead>
                        <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Submissions</TableHead>
                        <TableHead className="font-semibold text-gray-700">Created</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {assignments.map((assignment) => (
                          <motion.tr
                            key={assignment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="hover:bg-gray-50/50 transition-colors"
                          >
                            <TableCell className="font-medium text-gray-900">{assignment.title}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={assignment.class_year === 'II-IT' 
                                  ? 'border-blue-200 text-blue-800 bg-blue-50' 
                                  : 'border-green-200 text-green-800 bg-green-50'
                                }
                              >
                                {assignment.class_year}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDateTime(assignment.due_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(assignment.due_date) > new Date() ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Closed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{assignment.submission_count || 0}</span>
                                {assignment.graded_count !== undefined && assignment.graded_count > 0 && (
                                  <span className="text-xs text-amber-600">
                                    ({assignment.graded_count} graded)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600">
                              {formatDateTime(assignment.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-1">
                                <Button
                                  onClick={() => fetchSubmissionDetails(assignment)}
                                  variant="outline"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleEdit(assignment)}
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => onDeleteAssignment(assignment.id, assignment.title)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Submissions View */}
      {viewMode === 'submissions' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Submission Statistics */}
          {submissionData && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Students</p>
                      <p className="text-3xl font-bold text-gray-900">{submissionData.summary.total}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Submitted</p>
                      <p className="text-3xl font-bold text-green-600">{submissionData.summary.submitted}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Graded</p>
                      <p className="text-3xl font-bold text-amber-600">{submissionData.summary.graded}</p>
                    </div>
                    <FileSpreadsheet className="h-8 w-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Marks</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {submissionData.summary.averageMarks > 0 ? Math.round(submissionData.summary.averageMarks * 100) / 100 : '-'}
                      </p>
                    </div>
                    <BookOpen className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Not Submitted</p>
                      <p className="text-3xl font-bold text-red-600">{submissionData.summary.notSubmitted}</p>
                    </div>
                    <Clock className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="mb-6 bg-white/80 backdrop-blur-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4 items-end">
                <div>
                  <Label className="text-gray-700">Class Filter</Label>
                  <Select
                    value={submissionFilters.class}
                    onValueChange={(value) => setSubmissionFilters({...submissionFilters, class: value})}
                  >
                    <SelectTrigger className="mt-2 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">All Classes</SelectItem>
                      <SelectItem value="II-IT">II-IT</SelectItem>
                      <SelectItem value="III-IT">III-IT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700">Status Filter</Label>
                  <Select
                    value={submissionFilters.status}
                    onValueChange={(value) => setSubmissionFilters({...submissionFilters, status: value})}
                  >
                    <SelectTrigger className="mt-2 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="submitted">Submitted Only</SelectItem>
                      <SelectItem value="not_submitted">Not Submitted Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (exportToExcel && submissionData) {
                        exportToExcel([
                          ...submissionData.submittedStudents.map(s => ({
                            Register_Number: s.register_number,
                            Name: s.name,
                            Email: s.email,
                            Class: s.class_year,
                            Status: s.submissionDetails?.status || 'unknown',
                            Submitted_At: s.submissionDetails?.submitted_at || '-',
                            Marks: s.submissionDetails?.marks || '-'
                          })),
                          ...submissionData.notSubmittedStudents.map(s => ({
                            Register_Number: s.register_number,
                            Name: s.name,
                            Email: s.email,
                            Class: s.class_year,
                            Status: 'not_submitted',
                            Submitted_At: '-',
                            Marks: '-'
                          }))
                        ], `${selectedAssignment?.title}_submissions`)
                      }
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={!submissionData || !exportToExcel}
                  >
                    <Download className="h-4 w-4" />
                    Export to Excel
                  </motion.button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isLoadingSubmissions ? (
            <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2 text-blue-600" />
                  <span className="text-blue-600">Loading submission details...</span>
                </div>
              </CardContent>
            </Card>
          ) : submissionData ? (
            <>
              {/* Submitted Students */}
              {(submissionFilters.status === 'all' || submissionFilters.status === 'submitted') && submissionData.submittedStudents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6"
                >
                  <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                    <CardHeader className="bg-green-50/50 border-b border-green-200">
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Submitted Students ({submissionData.submittedStudents.length})
                      </CardTitle>
                      <CardDescription>Students who have submitted this assignment</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-green-50">
                              <TableHead className="font-semibold text-green-800">Register Number</TableHead>
                              <TableHead className="font-semibold text-green-800">Name</TableHead>
                              <TableHead className="font-semibold text-green-800">Email</TableHead>
                              <TableHead className="font-semibold text-green-800">Class</TableHead>
                              <TableHead className="font-semibold text-green-800">Submitted At</TableHead>
                              <TableHead className="font-semibold text-green-800">Marks</TableHead>
                              <TableHead className="font-semibold text-green-800">Status</TableHead>
                              <TableHead className="font-semibold text-green-800">View</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {submissionData.submittedStudents.map((student) => (
                              <motion.tr
                                key={student.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="hover:bg-green-50/50 transition-colors"
                              >
                                <TableCell className="font-medium text-gray-900">{student.register_number}</TableCell>
                                <TableCell className="text-gray-900">{student.name}</TableCell>
                                <TableCell className="text-gray-600">{student.email}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={student.class_year === 'II-IT' 
                                      ? 'border-blue-200 text-blue-800 bg-blue-50' 
                                      : 'border-green-200 text-green-800 bg-green-50'
                                    }
                                  >
                                    {student.class_year}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {student.submissionDetails?.submitted_at ? formatDateTime(student.submissionDetails.submitted_at) : '-'}
                                </TableCell>
                                <TableCell>
                                  {student.submissionDetails?.marks !== null && student.submissionDetails?.marks !== undefined
                                    ? student.submissionDetails.marks
                                    : '-'
                                  }
                                </TableCell>
                                <TableCell>
                                  <Badge className={student.submissionDetails?.status === 'graded' 
                                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                    : 'bg-green-100 text-green-800 border-green-200'
                                  }>
                                    {student.submissionDetails?.status || 'submitted'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    onClick={() => window.open(student.submissionDetails?.file_url || '', '_blank')}
                                    variant="outline"
                                    size="sm"
                                    disabled={!student.submissionDetails?.file_url}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 disabled:opacity-50"
                                  >
                                    <FileText className="h-4 w-4 mr-1" />
                                    View PDF
                                  </Button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Not Submitted Students */}
              {(submissionFilters.status === 'all' || submissionFilters.status === 'not_submitted') && submissionData.notSubmittedStudents.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
                    <CardHeader className="bg-red-50/50 border-b border-red-200">
                      <CardTitle className="text-red-800 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Not Submitted Students ({submissionData.notSubmittedStudents.length})
                      </CardTitle>
                      <CardDescription>Students who haven't submitted this assignment yet</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-red-50">
                              <TableHead className="font-semibold text-red-800">Register Number</TableHead>
                              <TableHead className="font-semibold text-red-800">Name</TableHead>
                              <TableHead className="font-semibold text-red-800">Email</TableHead>
                              <TableHead className="font-semibold text-red-800">Class</TableHead>
                              <TableHead className="font-semibold text-red-800">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {submissionData.notSubmittedStudents.map((student) => (
                              <motion.tr
                                key={student.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="hover:bg-red-50/50 transition-colors"
                              >
                                <TableCell className="font-medium text-gray-900">{student.register_number}</TableCell>
                                <TableCell className="text-gray-900">{student.name}</TableCell>
                                <TableCell className="text-gray-600">{student.email}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={student.class_year === 'II-IT' 
                                      ? 'border-blue-200 text-blue-800 bg-blue-50' 
                                      : 'border-green-200 text-green-800 bg-green-50'
                                    }
                                  >
                                    {student.class_year}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Not Submitted
                                  </Badge>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          ) : (
            <Card className="bg-white/80 backdrop-blur-sm border border-gray-200">
              <CardContent className="p-8">
                <div className="text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No submission data available</p>
                  <p className="text-sm text-gray-400">Unable to load submission details for this assignment.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  )
}