// Notification API Helper Functions

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  data?: {
    type?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    [key: string]: any;
  };
}

export interface SendNotificationRequest {
  target: 'student' | 'students' | 'class' | 'all' | 'category';
  targetValue?: any;
  notification: NotificationPayload;
  includePush?: boolean;
  includeEmail?: boolean;
}

export interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  target: string;
  targetValue: string;
  successCount: number;
  failedCount: number;
  status: 'sent' | 'failed' | 'scheduled';
  createdAt: string;
  sentBy: string;
}

export interface NotificationStats {
  totalSent: number;
  todaySent: number;
  weekSent: number;
  monthSent: number;
  successRate: number;
  activeSubscriptions: number;
  categoryBreakdown: {
    [key: string]: number;
  };
  recentNotifications: NotificationHistory[];
}

export const notificationApi = {
  /**
   * Send a push notification
   */
  async sendNotification(data: SendNotificationRequest): Promise<{
    success: number;
    failed: number;
    message: string;
  }> {
    const response = await fetch('/api/admin/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to send notification');
    }
    
    return response.json();
  },

  /**
   * Get notification history with optional filters
   */
  async getHistory(filters?: {
    startDate?: string;
    endDate?: string;
    target?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    notifications: NotificationHistory[];
    total: number;
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const response = await fetch(`/api/admin/notifications/history?${params}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notification history');
    }
    
    return response.json();
  },

  /**
   * Get notification statistics
   */
  async getStatistics(): Promise<NotificationStats> {
    const response = await fetch('/api/admin/notifications/statistics', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch notification statistics');
    }
    
    return response.json();
  },

  /**
   * Get active subscription count
   */
  async getSubscriptionCount(): Promise<{ count: number }> {
    const response = await fetch('/api/admin/notifications/subscriptions/count', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch subscription count');
    }
    
    return response.json();
  },

  /**
   * Test notification send to admin
   */
  async sendTestNotification(notification: NotificationPayload): Promise<{ success: boolean }> {
    const response = await fetch('/api/admin/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ notification })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send test notification');
    }
    
    return response.json();
  },

  /**
   * Delete notification history entry
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean }> {
    const response = await fetch(`/api/admin/notifications/${notificationId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete notification');
    }
    
    return response.json();
  },

  /**
   * Resend a notification
   */
  async resendNotification(notificationId: string): Promise<{
    success: number;
    failed: number;
    message: string;
  }> {
    const response = await fetch(`/api/admin/notifications/${notificationId}/resend`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to resend notification');
    }
    
    return response.json();
  }
};

/**
 * Notification Templates
 */
export interface NotificationTemplate {
  id: string;
  title: string;
  body: string;
  category: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  defaultTarget: 'student' | 'class' | 'all' | 'category';
  color: string;
  emoji: string;
}

export const notificationTemplates: NotificationTemplate[] = [
  {
    id: 'class-cancelled',
    title: 'Class Cancelled',
    body: 'Classes are cancelled today. Check dashboard for more details.',
    category: 'general',
    icon: '/icons/android-launchericon.png',
    priority: 'high',
    defaultTarget: 'class',
    color: 'red',
    emoji: '❌'
  },
  {
    id: 'assignment-reminder',
    title: 'Assignment Due Soon',
    body: 'Reminder: Your assignment is due in 24 hours. Submit now!',
    category: 'assignments',
    icon: '/icons/android-launchericon.png',
    priority: 'medium',
    defaultTarget: 'category',
    color: 'blue',
    emoji: '📝'
  },
  {
    id: 'exam-schedule',
    title: 'Exam Schedule Update',
    body: 'Exam schedule has been updated. Check your dashboard now!',
    category: 'general',
    icon: '/icons/android-launchericon.png',
    priority: 'high',
    defaultTarget: 'all',
    color: 'orange',
    emoji: '📅'
  },
  {
    id: 'seminar-reminder',
    title: 'Seminar Tomorrow',
    body: 'Reminder: You have a seminar presentation tomorrow. Be prepared!',
    category: 'seminars',
    icon: '/icons/android-launchericon.png',
    priority: 'medium',
    defaultTarget: 'student',
    color: 'purple',
    emoji: '🎤'
  },
  {
    id: 'fine-alert',
    title: 'Fine Pending',
    body: 'You have pending fines. Please clear them at the earliest.',
    category: 'fines',
    icon: '/icons/android-launchericon.png',
    priority: 'high',
    defaultTarget: 'category',
    color: 'red',
    emoji: '💰'
  },
  {
    id: 'holiday-notice',
    title: 'Holiday Notice',
    body: 'Holiday declared tomorrow. College will remain closed.',
    category: 'general',
    icon: '/icons/android-launchericon.png',
    priority: 'medium',
    defaultTarget: 'all',
    color: 'green',
    emoji: '🎉'
  },
  {
    id: 'important-announcement',
    title: 'Important Announcement',
    body: 'Important announcement from administration. Check dashboard.',
    category: 'general',
    icon: '/icons/android-launchericon.png',
    priority: 'urgent',
    defaultTarget: 'all',
    color: 'red',
    emoji: '📢'
  },
  {
    id: 'cod-duty',
    title: 'COD Duty Reminder',
    body: 'You have COD duty today. Please be on time.',
    category: 'cod',
    icon: '/icons/android-launchericon.png',
    priority: 'high',
    defaultTarget: 'student',
    color: 'indigo',
    emoji: '👔'
  }
];
