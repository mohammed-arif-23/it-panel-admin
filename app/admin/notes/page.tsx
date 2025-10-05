'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Upload, FileText, Users, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import { NotesFlow } from '@/components/notes/NotesFlow'
import { Card, CardContent } from '@/components/ui/card'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface NotesData {
  department: string
  year: string
  subject: SubjectItem
  uploadedFiles?: number
}

export default function AdminNotesPage() {
  const [showFlow, setShowFlow] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleComplete = (data: NotesData) => {
    console.log('Notes Upload completed:', data)
    setShowFlow(false)
  }

  const handleCancel = () => {
    setShowFlow(false)
  }

  const [stats, setStats] = useState([
    { label: 'Total Notes', value: '0', icon: FileText, color: 'from-blue-500 to-blue-600' },
    { label: 'Departments', value: '0', icon: Users, color: 'from-green-500 to-green-600' },
    { label: 'This Month', value: '0', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
    { label: 'Success Rate', value: '0%', icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
  ]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    fetchNotesStats();
  }, []);

  const fetchNotesStats = async () => {
    setIsLoadingStats(true);
    try {
      // Include credentials for authentication
      const fetchPromises = [
        fetch('/api/admin/notes/count', { credentials: 'include' }),
        fetch('/api/admin/notes/departments/count', { credentials: 'include' }),
        fetch('/api/admin/notes/monthly', { credentials: 'include' }),
        fetch('/api/admin/notes/success-rate', { credentials: 'include' })
      ];

      const [notesRes, deptsRes, monthlyRes, successRes] = await Promise.all(fetchPromises);

      // Check if any responses are not ok and provide detailed error info
      const responses = [notesRes, deptsRes, monthlyRes, successRes];
      const responseNames = ['count', 'departments', 'monthly', 'success-rate'];
      
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          console.error(`API request failed for ${responseNames[i]}:`, responses[i].status, responses[i].statusText);
          const errorText = await responses[i].text();
          console.error(`Response text for ${responseNames[i]}:`, errorText);
          throw new Error(`API request failed for ${responseNames[i]}: ${responses[i].status} ${responses[i].statusText}`);
        }
        
        // Check content type to ensure we're getting JSON
        const contentType = responses[i].headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await responses[i].text();
          console.error(`Non-JSON response for ${responseNames[i]}:`, responseText.substring(0, 200) + '...');
          throw new Error(`Non-JSON response for ${responseNames[i]}`);
        }
      }

      const [notesData, deptsData, monthlyData, successData] = await Promise.all([
        notesRes.json(),
        deptsRes.json(),
        monthlyRes.json(),
        successRes.json()
      ]);

      setStats([
        { label: 'Total Notes', value: notesData.count?.toString() || '0', icon: FileText, color: 'from-blue-500 to-blue-600' },
        { label: 'Departments', value: deptsData.count?.toString() || '0', icon: Users, color: 'from-green-500 to-green-600' },
        { label: 'This Month', value: monthlyData.count?.toString() || '0', icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
        { label: 'Success Rate', value: `${successData.rate || 0}%`, icon: CheckCircle, color: 'from-emerald-500 to-emerald-600' },
      ]);
    } catch (error) {
      console.error('Failed to fetch Notes stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-purple-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">Notes</h1>
                <p className="text-sm text-slate-600 font-medium">Advanced Notes Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {mounted && (
                <div className="hidden md:flex flex-col items-end text-sm bg-white/50 rounded-xl px-3 py-2 backdrop-blur-sm">
                  <span className="text-slate-700 font-semibold">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-slate-500">
                    {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Admin</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {showFlow ? (
        <div className="relative">
          {/* Stats Overview */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={stat.label} className={`card-hover border-none shadow-lg bg-gradient-to-br ${stat.color} text-white overflow-hidden slide-in-left`} style={{animationDelay: `${index * 100}ms`}}>
                  <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 font-medium">{stat.label}</p>
                        <p className="text-2xl font-bold mt-2">{stat.value}</p>
                      </div>
                      <stat.icon className="h-8 w-8 opacity-80" />
                    </div>
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <NotesFlow />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <div className="h-20 w-20 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold shimmer-text mb-4">Notes Upload Complete!</h2>
            <p className="text-slate-600 text-lg">Your notes have been successfully uploaded and processed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardContent className="p-8 text-center">
                <Upload className="h-12 w-12 text-violet-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Upload More Notes</h3>
                <p className="text-slate-600 mb-6">Continue uploading notes for different subjects and departments.</p>
                <button
                  onClick={() => setShowFlow(true)}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  Start New Upload
                </button>
              </CardContent>
            </Card>

            <Card className="glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-3">Manage Notes</h3>
                <p className="text-slate-600 mb-6">View, edit, or organize your uploaded notes and manage access.</p>
                <Link href="/admin/notes/manage">
                  <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105">
                    Manage Notes
                  </button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
              <Clock className="h-5 w-5" />
              <span className="font-semibold">System processing completed successfully</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}