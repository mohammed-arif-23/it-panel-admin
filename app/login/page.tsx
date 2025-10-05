"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Users, 
  Eye, 
  EyeOff, 
  Lock, 
  User,
  CheckCircle,
  AlertCircle,
  Crown,
  UserCheck
} from 'lucide-react';

type UserRole = 'HOD' | 'STAFF';

interface RoleCard {
  role: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  permissions: string[];
}

const roleCards: RoleCard[] = [
  {
    role: 'HOD',
    title: 'Head of Department',
    description: 'Full administrative access to all systems',
    icon: Crown,
    color: 'from-purple-600 to-indigo-600',
    permissions: [
      'All Academic Controls',
      'Management & Security',
      'Finance & Analytics',
      'System Administration',
      'User Management',
      'Complete Database Access'
    ]
  },
  {
    role: 'STAFF',
    title: 'Staff Member',
    description: 'Limited access to academic and operational tools',
    icon: UserCheck,
    color: 'from-emerald-600 to-teal-600',
    permissions: [
      'Academic Management',
      'Assignment Controls',
      'Scheduling Tools',
      'Basic Analytics',
      'Communication Tools',
      'Limited Database Access'
    ]
  }
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setPassword('');
    setError('');
  };

  const handleLogin = async () => {
    if (!selectedRole || !password) {
      setError('Please select a role and enter password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          password: password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Use auth context to handle login
        login(selectedRole, data.token);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                IT Panel Admin
              </h1>
              <p className="text-slate-600 font-medium">Secure Role-Based Access</p>
            </div>
          </div>
        </div>

        {!selectedRole ? (
          /* Role Selection */
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Select Your Role</h2>
              <p className="text-slate-600">Choose your access level to continue</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {roleCards.map((roleCard) => (
                <Card
                  key={roleCard.role}
                  className="group cursor-pointer border-2 border-transparent hover:border-white/50 bg-white/90 backdrop-blur-xl hover:bg-white/95 hover:shadow-2xl transition-all duration-500 overflow-hidden relative"
                  onClick={() => handleRoleSelect(roleCard.role)}
                >
                  <CardContent className="p-8 relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${roleCard.color} flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                        <roleCard.icon className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${roleCard.color} text-white font-medium`}>
                          {roleCard.role}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {roleCard.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {roleCard.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Access Permissions:</h4>
                      {roleCard.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm text-slate-600">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${roleCard.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}></div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Password Input */
          <div className="max-w-md mx-auto">
            <Card className="glass border-white/50 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {selectedRole === 'HOD' ? (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <CardTitle className="text-xl text-slate-900">
                      {roleCards.find(r => r.role === selectedRole)?.title}
                    </CardTitle>
                    <CardDescription className="text-slate-600">
                      Enter your secure password
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={`Enter ${selectedRole} password`}
                      className="pr-12 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={handleLogin}
                    disabled={isLoading || !password}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Authenticating...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Sign In as {selectedRole}
                      </div>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedRole(null)}
                    disabled={isLoading}
                    className="w-full border-slate-200 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Change Role
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}