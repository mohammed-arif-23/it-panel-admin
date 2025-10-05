-- Remove fcm_tokens table (no longer needed)
-- All FCM tokens are now stored in push_subscriptions table
-- Run this in Supabase SQL Editor

-- Drop fcm_tokens table if it exists
DROP TABLE IF EXISTS fcm_tokens CASCADE;

-- Verify push_subscriptions table structure
-- Should have: subscription (nullable), fcm_token, platform, user_id
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'push_subscriptions'
ORDER BY ordinal_position;
