import { supabaseAdmin } from './supabase';

export interface InAppNotificationData {
  title: string;
  body: string;
  url?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

/**
 * Create in-app notifications for students
 */
export async function createInAppNotifications(
  target: 'student' | 'students' | 'class' | 'all' | 'category',
  targetValue: any,
  notificationData: InAppNotificationData
): Promise<{ success: number; failed: number }> {
  try {
    let userIds: string[] = [];

    // Get target user IDs based on target type
    switch (target) {
      case 'all':
        const { data: allUsers } = await (supabaseAdmin as any)
          .from('unified_students')
          .select('id');
        userIds = allUsers?.map((u: any) => u.id) || [];
        break;

      case 'class':
        const { data: classUsers } = await (supabaseAdmin as any)
          .from('unified_students')
          .select('id')
          .eq('class', targetValue);
        userIds = classUsers?.map((u: any) => u.id) || [];
        break;

      case 'student':
        userIds = [targetValue];
        break;

      case 'students':
        userIds = Array.isArray(targetValue) ? targetValue : [];
        break;

      case 'category':
        // For category, send to all students (they can filter by category preference)
        const { data: categoryUsers } = await (supabaseAdmin as any)
          .from('unified_students')
          .select('id');
        userIds = categoryUsers?.map((u: any) => u.id) || [];
        break;
    }

    if (userIds.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Create notification records for each user
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: notificationData.title,
      body: notificationData.body,
      url: notificationData.url || '/dashboard',
      category: notificationData.category || 'general',
      priority: notificationData.priority || 'medium',
      read: false,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }));

    // Batch insert notifications
    const { data, error } = await (supabaseAdmin as any)
      .from('in_app_notifications')
      .insert(notifications)
      .select('id');

    if (error) {
      console.error('Error creating in-app notifications:', error);
      return { success: 0, failed: userIds.length };
    }

    return { success: data?.length || 0, failed: 0 };
  } catch (error) {
    console.error('Error in createInAppNotifications:', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await (supabaseAdmin as any)
    .from('in_app_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  return count || 0;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await (supabaseAdmin as any)
    .from('in_app_notifications')
    .update({ read: true })
    .eq('id', notificationId);

  return !error;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await (supabaseAdmin as any)
    .from('in_app_notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  return !error;
}
