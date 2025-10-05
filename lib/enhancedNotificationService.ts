// Enhanced Notification Service
// Supports both push notifications and email notifications

import { 
  getFCMTokens, 
  sendMulticastFCM, 
  FCMNotificationPayload 
} from './fcmService';
import { emailService } from './emailService';
import { supabaseAdmin } from './supabase';

interface EmailNotificationOptions {
  subject: string;
  html: string;
  text?: string;
}

interface NotificationTarget {
  target: 'student' | 'students' | 'class' | 'all' | 'category';
  targetValue?: any;
}

interface EnhancedNotificationPayload extends FCMNotificationPayload {
  email?: EmailNotificationOptions;
}

interface SendResult {
  success: number;
  failed: number;
  push: {
    success: number;
    failed: number;
  };
  email: {
    success: number;
    failed: number;
  };
  errors: Array<{ type: string; recipient: string; error: string }>;
}

/**
 * Get student emails based on target criteria
 */
export async function getStudentEmails(
  target: 'student' | 'students' | 'class' | 'all' | 'category',
  targetValue?: any
): Promise<Array<{ email: string; name: string; register_number: string }>> {
  try {
    let query = supabaseAdmin
      .from('unified_students')
      .select('email, name, register_number');

    if (target === 'all') {
      // Get all students with emails
      query = query.not('email', 'is', null);
    } else if (target === 'class') {
      // Get students in the class
      query = query
        .eq('class_year', targetValue)
        .not('email', 'is', null);
    } else if (target === 'student') {
      // Get specific student
      query = query
        .eq('id', targetValue)
        .not('email', 'is', null);
    } else if (target === 'students') {
      // Get specific students
      query = query
        .in('id', targetValue)
        .not('email', 'is', null);
    } else if (target === 'category') {
      // For category targeting, get students based on their subscriptions or preferences
      // For now, we'll get all students with emails
      query = query.not('email', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching student emails:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStudentEmails:', error);
    return [];
  }
}

/**
 * Send email notification to a single recipient
 */
async function sendEmailToRecipient(
  recipient: { email: string; name: string; register_number: string },
  payload: EmailNotificationOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await emailService.sendEmail({
      to: recipient.email,
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });
    
    return result;
  } catch (error: any) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send email notifications to multiple recipients
 */
async function sendEmailNotifications(
  recipients: Array<{ email: string; name: string; register_number: string }>,
  emailOptions: EmailNotificationOptions
): Promise<{ success: number; failed: number; errors: Array<{ recipient: string; error: string }> }> {
  const results = await Promise.all(
    recipients.map(recipient => sendEmailToRecipient(recipient, emailOptions))
  );

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const errors = results
    .filter(r => !r.success)
    .map((r, i) => ({
      recipient: recipients[i].email,
      error: r.error || 'Unknown error'
    }));

  return {
    success: successCount,
    failed: failedCount,
    errors
  };
}

/**
 * Send enhanced notifications (both push and email)
 */
export async function sendEnhancedNotifications(
  targetInfo: NotificationTarget,
  notification: EnhancedNotificationPayload
): Promise<SendResult> {
  const results: SendResult = {
    success: 0,
    failed: 0,
    push: {
      success: 0,
      failed: 0
    },
    email: {
      success: 0,
      failed: 0
    },
    errors: []
  };

  try {
    // Send FCM push notifications if payload is provided
    if (notification.title && notification.body) {
      const fcmTokens = await getFCMTokens(targetInfo.target, targetInfo.targetValue);
      
      if (fcmTokens.length > 0) {
        const tokens = fcmTokens.map(t => t.token);
        const pushResult = await sendMulticastFCM(tokens, notification);
        results.push.success = pushResult.success;
        results.push.failed = pushResult.failed;
        results.errors.push(...pushResult.errors.map((e: any) => ({
          type: 'push',
          recipient: e.token,
          error: e.error
        })));
      }
    }

    // Send email notifications if email options are provided
    if (notification.email) {
      const recipients = await getStudentEmails(targetInfo.target, targetInfo.targetValue);
      
      if (recipients.length > 0) {
        // Customize email content for each recipient
        const emailResult = await sendEmailNotifications(recipients, {
          subject: notification.email.subject,
          html: notification.email.html,
          text: notification.email.text
        });
        
        results.email.success = emailResult.success;
        results.email.failed = emailResult.failed;
        results.errors.push(...emailResult.errors.map(e => ({
          type: 'email',
          recipient: e.recipient,
          error: e.error
        })));
      }
    }

    // Calculate total success/failed counts
    results.success = results.push.success + results.email.success;
    results.failed = results.push.failed + results.email.failed;

    return results;
  } catch (error: any) {
    console.error('Enhanced notification error:', error);
    throw new Error(`Failed to send enhanced notifications: ${error.message}`);
  }
}

/**
 * Create HTML email template for notifications
 */
export function createNotificationEmailTemplate(
  title: string,
  body: string,
  url?: string,
  priority?: string
): EmailNotificationOptions {
  const priorityColors: Record<string, string> = {
    urgent: '#d32f2f',
    high: '#ed6c02',
    medium: '#1976d2',
    low: '#388e3c'
  };

  const priorityEmojis: Record<string, string> = {
    urgent: '🚨',
    high: '⚠️',
    medium: 'ℹ️',
    low: '📢'
  };

  const priorityColor = priorityColors[priority || 'medium'] || '#1976d2';
  const priorityEmoji = priorityEmojis[priority || 'medium'] || '📢';

  const subject = `${priorityEmoji} ${title}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f5f5f5;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          padding: 20px; 
          background: white; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
        }
        .priority-banner {
          background: ${priorityColor};
          color: white;
          padding: 10px;
          text-align: center;
          font-weight: bold;
          border-radius: 5px;
          margin: 10px 0;
        }
        .content { 
          padding: 30px; 
        }
        .message-body {
          background: #f8f9fa;
          padding: 20px;
          border-left: 4px solid ${priorityColor};
          border-radius: 5px;
          margin: 20px 0;
        }
        .button { 
          display: inline-block; 
          background: #4CAF50; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
          font-weight: bold;
        }
        .button:hover {
          background: #45a049;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          padding-top: 20px; 
          border-top: 1px solid #eee; 
          color: #666; 
          font-size: 14px; 
        }
        .emoji { 
          font-size: 24px; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji">${priorityEmoji}</div>
          <h1>${title}</h1>
        </div>
        
        <div class="content">
          ${priority ? `<div class="priority-banner">${priority.toUpperCase()} PRIORITY</div>` : ''}
          
          <div class="message-body">
            <p>${body.replace(/\n/g, '<br>')}</p>
          </div>
          
          ${url ? `
            <div style="text-align: center;">
              <a href="${url}" class="button">View Details</a>
            </div>
          ` : ''}
          
          <p>If you have any questions, please contact the administration.</p>
          
          <p>Best regards,<br>
          <strong>Department of IT Administration</strong></p>
        </div>
        
        <div class="footer">
          <p>This is an automated notification from the College Management System.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
${priority ? `[${priority.toUpperCase()}] ` : ''}${title}

${body}

${url ? `View details: ${url}` : ''}

---

This is an automated notification from the College Management System.
Please do not reply to this email.
  `;

  return {
    subject,
    html,
    text
  };
}

/**
 * Save enhanced notification to history
 */
export async function saveEnhancedNotificationHistory(
  notification: EnhancedNotificationPayload,
  target: string,
  targetValue: any,
  result: SendResult,
  sentBy: string
): Promise<void> {
  try {
    await (supabaseAdmin as any)
      .from('notification_history')
      .insert({
        user_id: null,
        notification_type: target,
        title: notification.title,
        body: notification.body,
        data: {
          target,
          targetValue,
          result,
          sent_by: sentBy,
          ...notification.data
        },
        sent_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error saving enhanced notification history:', error);
  }
}