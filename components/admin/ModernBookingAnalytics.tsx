'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  FileSpreadsheet,
  Users,
  Clock,
  BookOpen,
  Filter
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Student {
  id: string
  register_number: string
  name: string
  email: string
  class_year: string
}

interface Booking {
  id: string
  student_id: string
  seminar_date: string
  booking_status: string
  created_at: string
  unified_students?: Student
}

interface BookingAnalytics {
  totalStudents: number
  totalBooked: number
  totalNotBooked: number
  bookedStudents: any[]
  notBookedStudents: Student[]
  bookingsByClass: {
    'II-IT': { total: number; booked: number; notBooked: number }
    'III-IT': { total: number; booked: number; notBooked: number }
  }
}

interface ModernBookingAnalyticsProps {
  isLoading: boolean
  onRefresh: () => void
  onExport: (data: any[], filename: string) => void
  formatDateTime: (date: string) => string
}

export default function ModernBookingAnalytics({
  isLoading,
  onRefresh,
  onExport,
  formatDateTime
}: ModernBookingAnalyticsProps) {
  const [selectedClass, setSelectedClass] = useState('all')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [viewMode, setViewMode] = useState<'overview' | 'booked' | 'not_booked'>('overview')
  const [bookingAnalytics, setBookingAnalytics] = useState<BookingAnalytics | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const fetchBookingAnalytics = async () => {
    setIsLoadingAnalytics(true)
    try {
      const params = new URLSearchParams({ 
        class: selectedClass,
        date: selectedDate 
      })
      const response = await fetch(`/api/admin/booking-analytics?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setBookingAnalytics(data.data)
      } else {
        console.error('Booking analytics API error:', data.error)
        setBookingAnalytics(null)
      }
    } catch (error) {
      console.error('Failed to fetch booking analytics:', error)
      setBookingAnalytics(null)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    fetchBookingAnalytics()
  }, [selectedClass, selectedDate])

  const handleRefresh = () => {
    fetchBookingAnalytics()
    onRefresh()
  }

  const handleExport = () => {
    if (!bookingAnalytics) {
      onExport([], `bookings_${selectedClass}_${selectedDate}`)
      return
    }

    let exportData: any[] = []
    let filename = `booking_status_${selectedClass}_${selectedDate}`

    if (viewMode === 'booked') {
      exportData = bookingAnalytics.bookedStudents.map((student: any) => ({
        'Register Number': student.register_number,
        Name: student.name,
        Email: student.email,
        Class: student.class_year,
        Status: 'Booked',
        'Seminar Topic': student.seminar_topic || '-',
        'Booking Date': student.booking_date || selectedDate,
        'Booked At': student.booking_time ? formatDateTime(student.booking_time) : '-'
      }))
    } else if (viewMode === 'not_booked') {
      exportData = bookingAnalytics.notBookedStudents.map((student: any) => ({
        'Register Number': student.register_number,
        Name: student.name,
        Email: student.email,
        Class: student.class_year,
        Status: 'Not Booked',
        'Seminar Topic': '-',
        'Booking Date': selectedDate,
        'Booked At': '-'
      }))
    } else {
      // overview: consolidated per-student list (Booked + Not Booked)
      exportData = [
        ...bookingAnalytics.bookedStudents.map((student: any) => ({
          'Register Number': student.register_number,
          Name: student.name,
          Email: student.email,
          Class: student.class_year,
          Status: 'Booked',
          'Seminar Topic': student.seminar_topic || '-',
          'Booking Date': student.booking_date || selectedDate,
          'Booked At': student.booking_time ? formatDateTime(student.booking_time) : '-'
        })),
        ...bookingAnalytics.notBookedStudents.map((student: any) => ({
          'Register Number': student.register_number,
          Name: student.name,
          Email: student.email,
          Class: student.class_year,
          Status: 'Not Booked',
          'Seminar Topic': '-',
          'Booking Date': selectedDate,
          'Booked At': '-'
        }))
      ]
    }

    // If chosen view produced no rows, fall back to consolidated list
    if (exportData.length === 0) {
      exportData = [
        ...bookingAnalytics.bookedStudents.map((student: any) => ({
          'Register Number': student.register_number,
          Name: student.name,
          Email: student.email,
          Class: student.class_year,
          Status: 'Booked',
          'Seminar Topic': student.seminar_topic || '-',
          'Booking Date': student.booking_date || selectedDate,
          'Booked At': student.booking_time ? formatDateTime(student.booking_time) : '-'
        })),
        ...bookingAnalytics.notBookedStudents.map((student: any) => ({
          'Register Number': student.register_number,
          Name: student.name,
          Email: student.email,
          Class: student.class_year,
          Status: 'Not Booked',
          'Seminar Topic': '-',
          'Booking Date': selectedDate,
          'Booked At': '-'
        }))
      ]
    }

    onExport(exportData, filename)
  }

  // Calculate booking rate
  const bookingRate = bookingAnalytics && bookingAnalytics.totalStudents > 0 
    ? Math.round((bookingAnalytics.totalBooked / bookingAnalytics.totalStudents) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Analytics</h2>
          <p className="text-gray-600">View seminar booking statistics and manage student bookings</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Options
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Filter seminar booking analytics by class and date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Date
                    </label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Class
                    </label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger className="bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200">
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="II-IT">II-IT</SelectItem>
                        <SelectItem value="III-IT">III-IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Overview */}
      {bookingAnalytics && (
        <>
          {/* Statistics Cards */}
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
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {bookingAnalytics.totalStudents}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Booked</p>
                    <p className="text-3xl font-bold text-green-600">
                      {bookingAnalytics.totalBooked}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Not Booked</p>
                    <p className="text-3xl font-bold text-red-600">
                      {bookingAnalytics.totalNotBooked}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Booking Rate</p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {bookingRate}%
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* View Mode Selection and Export */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={viewMode === 'overview' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('overview')}
                      className={viewMode === 'overview' ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    >
                      Overview
                    </Button>
                    <Button
                      variant={viewMode === 'booked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('booked')}
                      className={viewMode === 'booked' ? 'bg-green-600 hover:bg-green-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Booked ({bookingAnalytics.totalBooked})
                    </Button>
                    <Button
                      variant={viewMode === 'not_booked' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('not_booked')}
                      className={viewMode === 'not_booked' ? 'bg-red-600 hover:bg-red-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Not Booked ({bookingAnalytics.totalNotBooked})
                    </Button>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExport}
                    disabled={isLoadingAnalytics || !bookingAnalytics}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Download className="h-4 w-4" />
                    Export Status to Excel
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Student List */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  {viewMode === 'overview' ? (
                    <>
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      Class Summary
                    </>
                  ) : viewMode === 'booked' ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Students with Bookings
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Students without Bookings
                    </>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Selected Date: {selectedDate}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAnalytics ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-blue-600">Loading...</span>
                  </div>
                ) : viewMode === 'overview' ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-blue-800 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          II-IT Class
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Students:</span>
                            <span className="font-medium text-gray-900">
                              {bookingAnalytics.bookingsByClass['II-IT']?.total || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Booked:</span>
                            <span className="font-medium text-green-700">
                              {bookingAnalytics.bookingsByClass['II-IT']?.booked || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">Not Booked:</span>
                            <span className="font-medium text-red-700">
                              {bookingAnalytics.bookingsByClass['II-IT']?.notBooked || 0}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-200">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Booking Rate:</span>
                              <span className="font-medium text-indigo-700">
                                {bookingAnalytics.bookingsByClass['II-IT']?.total > 0
                                  ? Math.round((bookingAnalytics.bookingsByClass['II-IT']?.booked / bookingAnalytics.bookingsByClass['II-IT']?.total) * 100)
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 border-green-200">
                      <CardHeader>
                        <CardTitle className="text-green-800 flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          III-IT Class
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Students:</span>
                            <span className="font-medium text-gray-900">
                              {bookingAnalytics.bookingsByClass['III-IT']?.total || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-600">Booked:</span>
                            <span className="font-medium text-green-700">
                              {bookingAnalytics.bookingsByClass['III-IT']?.booked || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">Not Booked:</span>
                            <span className="font-medium text-red-700">
                              {bookingAnalytics.bookingsByClass['III-IT']?.notBooked || 0}
                            </span>
                          </div>
                          <div className="pt-2 border-t border-gray-200">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Booking Rate:</span>
                              <span className="font-medium text-indigo-700">
                                {bookingAnalytics.bookingsByClass['III-IT']?.total > 0
                                  ? Math.round((bookingAnalytics.bookingsByClass['III-IT']?.booked / bookingAnalytics.bookingsByClass['III-IT']?.total) * 100)
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">Register Number</TableHead>
                          <TableHead className="font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">Email</TableHead>
                          <TableHead className="font-semibold text-gray-700">Class</TableHead>
                          {viewMode === 'booked' && (
                            <>
                              <TableHead className="font-semibold text-gray-700">Status</TableHead>
                              <TableHead className="font-semibold text-gray-700">Seminar Topic</TableHead>
                              <TableHead className="font-semibold text-gray-700">Booked At</TableHead>
                            </>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewMode === 'booked' 
                          ? bookingAnalytics.bookedStudents.map((student) => (
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
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                    {student.class_year}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Booked
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {student.seminar_topic || '-'}
                                </TableCell>
                                <TableCell className="text-gray-600">
                                  {student.booking_time ? formatDateTime(student.booking_time) : '-'}
                                </TableCell>
                              </motion.tr>
                            ))
                          : bookingAnalytics.notBookedStudents.map((student) => (
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
                                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                    {student.class_year}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-red-100 text-red-800 border-red-200">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Not Booked
                                  </Badge>
                                </TableCell>
                              </motion.tr>
                            ))
                        }
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* No Data State */}
      {!bookingAnalytics && !isLoadingAnalytics && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
            <CardContent className="p-8">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No booking data available</h3>
                <p className="text-gray-500 mb-4">
                  Check your database connection or create bookings to see analytics.
                </p>
                <Button 
                  onClick={handleRefresh}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}