"use client";

import React, { useState } from 'react';
import NotificationForm from '@/components/notifications/NotificationForm';
import QuickTemplates from '@/components/notifications/QuickTemplates';
import NotificationHistory from '@/components/notifications/NotificationHistory';
import NotificationStats from '@/components/notifications/NotificationStats';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Send, 
  FileText, 
  History, 
  BarChart3,
  MessageSquare,
  Users,
  Calendar,
  Clock,
  Eye,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  BookOpen,
  Gift,
  CreditCard,
  Settings,
  Copy,
  CheckCircle,
  Activity
} from 'lucide-react';

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  content: string;
  icon: string;
  color: string;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('send');
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);

  const handleTemplateSelect = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('send');
    // The form will need to be updated to accept the template
    // For now, we'll just switch to the send tab
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <Bell className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">Notifications Hub</h1>
                <p className="text-sm text-slate-600 font-medium">Advanced Communication Management</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Admin</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
              Communication Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Send targeted notifications and manage communication templates with advanced analytics
          </p>
        </div>
        
        <Tabs defaultValue="send" className="space-y-8">
          <div className="glass border-white/50 rounded-2xl p-2 shadow-xl overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 bg-transparent gap-1 sm:gap-2 min-w-max sm:min-w-0">
              <TabsTrigger 
                value="send" 
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-semibold whitespace-nowrap">Send</span>
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm"
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-semibold whitespace-nowrap">Templates</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm"
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-semibold whitespace-nowrap">History</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stats" 
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105 text-xs sm:text-sm"
              >
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-semibold whitespace-nowrap">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="send" className="space-y-6">
            <NotificationForm />
          </TabsContent>

          <TabsContent value="templates">
            <Card className="glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-slate-900 to-emerald-900 bg-clip-text text-transparent">Notification Templates</span>
                    </CardTitle>
                    <CardDescription className="text-base text-slate-600 mt-2">
                      Create and manage reusable notification templates for efficient communication
                    </CardDescription>
                  </div>
                  <Button className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { name: 'Assignment Reminder', type: 'Academic', color: 'from-blue-500 to-purple-600', icon: BookOpen },
                    { name: 'Exam Schedule', type: 'Important', color: 'from-orange-500 to-red-600', icon: Calendar },
                    { name: 'Welcome Message', type: 'General', color: 'from-green-500 to-emerald-600', icon: Users },
                    { name: 'Holiday Notice', type: 'Announcement', color: 'from-purple-500 to-pink-600', icon: Gift },
                    { name: 'Fee Payment', type: 'Finance', color: 'from-yellow-500 to-orange-600', icon: CreditCard },
                    { name: 'System Maintenance', type: 'Technical', color: 'from-slate-500 to-slate-600', icon: Settings }
                  ].map((template, index) => {
                    const IconComponent = template.icon;
                    return (
                      <div key={index} className="p-3 sm:p-4 border border-slate-200/50 rounded-xl bg-gradient-to-br from-white/50 to-slate-50/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:scale-105">
                        <div className="flex items-center gap-2 sm:gap-3 mb-3">
                          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{template.name}</h3>
                            <p className="text-xs text-slate-600">{template.type}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all duration-300">
                            <Copy className="h-3 w-3 mr-1" />
                            Use
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <NotificationHistory />
          </TabsContent>

          <TabsContent value="stats">
            <NotificationStats />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
