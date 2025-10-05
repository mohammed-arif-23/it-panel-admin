// Generate VAPID keys for push notifications
// Run with: node scripts/generate-vapid-keys.js

const webpush = require('web-push');

console.log('\n🔑 Generating VAPID Keys for Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID Keys Generated Successfully!\n');
console.log('Add these to your .env.local file:\n');
console.log('─────────────────────────────────────────────────────────────');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:your-email@example.com`);
console.log('─────────────────────────────────────────────────────────────\n');
console.log('⚠️  IMPORTANT: Keep the private key secret! Never commit it to git.\n');
