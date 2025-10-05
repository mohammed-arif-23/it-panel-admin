import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AutomatedNotificationRule {
  id: string;
  trigger: string;
  enabled: boolean;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  targetClass?: string;
}

const defaultRules: AutomatedNotificationRule[] = [
  {
    id: 'assignment-posted',
    trigger: 'assignment_created',
    enabled: true,
    message: 'New assignment "{title}" has been posted for {class}. Due date: {due_date}',
    priority: 'high'
  },
  {
    id: 'seminar-booking-open',
    trigger: 'seminar_booking_open',
    enabled: true,
    message: 'Seminar booking is now open! Book your slot before {deadline}',
    priority: 'medium'
  },
  {
    id: 'seminar-booking-closed',
    trigger: 'seminar_booking_closed',
    enabled: true,
    message: 'Seminar booking window has closed. Selection will happen at {selection_time}',
    priority: 'medium'
  },
  {
    id: 'student-selected',
    trigger: 'student_selected',
    enabled: true,
    targetClass: 'match_student_class',
    message: '{student_name} from {class} has been selected for seminar on {date}',
    priority: 'high'
  },
  {
    id: 'new-notice',
    trigger: 'notice_published',
    enabled: true,
    message: 'New {priority} notice: {title}. Check the notice board for details.',
    priority: 'medium'
  }
];

async function sendAutomatedNotification(
  trigger: string,
  data: any,
  rules: AutomatedNotificationRule[]
) {
  const rule = rules.find(r => r.trigger === trigger && r.enabled);
  if (!rule) return;

  let message = rule.message;
  let targetClass = 'all';

  // Replace placeholders in message
  Object.keys(data).forEach(key => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), data[key]);
  });

  // Determine target class
  if (rule.targetClass === 'match_student_class' && data.class) {
    targetClass = data.class;
  } else if (data.targetClass) {
    targetClass = data.targetClass;
  }

  // Send notification
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ADMIN_API_TOKEN}` // Internal API token
      },
      body: JSON.stringify({
        target: targetClass === 'all' ? 'all' : 'class',
        targetValue: targetClass === 'all' ? null : targetClass,
        notification: {
          title: getNotificationTitle(trigger, data),
          body: message,
          url: getNotificationUrl(trigger, data),
          data: {
            type: trigger,
            priority: rule.priority,
            category: 'automated'
          }
        }
      })
    });

    if (response.ok) {
      console.log(`Automated notification sent for ${trigger}:`, message);
    }
  } catch (error) {
    console.error(`Failed to send automated notification for ${trigger}:`, error);
  }
}

function getNotificationTitle(trigger: string, data: any): string {
  switch (trigger) {
    case 'assignment_created':
      return 'New Assignment Posted';
    case 'seminar_booking_open':
      return 'Seminar Booking Open';
    case 'seminar_booking_closed':
      return 'Seminar Booking Closed';
    case 'student_selected':
      return 'Student Selected for Seminar';
    case 'notice_published':
      return 'New Notice Published';
    default:
      return 'Notification';
  }
}

function getNotificationUrl(trigger: string, data: any): string {
  switch (trigger) {
    case 'assignment_created':
      return '/assignments';
    case 'seminar_booking_open':
    case 'seminar_booking_closed':
    case 'student_selected':
      return '/seminar';
    case 'notice_published':
      return '/notice';
    default:
      return '/dashboard';
  }
}

// Webhook endpoint for automated notifications
export async function POST(request: NextRequest) {
  try {
    const { trigger, data } = await request.json();

    if (!trigger) {
      return NextResponse.json({ error: 'Trigger is required' }, { status: 400 });
    }

    // Get notification rules from database or use defaults
    let rules = defaultRules;
    try {
      const { data: dbRules } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('enabled', true);
      
      if (dbRules && dbRules.length > 0) {
        rules = dbRules;
      }
    } catch (error) {
      console.log('Using default notification rules');
    }

    await sendAutomatedNotification(trigger, data, rules);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Automated notification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Cron job endpoint for daily notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Check for assignments due today
    const { data: assignments } = await supabase
      .from('assignments')
      .select('*')
      .gte('due_date', todayStr)
      .lt('due_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (assignments && assignments.length > 0) {
      for (const assignment of assignments) {
        await sendAutomatedNotification('assignment_reminder', {
          title: assignment.title,
          class: assignment.class_year,
          due_date: new Date(assignment.due_date).toLocaleDateString()
        }, defaultRules);
      }
    }

    // Check for seminar booking windows
    const bookingConfig = {
      openTime: '09:00',
      closeTime: '17:00',
      selectionTime: '18:00'
    };

    const currentTime = today.toTimeString().slice(0, 5);
    
    if (currentTime === bookingConfig.openTime) {
      await sendAutomatedNotification('seminar_booking_open', {
        deadline: bookingConfig.closeTime,
        selection_time: bookingConfig.selectionTime
      }, defaultRules);
    }

    if (currentTime === bookingConfig.closeTime) {
      await sendAutomatedNotification('seminar_booking_closed', {
        selection_time: bookingConfig.selectionTime
      }, defaultRules);
    }

    // Check for new notices published today
    const { data: notices } = await supabase
      .from('notices')
      .select('*')
      .gte('published_at', todayStr)
      .eq('is_published', true);

    if (notices && notices.length > 0) {
      for (const notice of notices) {
        await sendAutomatedNotification('notice_published', {
          title: notice.title,
          priority: notice.priority,
          target_audience: notice.target_audience
        }, defaultRules);
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: {
        assignments: assignments?.length || 0,
        notices: notices?.length || 0,
        time_checks: ['booking_open', 'booking_closed']
      }
    });
  } catch (error) {
    console.error('Daily notification cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
