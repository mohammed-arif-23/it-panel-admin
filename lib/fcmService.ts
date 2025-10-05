// Firebase Cloud Messaging Service
import * as admin from 'firebase-admin';
import { supabaseAdmin } from './supabase';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
  }
}

export interface FCMNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface FCMSendResult {
  success: number;
  failed: number;
  errors: Array<{ token: string; error: string }>;
}

/**
 * Get FCM tokens based on target criteria
 */
export async function getFCMTokens(
  target: 'student' | 'students' | 'class' | 'all' | 'category',
  targetValue?: any
): Promise<Array<{ token: string; user_id: string; device_type?: string }>> {
  try {
    // Query from push_subscriptions table instead (unified table for both web push and FCM)
    let query = supabaseAdmin
      .from('push_subscriptions')
      .select('fcm_token, user_id, platform')
      .not('fcm_token', 'is', null);

    if (target === 'all') {
      // Get all active FCM tokens
      const { data } = await query;
      // Map to expected format
      return (data || []).map((item: any) => ({
        token: item.fcm_token,
        user_id: item.user_id,
        device_type: item.platform
      }));
    }

    if (target === 'class') {
      // Get students in the class
      const { data: students } = await supabaseAdmin
        .from('unified_students')
        .select('id')
        .eq('class_year', targetValue);
      
      const studentIds = students?.map((s: any) => s.id) || [];
      
      if (studentIds.length === 0) return [];
      
      const { data } = await query.in('user_id', studentIds);
      return (data || []).map((item: any) => ({
        token: item.fcm_token,
        user_id: item.user_id,
        device_type: item.platform
      }));
    }

    if (target === 'student') {
      const { data } = await query.eq('user_id', targetValue);
      return (data || []).map((item: any) => ({
        token: item.fcm_token,
        user_id: item.user_id,
        device_type: item.platform
      }));
    }

    if (target === 'students') {
      const { data } = await query.in('user_id', targetValue);
      return (data || []).map((item: any) => ({
        token: item.fcm_token,
        user_id: item.user_id,
        device_type: item.platform
      }));
    }

    if (target === 'category') {
      // For category targeting, get all tokens for now
      // TODO: Implement preference-based filtering
      const { data } = await query;
      return (data || []).map((item: any) => ({
        token: item.fcm_token,
        user_id: item.user_id,
        device_type: item.platform
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching FCM tokens:', error);
    return [];
  }
}

/**
 * Send FCM notification to a single token
 */
async function sendToToken(
  token: string,
  payload: FCMNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.icon && { imageUrl: payload.icon })
      },
      data: {
        url: payload.url || '/dashboard',
        priority: payload.priority || 'medium',
        tag: payload.tag || 'notification',
        ...payload.data
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/android-launchericon.png',
          tag: payload.tag || 'notification',
          data: {
            url: payload.url || '/dashboard',
            priority: payload.priority || 'medium',
            ...payload.data
          },
          actions: payload.url ? [
            {
              action: 'open',
              title: 'View Details'
            }
          ] : undefined
        },
        fcmOptions: {
          link: payload.url || '/dashboard'
        }
      },
      android: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || 'ic_notification',
          color: '#667eea',
          tag: payload.tag || 'notification',
          clickAction: payload.url || '/dashboard'
        },
        priority: (payload.priority === 'urgent' ? 'high' : 'normal') as 'high' | 'normal'
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            },
            badge: 1,
            sound: 'default'
          }
        },
        fcmOptions: {
          imageUrl: payload.icon
        }
      }
    };

    await admin.messaging().send(message);
    return { success: true };
  } catch (error: any) {
    console.error('FCM send error:', error);
    
    // Remove invalid tokens
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      await removeInvalidToken(token);
    }
    
    return {
      success: false,
      error: error.message || 'Unknown FCM error'
    };
  }
}

/**
 * Send FCM notifications to multiple tokens
 */
export async function sendFCMNotifications(
  tokens: Array<{ token: string; user_id: string; device_type?: string }>,
  notification: FCMNotificationPayload
): Promise<FCMSendResult> {
  const results = await Promise.all(
    tokens.map(tokenData => sendToToken(tokenData.token, notification))
  );

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const errors = results
    .filter(r => !r.success)
    .map((r, i) => ({
      token: tokens[i].token,
      error: r.error || 'Unknown error'
    }));

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

/**
 * Send multicast message to multiple tokens (more efficient for large batches)
 */
export async function sendMulticastFCM(
  tokens: string[],
  notification: FCMNotificationPayload
): Promise<FCMSendResult> {
  try {
    if (tokens.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    const message = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body
      },
      data: {
        url: notification.url || '/dashboard',
        priority: notification.priority || 'medium',
        tag: notification.tag || 'notification',
        ...notification.data
      },
      webpush: {
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icons/android-launchericon.png',
          tag: notification.tag || 'notification'
        },
        fcmOptions: {
          link: notification.url || '/dashboard'
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Handle failed tokens
    const errors: Array<{ token: string; error: string }> = [];
    if (response.failureCount > 0) {
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const token = tokens[idx];
          errors.push({
            token,
            error: resp.error?.message || 'Unknown error'
          });
          
          // Remove invalid tokens
          if (resp.error?.code === 'messaging/registration-token-not-registered' || 
              resp.error?.code === 'messaging/invalid-registration-token') {
            removeInvalidToken(token);
          }
        }
      });
    }

    return {
      success: response.successCount,
      failed: response.failureCount,
      errors
    };
  } catch (error: any) {
    console.error('FCM multicast error:', error);
    return {
      success: 0,
      failed: tokens.length,
      errors: tokens.map(token => ({
        token,
        error: error.message || 'Unknown error'
      }))
    };
  }
}

/**
 * Remove invalid FCM token from database
 */
async function removeInvalidToken(token: string): Promise<void> {
  try {
    await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('fcm_token', token);
    console.log(`Removed invalid FCM token: ${token.substring(0, 20)}...`);
  } catch (error) {
    console.error('Error removing invalid token:', error);
  }
}

/**
 * Get FCM token count for statistics
 */
export async function getFCMTokenCount(): Promise<number> {
  try {
    const { count } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*', { count: 'exact', head: true })
      .not('fcm_token', 'is', null);
    
    return count || 0;
  } catch (error) {
    console.error('Error getting FCM token count:', error);
    return 0;
  }
}
