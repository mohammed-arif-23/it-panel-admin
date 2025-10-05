"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Settings, 
  Users, 
  Bell, 
  FileText, 
  Calendar, 
  BookOpen,
  FlaskConical,
  StickyNote,
  Building2,
  IndianRupee,
  GraduationCap,
  Library,
  UserCheck,
  Award,
  MessageCircle,
  Lightbulb,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Shield,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface StudentPanelFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  category: string;
  priority: number;
  lastModified?: string;
  affectedStudents?: number;
}

interface NotificationRule {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  targetClass?: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export default function StudentControlsPage() {
  const [features, setFeatures] = useState<StudentPanelFeature[]>([
    {
      id: 'notice',
      title: 'Notice Board',
      description: 'Access to institutional notices and announcements',
      icon: Bell,
      enabled: true,
      category: 'Communication',
      priority: 1,
      affectedStudents: 450
    },
    {
      id: 'assignments',
      title: 'Assignments',
      description: 'Assignment submission and tracking system',
      icon: FileText,
      enabled: true,
      category: 'Academic',
      priority: 2,
      affectedStudents: 450
    },
    {
      id: 'seminar',
      title: 'Seminar Booking',
      description: 'Seminar slot booking and management',
      icon: Calendar,
      enabled: true,
      category: 'Academic',
      priority: 3,
      affectedStudents: 450
    },
    {
      id: 'timetable',
      title: 'Timetable',
      description: 'Class schedule and timetable access',
      icon: Clock,
      enabled: true,
      category: 'Academic',
      priority: 4,
      affectedStudents: 450
    },
    {
      id: 'fines',
      title: 'Fine History',
      description: 'Student fine tracking and payment history',
      icon: IndianRupee,
      enabled: true,
      category: 'Finance',
      priority: 5,
      affectedStudents: 450
    },
    {
      id: 'qps',
      title: 'University QPs',
      description: 'Access to previous year question papers',
      icon: Library,
      enabled: true,
      category: 'Academic',
      priority: 6,
      affectedStudents: 450
    },
    {
      id: 'lab-manuals',
      title: 'Lab Manuals',
      description: 'Laboratory manuals and experiment guides',
      icon: FlaskConical,
      enabled: true,
      category: 'Academic',
      priority: 7,
      affectedStudents: 450
    },
    {
      id: 'notes',
      title: 'Study Notes',
      description: 'Subject-wise study materials and notes',
      icon: StickyNote,
      enabled: true,
      category: 'Academic',
      priority: 8,
      affectedStudents: 450
    },
    {
      id: 'cod',
      title: 'COD System',
      description: 'Code of the Day challenges and submissions',
      icon: Lightbulb,
      enabled: true,
      category: 'Technical',
      priority: 9,
      affectedStudents: 450
    },
    {
      id: 'nptel',
      title: 'NPTEL Courses',
      description: 'NPTEL course registration and tracking',
      icon: GraduationCap,
      enabled: true,
      category: 'Academic',
      priority: 10,
      affectedStudents: 450
    },
    {
      id: 'department-info',
      title: 'Department Info',
      description: 'Department information and staff details',
      icon: Building2,
      enabled: true,
      category: 'Information',
      priority: 11,
      affectedStudents: 450
    },
    {
      id: 'profile',
      title: 'Student Profile',
      description: 'Personal profile and academic information',
      icon: UserCheck,
      enabled: true,
      category: 'Personal',
      priority: 12,
      affectedStudents: 450
    }
  ]);

  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([
    {
      id: 'assignment-posted',
      name: 'New Assignment Posted',
      trigger: 'assignment_created',
      enabled: true,
      message: 'New assignment "{title}" has been posted for {class}. Due date: {due_date}',
      priority: 'high'
    },
    {
      id: 'seminar-booking-open',
      name: 'Seminar Booking Started',
      trigger: 'seminar_booking_open',
      enabled: true,
      message: 'Seminar booking is now open! Book your slot before {deadline}',
      priority: 'medium'
    },
    {
      id: 'seminar-booking-closed',
      name: 'Seminar Booking Ended',
      trigger: 'seminar_booking_closed',
      enabled: true,
      message: 'Seminar booking window has closed. Selection will happen at {selection_time}',
      priority: 'medium'
    },
    {
      id: 'student-selected',
      name: 'Student Selected for Seminar',
      trigger: 'student_selected',
      enabled: true,
      targetClass: 'match_student_class',
      message: '{student_name} from {class} has been selected for seminar on {date}',
      priority: 'high'
    },
    {
      id: 'new-notice',
      name: 'New Notice Published',
      trigger: 'notice_published',
      enabled: true,
      message: 'New {priority} notice: {title}. Check the notice board for details.',
      priority: 'medium'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const toggleFeature = async (featureId: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, enabled: !feature.enabled, lastModified: new Date().toISOString() }
        : feature
    ));
  };

  const toggleNotificationRule = async (ruleId: string) => {
    setNotificationRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    ));
  };

  const saveConfiguration = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/student-controls/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features,
          notificationRules
        })
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [...new Set(features.map(f => f.category))];
  const enabledCount = features.filter(f => f.enabled).length;
  const activeRulesCount = notificationRules.filter(r => r.enabled).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <Settings className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                  Student Panel Controls
                </h1>
                <p className="text-sm text-slate-600 font-medium">Manage student access and notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={saveConfiguration}
                disabled={isLoading}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Link href="/admin">
                <Button variant="outline" className="px-4 py-2 rounded-xl border-white/50 hover:bg-white/80 backdrop-blur-sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass border-white/50 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Active Features</p>
                  <p className="text-2xl font-bold text-slate-900">{enabledCount}/{features.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/50 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Notification Rules</p>
                  <p className="text-2xl font-bold text-slate-900">{activeRulesCount}/{notificationRules.length}</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/50 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Affected Students</p>
                  <p className="text-2xl font-bold text-slate-900">450</p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/50 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Last Saved</p>
                  <p className="text-sm font-bold text-slate-900">
                    {lastSaved ? lastSaved.toLocaleTimeString() : 'Not saved'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Controls */}
        <Card className="glass border-white/50 shadow-xl mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Settings className="h-6 w-6 text-white" />
              </div>
              Student Panel Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categories.map(category => (
              <div key={category} className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1">
                    {category}
                  </Badge>
                  <span className="text-sm text-slate-500">
                    ({features.filter(f => f.category === category && f.enabled).length}/{features.filter(f => f.category === category).length} active)
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {features
                    .filter(feature => feature.category === category)
                    .sort((a, b) => a.priority - b.priority)
                    .map(feature => {
                      const IconComponent = feature.icon;
                      return (
                        <div
                          key={feature.id}
                          className={`p-4 rounded-xl border transition-all duration-300 ${
                            feature.enabled
                              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-sm'
                              : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                                feature.enabled
                                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                                  : 'bg-gradient-to-br from-red-500 to-rose-600'
                              }`}>
                                <IconComponent className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{feature.title}</h4>
                                <p className="text-xs text-slate-600">{feature.affectedStudents} students</p>
                              </div>
                            </div>
                            <Switch
                              checked={feature.enabled}
                              onCheckedChange={() => toggleFeature(feature.id)}
                            />
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{feature.description}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Priority: {feature.priority}</span>
                            {feature.lastModified && (
                              <span>Modified: {new Date(feature.lastModified).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notification Rules */}
        <Card className="glass border-white/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Bell className="h-6 w-6 text-white" />
              </div>
              Automated Notification Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notificationRules.map(rule => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    rule.enabled
                      ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                      : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-slate-900">{rule.name}</h4>
                        <Badge 
                          variant={rule.priority === 'urgent' ? 'destructive' : rule.priority === 'high' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {rule.priority}
                        </Badge>
                        {rule.targetClass && (
                          <Badge variant="outline" className="text-xs">
                            Class-specific
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Trigger:</strong> {rule.trigger.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-slate-700 bg-white/50 p-2 rounded-lg">
                        {rule.message}
                      </p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={() => toggleNotificationRule(rule.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
