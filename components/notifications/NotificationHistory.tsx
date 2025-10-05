"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTableWithSort } from '@/components/ui/data-table-with-sort';
import { notificationApi, NotificationHistory as NotificationHistoryType } from '@/lib/notificationApi';
import { RefreshCw, Trash2, Send, Calendar, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<NotificationHistoryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    target: '',
    status: '',
    category: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await notificationApi.getHistory(filters);
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error('Failed to fetch notification history:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    fetchHistory();
  };

  const clearFilters = () => {
    setFilters({
      target: '',
      status: '',
      category: '',
      startDate: '',
      endDate: ''
    });
    setTimeout(() => fetchHistory(), 100);
  };

  const handleResend = async (notificationId: string) => {
    try {
      await notificationApi.resendNotification(notificationId);
      alert('Notification resent successfully!');
      fetchHistory();
    } catch (error: any) {
      alert(`Failed to resend: ${error.message}`);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Are you sure you want to delete this notification from history?')) {
      return;
    }
    
    try {
      await notificationApi.deleteNotification(notificationId);
      fetchHistory();
    } catch (error: any) {
      alert(`Failed to delete: ${error.message}`);
    }
  };

  const getStatusBadge = (status: string, successCount: number, failedCount: number) => {
    if (status === 'sent') {
      if (failedCount === 0) {
        return <Badge className="bg-green-100 text-green-800">✓ Sent</Badge>;
      }
      return <Badge className="bg-yellow-100 text-yellow-800">⚠ Partial</Badge>;
    }
    if (status === 'failed') {
      return <Badge className="bg-red-100 text-red-800">✗ Failed</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-800">⏱ Scheduled</Badge>;
  };

  const columns = [
    {
      key: 'title',
      label: 'Notification',
      sortable: true,
      render: (value: string, row: NotificationHistoryType) => (
        <div>
          <div className="font-medium text-sm">{row.title}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{row.body}</div>
        </div>
      )
    },
    {
      key: 'target',
      label: 'Target',
      sortable: true,
      render: (value: string, row: NotificationHistoryType) => (
        <div>
          <div className="text-sm capitalize">{row.target}</div>
          {row.targetValue && (
            <div className="text-xs text-gray-500">{String(row.targetValue)}</div>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Sent At',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm">
          {format(new Date(value), 'MMM dd, yyyy')}
          <br />
          <span className="text-xs text-gray-500">
            {format(new Date(value), 'hh:mm a')}
          </span>
        </div>
      )
    },
    {
      key: 'successCount',
      label: 'Delivered',
      sortable: true,
      render: (value: number, row: NotificationHistoryType) => (
        <div>
          <div className="text-sm font-medium text-green-600">{row.successCount}</div>
          {row.failedCount > 0 && (
            <div className="text-xs text-red-600">Failed: {row.failedCount}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string, row: NotificationHistoryType) => 
        getStatusBadge(row.status, row.successCount, row.failedCount)
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (_: any, row: NotificationHistoryType) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleResend(row.id)}
            className="h-8 w-8 p-0"
            title="Resend"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Filter notification history</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </div>
        </CardHeader>
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Select value={filters.target} onValueChange={(v) => handleFilterChange('target', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Target Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Targets</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filters.category} onValueChange={(v) => handleFilterChange('category', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="assignments">Assignments</SelectItem>
                    <SelectItem value="seminars">Seminars</SelectItem>
                    <SelectItem value="fines">Fines</SelectItem>
                    <SelectItem value="cod">COD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  placeholder="Start Date"
                />
              </div>

              <div>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  placeholder="End Date"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button onClick={applyFilters} size="sm">
                Apply Filters
              </Button>
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* History Table */}
      <DataTableWithSort
        title="Notification History"
        description={`${notifications.length} notifications found`}
        data={notifications}
        columns={columns}
        searchable={true}
        searchFields={['title', 'body', 'target']}
        searchPlaceholder="Search notifications..."
        isLoading={isLoading}
        onRefresh={fetchHistory}
        emptyMessage="No notifications found"
        emptyIcon={<Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />}
      />
    </div>
  );
}
