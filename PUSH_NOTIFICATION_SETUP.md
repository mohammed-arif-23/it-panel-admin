# 🔔 Push Notification Setup - Complete Guide

## ⚠️ Current Status

**The notification UI is fully functional, but actual push notifications require backend setup.**

Currently, the API returns success (200) but doesn't actually send push notifications to devices. This is intentional - the frontend is ready, but the backend integration needs to be completed.

---

## 🎯 Why Notifications Aren't Showing on Mobile

Your notifications show "200 OK" but don't appear on mobile because:

1. ❌ **No VAPID Keys** - Web push requires VAPID keys for authentication
2. ❌ **No web-push Library** - Backend needs web-push npm package
3. ❌ **No Database Integration** - Subscriptions aren't being stored/retrieved
4. ❌ **Service Worker Not Handling Push** - SW needs push event listeners

---

## 🚀 Complete Setup Guide

### Step 1: Install Dependencies

```bash
npm install web-push
```

### Step 2: Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

You'll get output like:
```
Public Key: BK6x...
Private Key: y7H...
```

### Step 3: Add to Environment Variables

Create or update `.env.local`:

```env
# VAPID Keys for Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BK6x... # Your public key
VAPID_PRIVATE_KEY=y7H... # Your private key
VAPID_SUBJECT=mailto:your-email@example.com
```

⚠️ **IMPORTANT:** The private key must stay secret!

### Step 4: Create Database Tables

Add these tables to your Supabase database:

```sql
-- Push Subscriptions Table
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES unified_students(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification History Table
CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT NOT NULL, -- 'student', 'class', 'all', 'category'
  target_value TEXT,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'scheduled'
  notification_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by UUID NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_notification_history_created_at ON notification_history(created_at DESC);
```

### Step 5: Update Service Worker

Update `public/sw.js` to handle push events:

```javascript
// Add to sw.js
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'IT Panel Notification',
        body: event.data.text()
      };
    }
  }
  
  const options = {
    body: notificationData.body || 'You have a new notification',
    icon: notificationData.icon || '/icon.svg',
    badge: '/icon.svg',
    tag: notificationData.tag || 'default',
    data: notificationData.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: notificationData.priority === 'urgent'
  };
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'IT Panel',
      options
    )
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if there's already a window open
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

### Step 6: Implement Real Push Sending

Replace the mock API with real implementation:

```typescript
// app/api/admin/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

// Configure web-push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

function checkAdminAuth(request: NextRequest) {
  const adminSession = request.cookies.get('admin-session');
  return adminSession?.value === 'authenticated';
}

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { target, targetValue, notification } = body;

    // 1. Get subscriptions based on target
    let subscriptions = [];
    
    if (target === 'all') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*');
      subscriptions = data || [];
    } else if (target === 'class') {
      const { data: students } = await supabaseAdmin
        .from('unified_students')
        .select('id')
        .eq('class_year', targetValue);
      
      const studentIds = students?.map(s => s.id) || [];
      
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .in('user_id', studentIds);
      subscriptions = data || [];
    } else if (target === 'student') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', targetValue);
      subscriptions = data || [];
    } else if (target === 'students') {
      const { data } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .in('user_id', targetValue);
      subscriptions = data || [];
    }

    // 2. Send notifications
    let successCount = 0;
    let failedCount = 0;

    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon.svg',
      tag: notification.tag,
      data: {
        url: notification.url || '/dashboard',
        ...notification.data
      }
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          pushPayload
        );
        successCount++;
      } catch (error: any) {
        failedCount++;
        console.error('Push send error:', error);
        
        // Remove invalid subscriptions (410 Gone)
        if (error.statusCode === 410) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    // 3. Save to history
    await supabaseAdmin
      .from('notification_history')
      .insert({
        title: notification.title,
        body: notification.body,
        target,
        target_value: JSON.stringify(targetValue),
        success_count: successCount,
        failed_count: failedCount,
        status: successCount > 0 ? 'sent' : 'failed',
        notification_data: notification,
        sent_by: 'admin' // TODO: Get actual admin ID
      });

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      message: `Successfully sent to ${successCount} device(s)`
    });

  } catch (error: any) {
    console.error('Notification send error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification', message: error.message },
      { status: 500 }
    );
  }
}
```

### Step 7: Update Subscription Endpoints

Update `/api/notifications/subscribe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subscription, userId } = body;

    // Upsert subscription (update if exists, insert if new)
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'endpoint'
      });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Subscription saved successfully'
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription', message: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🧪 Testing Push Notifications

### 1. Subscribe a Test Device

On a mobile device or desktop:
1. Open the app
2. Go to settings or profile
3. Add `<PushSubscriptionButton userId={studentId} />` component
4. Click "Enable Notifications"
5. Allow notifications when prompted

### 2. Send a Test Notification

1. Login as admin
2. Go to `/notifications`
3. Select "Single Student" or "All Students"
4. Fill in title and message
5. Click "Send Notification"

### 3. Check Results

- **Success:** Notification appears on device
- **Failure:** Check browser console and server logs

---

## 🐛 Troubleshooting

### Notifications Not Appearing?

**Check Browser Support:**
```javascript
if ('serviceWorker' in navigator && 'PushManager' in window) {
  console.log('Push notifications supported ✓');
} else {
  console.log('Push notifications not supported ✗');
}
```

**Check Subscription Status:**
```javascript
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
console.log('Subscription:', subscription);
```

**Check Service Worker:**
```javascript
navigator.serviceWorker.ready.then(reg => {
  console.log('Service Worker active:', reg.active);
});
```

**Common Issues:**

1. **VAPID keys not configured** - Check .env.local
2. **Service worker not registered** - Check browser DevTools > Application > Service Workers
3. **Notifications blocked** - Check browser permissions
4. **Expired subscription** - Re-subscribe
5. **Database connection error** - Check Supabase connection

### Check Server Logs

```bash
# Development
npm run dev

# Check for errors like:
# - "VAPID keys not configured"
# - "Failed to send notification"
# - "Database connection error"
```

---

## 📱 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅ Full | ✅ Full |
| Firefox | ✅ Full | ✅ Full |
| Edge    | ✅ Full | ✅ Full |
| Safari  | ⚠️ Limited | ⚠️ iOS 16.4+ |

---

## 🔐 Security Best Practices

1. ✅ Keep VAPID private key secret
2. ✅ Use HTTPS in production
3. ✅ Validate user subscriptions
4. ✅ Rate limit notification sends
5. ✅ Remove expired subscriptions
6. ✅ Log all notification activities

---

## 📊 Next Steps

1. ✅ Install web-push: `npm install web-push`
2. ✅ Generate VAPID keys
3. ✅ Add to environment variables
4. ✅ Create database tables
5. ✅ Update service worker
6. ✅ Implement real push sending
7. ✅ Test on multiple devices

---

## 📞 Need Help?

- Check browser console for errors
- Review server logs
- Test service worker in DevTools
- Verify VAPID keys are correct
- Ensure database tables exist
- Check push subscription status

---

**Once completed, notifications will actually be sent to mobile devices!** 🚀📱
