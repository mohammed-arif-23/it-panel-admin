import { NextRequest, NextResponse } from 'next/server';
import { 
  getSubscriptions, 
  sendPushNotifications, 
  saveNotificationHistory,
  PushNotificationPayload 
} from '@/lib/webPushService';
import { createInAppNotifications } from '@/lib/inAppNotificationService';
import { 
  sendEnhancedNotifications, 
  createNotificationEmailTemplate,
  saveEnhancedNotificationHistory
} from '@/lib/enhancedNotificationService';
import { adminErrorHandler } from '@/lib/adminErrorHandler';
import { auditLogger, AuditActions, AuditResources } from '@/lib/auditLogger';
import { verifyJWT } from '@/lib/auth';

// Check admin authentication using JWT
async function checkAdminAuth(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) return false;
    
    const payload = await verifyJWT(token);
    return payload.role === 'HOD' || payload.role === 'STAFF';
  } catch (error) {
    console.error('JWT verification error:', error);
    return false;
  }
}

// Get admin user info from JWT
async function getAdminUserInfo(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return { userId: 'unknown', userRole: 'UNKNOWN' };
    }
    
    const payload = await verifyJWT(token);
    return {
      userId: payload.role, // Using role as user ID for now
      userRole: payload.role
    };
  } catch (error) {
    console.error('Error getting admin user info:', error);
    return { userId: 'unknown', userRole: 'UNKNOWN' };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { userId, userRole } = await getAdminUserInfo(request);
  
  if (!(await checkAdminAuth(request))) {
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.SEND_NOTIFICATION,
      AuditResources.NOTIFICATION,
      'Unauthorized access attempt',
      undefined,
      { endpoint: '/api/admin/notifications/send', method: 'POST' },
      startTime
    );
    
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { target, targetValue, notification } = body;

    console.log('Notification send request:', {
      target,
      targetValue,
      notification
    });

    // Validate request
    if (!target || !notification) {
      auditLogger.logFailure(
        userId,
        userRole,
        AuditActions.SEND_NOTIFICATION,
        AuditResources.NOTIFICATION,
        'Invalid request: missing target or notification',
        undefined,
        { 
          target, 
          hasNotification: !!notification,
          endpoint: '/api/admin/notifications/send', 
          method: 'POST' 
        },
        startTime
      );
      
      return NextResponse.json({
        success: 0,
        failed: 0,
        message: 'Target and notification are required'
      }, { status: 400 });
    }

    // Check if VAPID keys are configured (for push notifications)
    const hasVapidKeys = !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
    
    if (!hasVapidKeys) {
      console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
    }

    // 1. Create in-app notifications for all targeted students
    const inAppResult = await createInAppNotifications(
      target,
      targetValue,
      {
        title: notification.title,
        body: notification.body,
        url: notification.url,
        category: notification.data?.category,
        priority: notification.data?.priority
      }
    );

    // 2. Send enhanced notifications based on user preferences
    let enhancedResult = { 
      success: 0, 
      failed: 0, 
      push: { success: 0, failed: 0 }, 
      email: { success: 0, failed: 0 }, 
      errors: [] as Array<{ type: string; recipient: string; error: string }>
    };
    
    let enhancedNotification = notification;
    
    // Only send push notifications if includePush is true (default)
    if (body.includePush !== false) {
      enhancedNotification = {
        ...notification,
        // Only include email if explicitly requested via includeEmail toggle
        ...(body.includeEmail && {
          email: createNotificationEmailTemplate(
            notification.title,
            notification.body,
            notification.url,
            notification.data?.priority
          )
        })
      };

      enhancedResult = await sendEnhancedNotifications(
        { target, targetValue },
        enhancedNotification
      );
    }

    // 3. Save to history
    const totalSuccess = inAppResult.success + enhancedResult.success;
    const totalFailed = inAppResult.failed + enhancedResult.failed;

    await saveEnhancedNotificationHistory(
      enhancedNotification,
      target,
      targetValue,
      enhancedResult,
      userId // Use actual admin user ID
    );

    auditLogger.logSuccess(
      userId,
      userRole,
      AuditActions.SEND_NOTIFICATION,
      AuditResources.NOTIFICATION,
      undefined,
      { 
        target,
        targetValue,
        success: totalSuccess,
        failed: totalFailed,
        endpoint: '/api/admin/notifications/send', 
        method: 'POST' 
      },
      startTime
    );

    // 4. Return results
    return NextResponse.json({
      success: totalSuccess,
      failed: totalFailed,
      message: `Notification sent to ${inAppResult.success} student(s)${enhancedResult.push.success > 0 ? ` (${enhancedResult.push.success} push notifications delivered)` : ''}${enhancedResult.email.success > 0 ? ` (${enhancedResult.email.success} emails sent)` : ''}`
    });
  } catch (error: any) {
    console.error('Notification send error:', error);
    auditLogger.logFailure(
      userId,
      userRole,
      AuditActions.SEND_NOTIFICATION,
      AuditResources.NOTIFICATION,
      error.message || 'Unknown error',
      undefined,
      { error: error.message, endpoint: '/api/admin/notifications/send', method: 'POST' },
      startTime
    );
    
    // Use error handler for more detailed error response
    const errorContext = {
      code: error.code,
      statusCode: 500,
      endpoint: '/api/admin/notifications/send',
      method: 'POST',
      userAction: 'send_notification'
    };
    
    const actionableError = adminErrorHandler.handle(error, errorContext);
    return NextResponse.json(
      { error: actionableError.message, message: error.message },
      { status: 500 }
    );
  }
}