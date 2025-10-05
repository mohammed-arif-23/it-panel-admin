"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  UserPlus, 
  ArrowLeft, 
  Save, 
  AlertCircle
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';

interface StudentFormData {
  register_number: string;
  name: string;
  email: string;
  mobile: string;
  class_year: string;
}

export default function CreateStudent() {
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [formData, setFormData] = useState<StudentFormData>({
    register_number: '',
    name: '',
    email: '',
    mobile: '',
    class_year: 'II-IT'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Redirect if not authenticated or not authorized
  if (!isLoading && (!isAuthenticated || userRole !== 'HOD')) {
    router.push('/admin');
    return null;
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Register number validation
    if (!formData.register_number) {
      newErrors.register_number = 'Register number is required';
    } else if (formData.register_number.length !== 12) {
      newErrors.register_number = 'Register number must be exactly 12 digits';
    } else if (!/^\d{12}$/.test(formData.register_number)) {
      newErrors.register_number = 'Register number must contain only digits';
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Class year validation
    if (!['II-IT', 'III-IT'].includes(formData.class_year)) {
      newErrors.class_year = 'Please select a valid class';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setSubmitError(null);
    
    try {
      const response = await fetch('/api/admin/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          ...formData
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        router.push('/students?success=Student created successfully');
      } else {
        setSubmitError(data.error || 'Failed to create student');
      }
    } catch (err) {
      setSubmitError('Failed to create student. Please try again.');
      console.error('Error creating student:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/students');
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
    return null;
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
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Add New Student</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Create a new student account
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Student
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="saas-card">
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-700 text-sm">{submitError}</p>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label htmlFor="register_number" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Register Number *
                    </Label>
                    <Input
                      id="register_number"
                      name="register_number"
                      value={formData.register_number}
                      onChange={handleChange}
                      placeholder="Enter 12-digit register number"
                      className={`mt-1 ${errors.register_number ? 'border-red-500' : ''}`}
                      maxLength={12}
                    />
                    {errors.register_number && (
                      <p className="mt-1 text-sm text-red-600">{errors.register_number}</p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="name" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter student's full name"
                      className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                  
                  <div className="w-full">
                    <Label htmlFor="email" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email address"
                      className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>
                  
                  <div className="w-full">
                    <Label htmlFor="mobile" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Mobile Number
                    </Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="Enter mobile number"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="class_year" className="text-sm font-medium text-[var(--color-text-primary)]">
                      Class Year *
                    </Label>
                    <select
                      id="class_year"
                      name="class_year"
                      value={formData.class_year}
                      onChange={handleChange}
                      className={`w-full mt-1 px-3 py-2 border rounded-xl bg-[var(--color-background)] ${
                        errors.class_year ? 'border-red-500' : 'border-[var(--color-border-light)]'
                      }`}
                    >
                      <option value="II-IT">II-IT</option>
                      <option value="III-IT">III-IT</option>
                    </select>
                    {errors.class_year && (
                      <p className="mt-1 text-sm text-red-600">{errors.class_year}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={handleBack}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Student
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          
          <div className="mt-6 text-sm text-[var(--color-text-muted)]">
            <p>* Required fields</p>
            <p className="mt-2">Note: Students will receive an email to set up their password after account creation.</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}