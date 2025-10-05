-- Push Notification System Database Tables
-- Created: 2025-10-01

-- Push Subscriptions Table
-- Stores browser push notification subscriptions for users
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES unified_students(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification History Table
-- Stores history of all sent notifications for tracking and analytics
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('student', 'students', 'class', 'all', 'category')),
  target_value TEXT,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'scheduled')),
  notification_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_by TEXT NOT NULL
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_notification_history_created_at ON notification_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_history_target ON notification_history(target);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);

-- Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
-- Students can only view and manage their own subscriptions
CREATE POLICY "Students can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update their own subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Students can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_history
-- Only admins can view notification history
CREATE POLICY "Only service role can access notification history"
  ON notification_history FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the timestamp update function
CREATE TRIGGER update_push_subscription_timestamp
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_timestamp();

-- Comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores browser push notification subscriptions for students';
COMMENT ON TABLE notification_history IS 'Stores history of all sent push notifications for tracking and analytics';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Unique push notification endpoint URL from browser';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret for encryption';
COMMENT ON COLUMN notification_history.target IS 'Type of recipient: student, students, class, all, or category';
COMMENT ON COLUMN notification_history.target_value IS 'Specific target value (e.g., class name, student IDs)';
COMMENT ON COLUMN notification_history.notification_data IS 'Full notification payload as JSON';
