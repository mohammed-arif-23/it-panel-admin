"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  ArrowLeft, 
  Calendar, 
  Mail, 
  Phone, 
  Hash, 
  Award, 
  FileText, 
  CalendarDays,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';

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

interface Registration {
  id: string;
  registration_type: 'nptel' | 'seminar' | 'both';
  registration_date: string;
  is_active: boolean;
}

interface NPTELEnrollment {
  id: string;
  course_name: string;
  course_id: string;
  course_duration: number;
  enrollment_date: string;
  is_active: boolean;
}

interface SeminarBooking {
  id: string;
  booking_date: string;
  created_at: string;
}

interface Fine {
  id: string;
  fine_type: string;
  base_amount: number;
  daily_increment: number;
  days_overdue: number;
  payment_status: 'pending' | 'paid' | 'waived';
  created_at: string;
}

export default function StudentDetail() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [nptelEnrollments, setNptelEnrollments] = useState<NPTELEnrollment[]>([]);
  const [seminarBookings, setSeminarBookings] = useState<SeminarBooking[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Redirect if not authenticated or not authorized
  if (!isLoading && (!isAuthenticated || userRole === 'STAFF')) {
    router.push('/admin');
    return null;
  }

  // Fetch student data
  useEffect(() => {
    if (isAuthenticated && userRole === 'HOD' && params.id) {
      fetchStudentData();
    }
  }, [isAuthenticated, userRole, params.id]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      // Fetch student details
      const studentResponse = await fetch(`/api/admin/students/${params.id}`);
      const studentData = await studentResponse.json();
      
      if (!studentData.success) {
        setFetchError(studentData.error || 'Failed to fetch student');
        return;
      }
      
      setStudent(studentData.data);
      
      // Fetch additional data
      await Promise.all([
        fetchRegistrations(),
        fetchNPTELEnrollments(),
        fetchSeminarBookings(),
        fetchFines()
      ]);
    } catch (err) {
      setFetchError('Failed to fetch student data. Please try again.');
      console.error('Error fetching student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`/api/admin/students/${params.id}/registrations`);
      const data = await response.json();
      
      if (data.success) {
        setRegistrations(data.data);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    }
  };

  const fetchNPTELEnrollments = async () => {
    try {
      const response = await fetch(`/api/admin/students/${params.id}/nptel-enrollments`);
      const data = await response.json();
      
      if (data.success) {
        setNptelEnrollments(data.data);
      }
    } catch (err) {
      console.error('Error fetching NPTEL enrollments:', err);
    }
  };

  const fetchSeminarBookings = async () => {
    try {
      const response = await fetch(`/api/admin/students/${params.id}/seminar-bookings`);
      const data = await response.json();
      
      if (data.success) {
        setSeminarBookings(data.data);
      }
    } catch (err) {
      console.error('Error fetching seminar bookings:', err);
    }
  };

  const fetchFines = async () => {
    try {
      const response = await fetch(`/api/admin/students/${params.id}/fines`);
      const data = await response.json();
      
      if (data.success) {
        setFines(data.data);
      }
    } catch (err) {
      console.error('Error fetching fines:', err);
    }
  };

  const handleBack = () => {
    router.push('/students');
  };

  const handleEdit = () => {
    router.push(`/students/edit/${params.id}`);
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
  if (!isAuthenticated || userRole === 'STAFF') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Error Loading Student</h2>
          <p className="text-[var(--color-text-muted)] mb-6">{fetchError}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleBack}>
              Back to Students
            </Button>
            <Button onClick={fetchStudentData}>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)]">Student not found</p>
          <Button variant="outline" className="mt-4" onClick={handleBack}>
            Back to Students
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
                <Button variant="outline" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Student Profile</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Detailed view of student information
                    </p>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                <User className="h-4 w-4 mr-2" />
                Edit Student
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Info Card */}
            <div className="lg:col-span-1">
              <Card className="saas-card">
                <CardHeader>
                  <CardTitle>Student Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center text-center pb-4 border-b border-[var(--color-border-light)]">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                      <User className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{student.name}</h2>
                    <p className="text-sm text-[var(--color-text-muted)]">{student.class_year}</p>
                    <div className="mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        student.email_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {student.email_verified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Hash className="h-5 w-5 text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)]">Register Number</p>
                        <p className="font-medium">{student.register_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)]">Email</p>
                        <p className="font-medium">{student.email}</p>
                      </div>
                    </div>
                    
                    {student.mobile && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-[var(--color-text-muted)]" />
                        <div>
                          <p className="text-sm text-[var(--color-text-muted)]">Mobile</p>
                          <p className="font-medium">{student.mobile}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)]">Created</p>
                        <p className="font-medium">{new Date(student.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-[var(--color-text-muted)]" />
                      <div>
                        <p className="text-sm text-[var(--color-text-muted)]">Last Updated</p>
                        <p className="font-medium">{new Date(student.updated_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Registrations Card */}
              <Card className="saas-card mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {registrations.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">No registrations found</p>
                  ) : (
                    <div className="space-y-3">
                      {registrations.map(reg => (
                        <div key={reg.id} className="flex items-center justify-between p-3 bg-[var(--color-accent)] rounded-lg">
                          <div>
                            <p className="font-medium capitalize">{reg.registration_type}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {new Date(reg.registration_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            reg.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {reg.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Activity Cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* NPTEL Enrollments */}
              <Card className="saas-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    NPTEL Enrollments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {nptelEnrollments.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">No NPTEL enrollments found</p>
                  ) : (
                    <div className="space-y-4">
                      {nptelEnrollments.map(enrollment => (
                        <div key={enrollment.id} className="p-4 border border-[var(--color-border-light)] rounded-lg">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{enrollment.course_name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              enrollment.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {enrollment.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-2 text-sm text-[var(--color-text-muted)]">
                            <p>Course ID: {enrollment.course_id}</p>
                            <p>Duration: {enrollment.course_duration} weeks</p>
                            <p>Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Seminar Bookings */}
              <Card className="saas-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Seminar Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {seminarBookings.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-muted)]">No seminar bookings found</p>
                  ) : (
                    <div className="space-y-3">
                      {seminarBookings.map(booking => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-[var(--color-accent)] rounded-lg">
                          <div>
                            <p className="font-medium">Seminar Booking</p>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            Confirmed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Fines */}
              <Card className="saas-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Fines & Penalties
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fines.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-green-600 font-medium">No fines or penalties</p>
                      <p className="text-sm text-[var(--color-text-muted)]">Student has no outstanding fines</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {fines.map(fine => (
                        <div key={fine.id} className="p-4 border border-[var(--color-border-light)] rounded-lg">
                          <div className="flex justify-between">
                            <h3 className="font-medium capitalize">{fine.fine_type.replace('_', ' ')}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              fine.payment_status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : fine.payment_status === 'waived'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {fine.payment_status}
                            </span>
                          </div>
                          <div className="mt-2 text-sm">
                            <p>Amount: ₹{fine.base_amount + (fine.daily_increment * fine.days_overdue)}</p>
                            <p className="text-[var(--color-text-muted)]">
                              Created: {new Date(fine.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}