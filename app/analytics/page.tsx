"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';

interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  totalAssignments: number;
  pendingAssignments: number;
  totalSeminars: number;
  upcomingSeminars: number;
  totalFines: number;
  pendingFines: number;
  systemHealth: number;
}

interface ChartDataPoint {
  date: string;
  students: number;
  assignments: number;
  seminars: number;
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Fetch analytics data
  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch analytics data
      const [studentsRes, assignmentsRes, seminarsRes, finesRes, systemRes] = await Promise.all([
        fetch('/api/admin/analytics/students'),
        fetch('/api/admin/analytics/assignments'),
        fetch('/api/admin/analytics/seminars'),
        fetch('/api/admin/analytics/fines'),
        fetch('/api/admin/system/health')
      ]);

      const [studentsData, assignmentsData, seminarsData, finesData, systemData] = await Promise.all([
        studentsRes.json(),
        assignmentsRes.json(),
        seminarsRes.json(),
        finesRes.json(),
        systemRes.json()
      ]);

      if (studentsData.success && assignmentsData.success && seminarsData.success && finesData.success) {
        setAnalytics({
          totalStudents: studentsData.total,
          activeStudents: studentsData.active,
          totalAssignments: assignmentsData.total,
          pendingAssignments: assignmentsData.pending,
          totalSeminars: seminarsData.total,
          upcomingSeminars: seminarsData.upcoming,
          totalFines: finesData.total,
          pendingFines: finesData.pending,
          systemHealth: systemData.health || 100
        });
      } else {
        setError('Failed to fetch analytics data');
      }
      
      // Fetch chart data
      const chartResponse = await fetch(`/api/admin/analytics/chart?range=${timeRange}`);
      const chartData = await chartResponse.json();
      
      if (chartData.success) {
        setChartData(chartData.data);
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

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

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--color-background)]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--color-background)] border-b border-[var(--color-border-light)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Analytics Dashboard</h1>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Real-time insights and performance metrics
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Button 
                    variant={timeRange === '7d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeRange('7d')}
                    className={timeRange === '7d' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  >
                    7D
                  </Button>
                  <Button 
                    variant={timeRange === '30d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeRange('30d')}
                    className={timeRange === '30d' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  >
                    30D
                  </Button>
                  <Button 
                    variant={timeRange === '90d' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setTimeRange('90d')}
                    className={timeRange === '90d' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                  >
                    90D
                  </Button>
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
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          ) : null}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="saas-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Total Students</p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                      {loading ? (
                        <span className="animate-pulse bg-[var(--color-accent)] rounded h-8 w-16 inline-block"></span>
                      ) : (
                        analytics?.totalStudents || 0
                      )}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">+12% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="saas-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Active Assignments</p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                      {loading ? (
                        <span className="animate-pulse bg-[var(--color-accent)] rounded h-8 w-16 inline-block"></span>
                      ) : (
                        analytics?.totalAssignments || 0
                      )}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-600">-3% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="saas-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Upcoming Seminars</p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                      {loading ? (
                        <span className="animate-pulse bg-[var(--color-accent)] rounded h-8 w-16 inline-block"></span>
                      ) : (
                        analytics?.upcomingSeminars || 0
                      )}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">+8% from last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="saas-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">Pending Fines</p>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                      {loading ? (
                        <span className="animate-pulse bg-[var(--color-accent)] rounded h-8 w-16 inline-block"></span>
                      ) : (
                        analytics?.pendingFines || 0
                      )}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-600">-5% from last month</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="saas-card lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-32">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full border-8 border-gray-200 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {loading ? (
                          <span className="animate-pulse">--</span>
                        ) : (
                          `${analytics?.systemHealth || 0}%`
                        )}
                      </span>
                    </div>
                    <div 
                      className="absolute inset-0 rounded-full border-8 border-green-500 border-t-transparent animate-spin"
                      style={{ animationDuration: '2s' }}
                    ></div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {loading ? 'Loading...' : 'All systems operational'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="saas-card lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((item) => (
                    <div key={item} className="flex items-center gap-3 p-3 bg-[var(--color-accent)] rounded-lg">
                      <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center">
                        <Activity className="h-5 w-5 text-[var(--color-secondary)]" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">System update completed</p>
                        <p className="text-sm text-[var(--color-text-muted)]">2 hours ago</p>
                      </div>
                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="saas-card">
              <CardHeader>
                <CardTitle>Student Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--color-text-muted)]">Chart visualization</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Student enrollment trends over time
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="saas-card">
              <CardHeader>
                <CardTitle>Assignment Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-[var(--color-text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--color-text-muted)]">Chart visualization</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Assignment submission rates
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}