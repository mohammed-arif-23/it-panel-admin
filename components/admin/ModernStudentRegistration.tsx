'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, CheckCircle, AlertTriangle, User, Mail, Phone, GraduationCap, Hash } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegistrationData {
  registerNumber: string;
  name: string;
  email: string;
  mobile: string;
  classYear: string;
}

interface ModernStudentRegistrationProps {
  onRefresh?: () => void;
}

export default function ModernStudentRegistration({ onRefresh }: ModernStudentRegistrationProps) {
  const [formData, setFormData] = useState<RegistrationData>({
    registerNumber: '',
    name: '',
    email: '',
    mobile: '',
    classYear: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Validate register number format
  const validateRegisterNumber = (regNum: string) => {
    if (regNum.length !== 12) return 'Register number must be exactly 12 digits';
    if (!/^\d{12}$/.test(regNum)) return 'Register number must contain only digits';
    
    // Admin panel - no department validation required
    return '';
  };

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  // Validate mobile number
  const validateMobile = (mobile: string) => {
    if (mobile && !/^\d{10}$/.test(mobile)) return 'Mobile number must be 10 digits';
    return '';
  };

  // Handle input changes with validation
  const handleInputChange = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
    
    // Clear field-specific validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle register number change with validation
  const handleRegisterNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Only allow digits
    if (value && !/^\d*$/.test(value)) return;
    
    // Limit to 12 digits
    if (value.length > 12) return;
    
    handleInputChange('registerNumber', value);
    
    // Validate on the fly
    if (value.length === 12) {
      const validationError = validateRegisterNumber(value);
      if (validationError) {
        setValidationErrors(prev => ({ ...prev, registerNumber: validationError }));
      }
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Required fields
    if (!formData.registerNumber) errors.registerNumber = 'Register number is required';
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.classYear) errors.classYear = 'Class year is required';
    
    // Format validations
    if (formData.registerNumber) {
      const regError = validateRegisterNumber(formData.registerNumber);
      if (regError) errors.registerNumber = regError;
    }
    
    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) errors.email = emailError;
    }
    
    if (formData.mobile) {
      const mobileError = validateMobile(formData.mobile);
      if (mobileError) errors.mobile = mobileError;
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          registerNumber: formData.registerNumber,
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          mobile: formData.mobile?.trim() || null,
          classYear: formData.classYear
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Registration failed');
        setIsLoading(false);
        return;
      }

      setSuccess(`Student ${formData.name} registered successfully!`);
      
      // Reset form
      setFormData({
        registerNumber: '',
        name: '',
        email: '',
        mobile: '',
        classYear: ''
      });
      setValidationErrors({});
      
      // Refresh parent component if callback provided
      if (onRefresh) {
        setTimeout(onRefresh, 1000);
      }

    } catch (error) {
      console.error('Registration error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      registerNumber: '',
      name: '',
      email: '',
      mobile: '',
      classYear: ''
    });
    setValidationErrors({});
    setError('');
    setSuccess('');
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Student Registration</h3>
              <p className="text-gray-600 text-sm mt-1">Add new students to the system</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Register Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <Hash className="h-4 w-4 inline mr-2" />
                Register Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={12}
                value={formData.registerNumber}
                onChange={handleRegisterNumberChange}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner text-gray-800 font-medium ${
                  validationErrors.registerNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter 12-digit register number"
              />
              {validationErrors.registerNumber && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationErrors.registerNumber}
                </p>
              )}
              <p className="text-xs text-gray-600 mt-2">Must be exactly 12 digits</p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <User className="h-4 w-4 inline mr-2" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner text-gray-800 font-medium ${
                  validationErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter student's full name"
              />
              {validationErrors.name && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationErrors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <Mail className="h-4 w-4 inline mr-2" />
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner text-gray-800 font-medium ${
                  validationErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
              />
              {validationErrors.email && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <Phone className="h-4 w-4 inline mr-2" />
                Mobile Number
              </label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow digits
                  if (value && !/^\d*$/.test(value)) return;
                  // Limit to 10 digits
                  if (value.length > 10) return;
                  handleInputChange('mobile', value);
                }}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner text-gray-800 font-medium ${
                  validationErrors.mobile ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter mobile number (optional)"
              />
              {validationErrors.mobile && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationErrors.mobile}
                </p>
              )}
            </div>

            {/* Class Year */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                <GraduationCap className="h-4 w-4 inline mr-2" />
                Class/Year <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.classYear}
                onChange={(e) => handleInputChange('classYear', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-inner text-gray-800 font-medium ${
                  validationErrors.classYear ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select class/year</option>
                <option value="II-IT">II-IT</option>
                <option value="III-IT">III-IT</option>
                <option value="IV-IT">IV-IT</option>
              </select>
              {validationErrors.classYear && (
                <p className="text-xs text-red-600 mt-2 flex items-center">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationErrors.classYear}
                </p>
              )}
            </div>

            {/* Success/Error Messages */}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Registering...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5" />
                    <span>Register Student</span>
                  </div>
                )}
              </Button>

              <Button 
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-all duration-200"
              >
                Reset Form
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
