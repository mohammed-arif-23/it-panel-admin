import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with your actual VAPID public key from environment variables
    // You can generate VAPID keys using: npx web-push generate-vapid-keys
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY_HERE';

    if (publicKey === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
      console.warn('⚠️ VAPID public key not configured! Please generate VAPID keys and set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your .env file');
    }

    return NextResponse.json({ publicKey });
  } catch (error: any) {
    console.error('VAPID key fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VAPID key', message: error.message },
      { status: 500 }
    );
  }
}
