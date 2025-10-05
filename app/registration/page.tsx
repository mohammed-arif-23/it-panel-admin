"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, 
  Search, 
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Award
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';

interface Registration {
  id: string;
  student_id: string;
  registration_type: 'nptel' | 'seminar' | 'both';
  registration_date: string;
  is_active: boolean;
  student: {
    register_number: string;
    name: string;
    email: string;
    class_year: string;
  };
}

export default function RegistrationManagement() {
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<Registration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch registrations
  useEffect(() => {
    if (isAuthenticated) {
      fetchRegistrations();
    }
  }, [isAuthenticated]);

  // Filter registrations based on search term and filters
  useEffect(() => {
    let result = registrations;
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(reg => 
        reg.student.name.toLowerCase().includes(term) ||
        reg.student.register_number.toLowerCase().includes(term) ||
        reg.student.email.toLowerCase().includes(term)
      );
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(reg => reg.registration_type === typeFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter(reg => reg.is_active === isActive);
    }
    
    setFilteredRegistrations(result);
  }, [registrations, searchTerm, typeFilter, statusFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/registrations');
      const data = await response.json();
      
      if (data.success) {
        setRegistrations(data.data);
      } else {
        setError(data.error || 'Failed to fetch registrations');
      }
    } catch (err) {
      setError('Failed to fetch registrations');
      console.error('Error fetching registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRegistrations();
  };

  const toggleRegistrationStatus = async (registrationId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/registrations/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: registrationId, 
          is_active: !currentStatus 
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchRegistrations(); // Refresh the list
      } else {
        alert(data.error || 'Failed to update registration status');
      }
    } catch (err) {
      alert('Failed to update registration status');
      console.error('Error updating registration status:', err);
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

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="max-w-md text-center p-6">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Access Denied</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            You don't have permission to access this page.
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
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Registration Management</h1>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Manage student registrations for NPTEL and seminars
                  </p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
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
                    placeholder="Search by student name, register number, or email..."
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
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All Types</option>
                      <option value="nptel">NPTEL</option>
                      <option value="seminar">Seminar</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                    <select
                      className="pl-10 pr-8 py-2 border border-[var(--color-border-light)] rounded-xl bg-[var(--color-background)] text-sm"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Total Registrations</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {registrations.length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">NPTEL</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {registrations.filter(r => r.registration_type === 'nptel' || r.registration_type === 'both').length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Seminar</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {registrations.filter(r => r.registration_type === 'seminar' || r.registration_type === 'both').length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="saas-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Active</p>
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">
                      {registrations.filter(r => r.is_active).length}
                    </p>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Registrations Table */}
          <Card className="saas-card">
            <CardHeader>
              <CardTitle>Registration Records</CardTitle>
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
              ) : filteredRegistrations.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--color-text-muted)]">No registrations found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--color-border-light)]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Student</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Register Number</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Class</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-[var(--color-text-muted)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRegistrations.map((reg) => (
                        <tr key={reg.id} className="border-b border-[var(--color-border-light)] hover:bg-[var(--color-accent)]">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)]">{reg.student.name}</p>
                              <p className="text-sm text-[var(--color-text-muted)]">{reg.student.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                            {reg.student.register_number}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className="px-2 py-1 bg-[var(--color-accent)] rounded-full text-xs capitalize">
                              {reg.registration_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                            {reg.student.class_year}
                          </td>
                          <td className="py-3 px-4 text-sm text-[var(--color-text-primary)]">
                            {new Date(reg.registration_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {reg.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Active
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => toggleRegistrationStatus(reg.id, reg.is_active)}
                            >
                              {reg.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}