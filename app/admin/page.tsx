"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Search,
  UserPlus,
  Calendar,
  CalendarDays,
  Users,
  DollarSign,
  Database,
  ChevronRight,
  FlaskConical,
  Home,
  TrendingUp,
  Settings,
  Bell,
  Menu,
  BarChart3,
  Shield,
  Zap,
  Globe,
  FileText,
  Clock,
  Award,
  Target,
  LogOut,
  User,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/ui/PageTransition";

const tiles = [
  // Academic Category
  { 
    id: "admin/qps", 
    label: "University QP's", 
    icon: BookOpen,
    color: "from-violet-500 to-fuchsia-600",
    description: "Upload question papers",
    category: "Academic"
  },
  { 
    id: "assignments", 
    label: "Assignments", 
    icon: FileText,
    color: "from-blue-500 to-blue-600",
    description: "Manage assignments",
    category: "Academic"
  },
  { 
    id: "admin/lab-manuals", 
    label: "Lab Manuals", 
    icon: FlaskConical,
    color: "from-blue-500 to-cyan-600",
    description: "Upload lab manuals",
    category: "Academic"
  },
  { 
    id: "admin/notes", 
    label: "Study Notes", 
    icon: BookOpen,
    color: "from-indigo-500 to-purple-600",
    description: "Upload study notes",
    category: "Academic"
  },
  
  // Management Category
  { 
    id: "registration", 
    label: "Student Registration", 
    icon: UserPlus,
    color: "from-green-500 to-green-600",
    description: "Register new students",
    category: "Management"
  },
  { 
    id: "students", 
    label: "Students Management", 
    icon: Users,
    color: "from-purple-500 to-indigo-600",
    description: "View and manage all students",
    category: "Management"
  },
  { 
    id: "admin/student-controls", 
    label: "Student Panel Controls", 
    icon: Settings,
    color: "from-gray-500 to-gray-600",
    description: "Control student panel features",
    category: "Management"
  },
  { 
    id: "admin/department-info", 
    label: "Department Info", 
    icon: Building2,
    color: "from-teal-500 to-cyan-600",
    description: "Manage department information",
    category: "Management"
  },
  
  // Security Category
  { 
    id: "admin/detect-assignments", 
    label: "Plagiarism Detection", 
    icon: Shield,
    color: "from-purple-500 to-purple-600",
    description: "AI-powered plagiarism check",
    category: "Security"
  },
  
  // Scheduling Category
  { 
    id: "bookings", 
    label: "Seminar Bookings", 
    icon: Calendar,
    color: "from-orange-500 to-orange-600",
    description: "Manage seminar slots",
    category: "Scheduling"
  },
  { 
    id: "holidays", 
    label: "Holiday Calendar", 
    icon: CalendarDays,
    color: "from-pink-500 to-pink-600",
    description: "Academic calendar",
    category: "Scheduling"
  },
  { 
    id: "admin/timetable", 
    label: "Timetable Manager", 
    icon: Clock,
    color: "from-blue-500 to-indigo-600",
    description: "Manage class timetables",
    category: "Scheduling"
  },
  
  // Analytics Category
  { 
    id: "history", 
    label: "Seminar History", 
    icon: Clock,
    color: "from-indigo-500 to-indigo-600",
    description: "Past seminar records",
    category: "Analytics"
  },
  { 
    id: "analytics", 
    label: "Analytics Dashboard", 
    icon: BarChart3,
    color: "from-blue-600 to-purple-600",
    description: "Performance insights",
    category: "Analytics"
  },
  
  // Finance Category
  { 
    id: "fines", 
    label: "Fine Management", 
    icon: DollarSign,
    color: "from-red-500 to-red-600",
    description: "Manage student fines",
    category: "Finance"
  },
  { 
    id: "fine-students", 
    label: "Student Penalties", 
    icon: Target,
    color: "from-amber-500 to-amber-600",
    description: "Individual fine tracking",
    category: "Finance"
  },
  
  // Communication Category
  { 
    id: "admin/notifications", 
    label: "Push Notifications", 
    icon: Bell,
    color: "from-cyan-500 to-cyan-600",
    description: "Send notifications",
    category: "Communication"
  },
  { 
    id: "notices", 
    label: "Notice Board", 
    icon: Globe,
    color: "from-emerald-500 to-emerald-600",
    description: "Manage announcements",
    category: "Communication"
  },
  
  // System Category
  { 
    id: "database", 
    label: "Database Console", 
    icon: Database,
    color: "from-teal-500 to-teal-600",
    description: "Advanced DB management",
    category: "System"
  },
  { 
    id: "crud", 
    label: "Data Operations", 
    icon: Settings,
    color: "from-slate-500 to-slate-600",
    description: "CRUD operations",
    category: "System"
  },
  { 
    id: "admin/results", 
    label: "Result Management", 
    icon: Award,
    color: "from-emerald-500 to-green-600",
    description: "Manage student results",
    category: "Academic"
  },
  { 
    id: "admin/result-analysis", 
    label: "Result Analysis", 
    icon: BarChart3,
    color: "from-blue-500 to-purple-600",
    description: "Comprehensive result analytics",
    category: "Analytics"
  },
];

export default function AdminRenewLanding() {
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Check authentication
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (isAuthenticated) {
      fetchRealStats();
    }
    
    return () => clearInterval(timer);
  }, [isAuthenticated, isLoading, router]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const fetchRealStats = async () => {
    setIsLoadingStats(true);
    try {
      const [studentsRes, assignmentsRes, reviewsRes, systemRes] = await Promise.all([
        fetch('/api/admin/students/count'),
        fetch('/api/admin/assignments/count'),
        fetch('/api/admin/reviews/pending'),
        fetch('/api/admin/system/health')
      ]);

      const [studentsData, assignmentsData, reviewsDataResult, systemData] = await Promise.all([
        studentsRes.json(),
        assignmentsRes.json(),
        reviewsRes.json(),
        systemRes.json()
      ]);

      setStats([
        { label: 'Active Students', value: studentsData.count?.toString() || '0', icon: Users, color: 'from-blue-500 to-blue-600' },
        { label: 'Total Assignments', value: assignmentsData.count?.toString() || '0', icon: FileText, color: 'from-green-500 to-green-600' },
        { label: 'Pending Reviews', value: reviewsDataResult.count?.toString() || '0', icon: Clock, color: 'from-orange-500 to-orange-600' },
        { label: 'System Health', value: `${systemData.health || 0}%`, icon: Zap, color: 'from-purple-500 to-purple-600' },
      ]);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const categories = ['All', 'Academic', 'Management', 'Security', 'Scheduling', 'Analytics', 'Finance', 'Communication', 'System'];
  const filteredTiles = activeCategory === 'All' ? tiles : tiles.filter(tile => tile.category === activeCategory);

  const [stats, setStats] = useState([
    { label: 'Active Students', value: '0', icon: Users, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Assignments', value: '0', icon: FileText, color: 'from-green-500 to-green-600' },
    { label: 'Pending Reviews', value: '0', icon: Clock, color: 'from-orange-500 to-orange-600' },
    { label: 'System Health', value: '0%', icon: Zap, color: 'from-purple-500 to-purple-600' },
  ]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--color-background)] page-transition">
        {/* Premium Header */}
        <div className="sticky top-0 z-50 bg-[var(--color-background)] border-b border-[var(--color-border-light)] shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg ring-2 ring-white/50">
                    <Database className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
                <div className="leading-tight">
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">
                    IT Panel Admin
                  </h1>
                  <p className="text-sm text-slate-600 font-medium">
                    {userRole === 'HOD' ? 'Head of Department' : 'Staff Member'} Dashboard
                  </p>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-10 w-10 rounded-xl bg-white/50 hover:bg-white/80 backdrop-blur-sm p-0"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 text-slate-700" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section */}
          <div className="mb-10">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
                Welcome Back, Admin!
              </h2>
            </div>
            <p className="text-slate-600 text-base sm:text-lg font-medium">
              Manage your institution with powerful tools and real-time insights
            </p>
          </div>

          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    activeCategory === category
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                      : 'bg-white/70 text-slate-700 hover:bg-white/90 hover:scale-105'
                  } backdrop-blur-sm`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Module Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTiles.map((tile, index) => {
              // Filter tiles based on user role
              const staffRestrictedTiles = ['admin/detect-assignments', 'database', 'crud', 'admin/student-controls'];
              if (userRole === 'STAFF' && staffRestrictedTiles.includes(tile.id)) {
                return null;
              }
              
              return (
                <Link
                  key={tile.id}
                  href={`/${tile.id}`}
                  className="block bounce-in ripple"
                  style={{animationDelay: `${index * 50}ms`}}
                >
                  <Card className="saas-card h-full card-hover border-white/50 bg-white/90 hover:bg-white/95 hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden relative">
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${tile.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative`}>
                          {tile.icon && <tile.icon className="h-7 w-7 text-white" />}
                          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${tile.color} text-white font-medium opacity-80`}>
                            {tile.category}
                          </span>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all duration-300" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2 leading-tight">
                          {tile.label}
                        </h3>
                        <p className="text-sm text-slate-600 group-hover:text-slate-700 transition-colors leading-relaxed">
                          {tile.description}
                        </p>
                      </div>
                    </CardContent>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${tile.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions Footer */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">System running optimally</span>
            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <button 
            className="h-14 w-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
            onClick={handleLogout}
          >
            <LogOut className="h-6 w-6 group-hover:animate-bounce" />
            <div className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
              3
            </div>
          </button>
        </div>
      </div>
    </PageTransition>
  );
}