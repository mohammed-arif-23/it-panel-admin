// Web Push Notification Service
import webpush from 'web-push';
import { supabaseAdmin } from './supabase';

// Configure VAPID details
const vapidDetails = {
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

// Initialize web-push with VAPID keys
if (vapidDetails.publicKey && vapidDetails.privateKey) {
  webpush.setVapidDetails(
    vapidDetails.subject,
    vapidDetails.publicKey,
    vapidDetails.privateKey
  );
} else {
  console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SendResult {
  success: number;
  failed: number;
  errors: Array<{ endpoint: string; error: string }>;
}

/**
 * Get push subscriptions based on target criteria
 */
export async function getSubscriptions(
  target: 'student' | 'students' | 'class' | 'all' | 'category',
  targetValue?: any
): Promise<any[]> {
  try {
    if (target === 'all') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*');
      return data || [];
    }

    if (target === 'class') {
      // Get students in the class
      const { data: students } = await supabaseAdmin
        .from('unified_students')
        .select('id')
        .eq('class_year', targetValue);
      
      const studentIds = students?.map((s: any) => s.id) || [];
      
      if (studentIds.length === 0) return [];
      
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .in('user_id', studentIds);
      return data || [];
    }

    if (target === 'student') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', targetValue);
      return data || [];
    }

    if (target === 'students') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .in('user_id', targetValue);
      return data || [];
    }

    if (target === 'category') {
      // For category targeting, you might want to add a preferences table
      // For now, we'll just return all subscriptions
      // TODO: Implement preference-based filtering
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*');
      return data || [];
    }

    return [];
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return [];
  }
}

/**
 * Send push notification to a single subscription
 */
async function sendToSubscription(
  subscription: any,
  payload: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Parse subscription from JSONB if needed
    const sub = subscription.subscription || subscription;
    
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys?.p256dh || sub.p256dh,
          auth: sub.keys?.auth || sub.auth
        }
      },
      payload
    );
    return { success: true };
  } catch (error: any) {
    console.error('Push send error:', error);
    
    // Remove invalid subscriptions (410 Gone = subscription expired)
    if (error.statusCode === 410) {
      await removeSubscription(subscription.id);
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send push notifications to multiple subscriptions
 */
export async function sendPushNotifications(
  subscriptions: any[],
  notification: PushNotificationPayload
): Promise<SendResult> {
  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/icon.svg',
    tag: notification.tag || 'notification',
    data: {
      url: notification.url || '/dashboard',
      priority: notification.priority || 'medium',
      ...notification.data
    }
  });

  const results = await Promise.all(
    subscriptions.map(sub => sendToSubscription(sub, payload))
  );

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const errors = results
    .filter(r => !r.success)
    .map((r, i) => ({
      endpoint: subscriptions[i].endpoint,
      error: r.error || 'Unknown error'
    }));

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

/**
 * Remove an invalid subscription from database
 */
async function removeSubscription(subscriptionId: string): Promise<void> {
  try {
    await (supabaseAdmin as any)
      .from('push_subscriptions')
      .delete()
      .eq('id', subscriptionId);
    console.log(`Removed invalid subscription: ${subscriptionId}`);
  } catch (error) {
    console.error('Error removing subscription:', error);
  }
}

/**
 * Save notification to history
 */
export async function saveNotificationHistory(
  notification: PushNotificationPayload,
  target: string,
  targetValue: any,
  result: SendResult,
  sentBy: string
): Promise<void> {
  try {
    // Note: This saves to a simplified history table
    // If you need per-user tracking, you'd need to iterate through recipients
    await (supabaseAdmin as any)
      .from('notification_history')
      .insert({
        user_id: null, // For admin-sent notifications, user_id can be null or create separate admin_notifications table
        notification_type: target,
        title: notification.title,
        body: notification.body,
        data: {
          target,
          targetValue,
          success_count: result.success,
          failed_count: result.failed,
          sent_by: sentBy,
          ...notification.data
        },
        sent_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error saving notification history:', error);
  }
}
