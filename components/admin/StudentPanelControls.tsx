'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  FileText, 
  Calendar, 
  Bell, 
  BookOpen,
  FlaskConical,
  StickyNote,
  Library,
  IndianRupee,
  UserCheck,
  Award,
  MessageCircle,
  Building2,
  GraduationCap,
  Lightbulb,
  CalendarClock,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Settings,
  Filter,
  Search,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  slideUp, 
  staggerContainer, 
  staggerItem, 
  cardHover,
  modalBackdrop,
  modalContent 
} from '@/lib/animations'

interface StudentActivity {
  id: string
  studentId: string
  studentName: string
  activity: string
  module: string
  timestamp: string
  status: 'success' | 'pending' | 'failed'
  details?: any
}

interface ModuleStats {
  module: string
  icon: any
  totalUsers: number
  activeToday: number
  completionRate: number
  avgTimeSpent: string
  color: string
}

const moduleConfigs = [
  { 
    id: 'dashboard', 
    name: 'Dashboard', 
    icon: BarChart3, 
    color: 'from-blue-500 to-blue-600',
    description: 'Main dashboard activity and navigation'
  },
  { 
    id: 'assignments', 
    name: 'Assignments', 
    icon: FileText, 
    color: 'from-green-500 to-green-600',
    description: 'Assignment submissions and management'
  },
  { 
    id: 'timetable', 
    name: 'Timetable', 
    icon: CalendarClock, 
    color: 'from-purple-500 to-purple-600',
    description: 'Class schedules and timetable viewing'
  },
  { 
    id: 'notice', 
    name: 'Notice Board', 
    icon: Bell, 
    color: 'from-orange-500 to-orange-600',
    description: 'Notice viewing and notifications'
  },
  { 
    id: 'seminar', 
    name: 'Seminar Booking', 
    icon: Calendar, 
    color: 'from-pink-500 to-pink-600',
    description: 'Seminar slot booking and management'
  },
  { 
    id: 'fines', 
    name: 'Fine History', 
    icon: IndianRupee, 
    color: 'from-red-500 to-red-600',
    description: 'Fine payments and history tracking'
  },
  { 
    id: 'learning', 
    name: 'Learning Module', 
    icon: BookOpen, 
    color: 'from-indigo-500 to-indigo-600',
    description: 'Learning content and progress tracking'
  },
  { 
    id: 'qps', 
    name: 'Question Papers', 
    icon: Library, 
    color: 'from-teal-500 to-teal-600',
    description: 'University question paper access'
  },
  { 
    id: 'lab-manuals', 
    name: 'Lab Manuals', 
    icon: FlaskConical, 
    color: 'from-cyan-500 to-cyan-600',
    description: 'Laboratory manual downloads'
  },
  { 
    id: 'notes', 
    name: 'Study Notes', 
    icon: StickyNote, 
    color: 'from-amber-500 to-amber-600',
    description: 'Study notes and materials'
  },
  { 
    id: 'cod', 
    name: 'Concept of Day', 
    icon: Lightbulb, 
    color: 'from-yellow-500 to-yellow-600',
    description: 'Daily concept learning'
  },
  { 
    id: 'profile', 
    name: 'Profile Management', 
    icon: Users, 
    color: 'from-slate-500 to-slate-600',
    description: 'Student profile and settings'
  }
]

export default function StudentPanelControls() {
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'activity' | 'analytics'>('overview')
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([])
  const [recentActivity, setRecentActivity] = useState<StudentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    module: 'all',
    status: 'all',
    timeRange: '24h'
  })

  useEffect(() => {
    fetchStudentPanelData()
  }, [])

  const fetchStudentPanelData = async () => {
    setLoading(true)
    try {
      // Simulate API calls - replace with actual endpoints
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/student-panel/stats'),
        fetch('/api/admin/student-panel/activity')
      ])

      // Mock data for demonstration
      const mockStats: ModuleStats[] = moduleConfigs.map(config => ({
        module: config.name,
        icon: config.icon,
        totalUsers: Math.floor(Math.random() * 200) + 50,
        activeToday: Math.floor(Math.random() * 50) + 10,
        completionRate: Math.floor(Math.random() * 40) + 60,
        avgTimeSpent: `${Math.floor(Math.random() * 20) + 5}m`,
        color: config.color
      }))

      const mockActivity: StudentActivity[] = Array.from({ length: 20 }, (_, i) => ({
        id: `activity_${i}`,
        studentId: `STU${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        studentName: `Student ${i + 1}`,
        activity: ['Login', 'Assignment Submit', 'Download QP', 'Book Seminar', 'View Notice'][Math.floor(Math.random() * 5)],
        module: moduleConfigs[Math.floor(Math.random() * moduleConfigs.length)].name,
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        status: ['success', 'pending', 'failed'][Math.floor(Math.random() * 3)] as any
      }))

      setModuleStats(mockStats)
      setRecentActivity(mockActivity)
    } catch (error) {
      console.error('Error fetching student panel data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const filteredActivity = recentActivity.filter(activity => {
    const matchesSearch = activity.studentName.toLowerCase().includes(filters.search.toLowerCase()) ||
                         activity.activity.toLowerCase().includes(filters.search.toLowerCase())
    const matchesModule = filters.module === 'all' || activity.module === filters.module
    const matchesStatus = filters.status === 'all' || activity.status === filters.status
    return matchesSearch && matchesModule && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-primary)]">
            Student Panel Controls
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1">
            Monitor and manage all student panel activities
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={fetchStudentPanelData}
            className="saas-button-secondary"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
          <Button className="saas-button-primary">
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4 bg-[var(--color-accent)] p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="modules" className="rounded-lg">Modules</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg">Activity</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="space-y-6"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { 
                    label: 'Total Students', 
                    value: '245', 
                    change: '+12', 
                    icon: Users, 
                    color: 'from-blue-500 to-blue-600' 
                  },
                  { 
                    label: 'Active Today', 
                    value: '189', 
                    change: '+23', 
                    icon: UserCheck, 
                    color: 'from-green-500 to-green-600' 
                  },
                  { 
                    label: 'Avg Session', 
                    value: '24m', 
                    change: '+5m', 
                    icon: Clock, 
                    color: 'from-purple-500 to-purple-600' 
                  },
                  { 
                    label: 'Success Rate', 
                    value: '94%', 
                    change: '+2%', 
                    icon: TrendingUp, 
                    color: 'from-orange-500 to-orange-600' 
                  }
                ].map((metric, index) => (
                  <motion.div key={metric.label} variants={staggerItem}>
                    <Card className={`saas-card border-none shadow-lg bg-gradient-to-br ${metric.color} text-white overflow-hidden`}>
                      <CardContent className="p-6 relative">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm opacity-90 font-medium">{metric.label}</p>
                            <div className="flex items-baseline gap-2 mt-2">
                              <p className="text-3xl font-bold">{metric.value}</p>
                              <span className="text-sm opacity-75">{metric.change}</span>
                            </div>
                          </div>
                          <metric.icon className="h-10 w-10 opacity-80" />
                        </div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Top Modules */}
              <motion.div variants={staggerItem}>
                <Card className="saas-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Most Used Modules (Today)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {moduleStats.slice(0, 5).map((stat, index) => (
                        <div key={stat.module} className="flex items-center justify-between p-3 bg-[var(--color-accent)] rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                              <stat.icon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-[var(--color-primary)]">{stat.module}</h4>
                              <p className="text-sm text-[var(--color-text-muted)]">{stat.activeToday} active users</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-[var(--color-primary)]">{stat.completionRate}%</p>
                            <p className="text-sm text-[var(--color-text-muted)]">completion</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          <TabsContent value="modules" className="mt-6">
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {moduleConfigs.map((module) => {
                const stats = moduleStats.find(s => s.module === module.name) || {
                  totalUsers: 0,
                  activeToday: 0,
                  completionRate: 0,
                  avgTimeSpent: '0m'
                }
                
                return (
                  <motion.div key={module.id} variants={staggerItem}>
                    <Card className="saas-card card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center shadow-lg`}>
                            <module.icon className="h-6 w-6 text-white" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {stats.activeToday} active
                          </Badge>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-[var(--color-primary)] mb-2">
                          {module.name}
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] mb-4">
                          {module.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-[var(--color-text-muted)]">Total Users</p>
                            <p className="font-semibold text-[var(--color-primary)]">{stats.totalUsers}</p>
                          </div>
                          <div>
                            <p className="text-[var(--color-text-muted)]">Avg Time</p>
                            <p className="font-semibold text-[var(--color-primary)]">{stats.avgTimeSpent}</p>
                          </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-[var(--color-border-light)]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-[var(--color-text-muted)]">Success Rate</span>
                            <span className="text-sm font-semibold text-[var(--color-success)]">
                              {stats.completionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-[var(--color-accent)] rounded-full h-2 mt-2">
                            <div 
                              className="bg-[var(--color-success)] h-2 rounded-full transition-all duration-300"
                              style={{ width: `${stats.completionRate}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <motion.div
              variants={slideUp}
              initial="initial"
              animate="animate"
              className="space-y-4"
            >
              {/* Filters */}
              <Card className="saas-card">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Input
                      placeholder="Search students or activities..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="saas-input"
                    />
                    <select
                      value={filters.module}
                      onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
                      className="saas-input"
                    >
                      <option value="all">All Modules</option>
                      {moduleConfigs.map(module => (
                        <option key={module.id} value={module.name}>{module.name}</option>
                      ))}
                    </select>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="saas-input"
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                    <select
                      value={filters.timeRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                      className="saas-input"
                    >
                      <option value="1h">Last Hour</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                      <option value="30d">Last 30 Days</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Activity List */}
              <Card className="saas-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      Recent Activity ({filteredActivity.length})
                    </span>
                    <Button size="sm" className="saas-button-secondary">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredActivity.slice(0, 10).map((activity) => (
                      <div 
                        key={activity.id}
                        className="flex items-center justify-between p-4 bg-[var(--color-accent)] rounded-lg hover:bg-white transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {getStatusIcon(activity.status)}
                          <div>
                            <h4 className="font-semibold text-[var(--color-primary)]">
                              {activity.studentName}
                            </h4>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              {activity.activity} in {activity.module}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                          <Badge 
                            variant={activity.status === 'success' ? 'default' : 
                                   activity.status === 'pending' ? 'secondary' : 'destructive'}
                            className="text-xs mt-1"
                          >
                            {activity.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <motion.div
              variants={slideUp}
              initial="initial"
              animate="animate"
            >
              <Card className="saas-card">
                <CardContent className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-[var(--color-text-muted)] mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-[var(--color-primary)] mb-2">
                    Advanced Analytics Coming Soon
                  </h3>
                  <p className="text-[var(--color-text-muted)] mb-6">
                    Detailed charts, usage patterns, and performance metrics will be available here
                  </p>
                  <Button className="saas-button-primary">
                    <Bell className="w-4 h-4 mr-2" />
                    Notify When Ready
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
