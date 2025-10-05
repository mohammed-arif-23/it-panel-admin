// Client-side FCM token management
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export interface FCMTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export class FCMClient {
  private static instance: FCMClient;
  private messaging: any = null;
  
  private constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.messaging = getMessaging(app);
      } catch (error) {
        console.error('FCM initialization error:', error);
      }
    }
  }

  static getInstance(): FCMClient {
    if (!FCMClient.instance) {
      FCMClient.instance = new FCMClient();
    }
    return FCMClient.instance;
  }

  /**
   * Check if FCM is supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'serviceWorker' in navigator && 
           'PushManager' in window &&
           this.messaging !== null;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined') return 'default';
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * Get FCM registration token
   */
  async getRegistrationToken(): Promise<FCMTokenResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'FCM not supported in this browser'
      };
    }

    try {
      // Check permission first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return {
          success: false,
          error: 'Notification permission denied'
        };
      }

      // Get registration token
      const token = await getToken(this.messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });

      if (token) {
        return {
          success: true,
          token
        };
      } else {
        return {
          success: false,
          error: 'No registration token available'
        };
      }
    } catch (error: any) {
      console.error('FCM token error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get FCM token'
      };
    }
  }

  /**
   * Subscribe to FCM notifications
   */
  async subscribe(userId: string): Promise<FCMTokenResult> {
    try {
      const tokenResult = await this.getRegistrationToken();
      
      if (!tokenResult.success || !tokenResult.token) {
        return tokenResult;
      }

      // Save token to server
      const response = await fetch('/api/fcm/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          token: tokenResult.token,
          deviceType: this.getDeviceType()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save FCM token');
      }

      // Store token locally for reference
      localStorage.setItem('fcm_token', tokenResult.token);
      localStorage.setItem('fcm_user_id', userId);

      return tokenResult;
    } catch (error: any) {
      console.error('FCM subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to subscribe to notifications'
      };
    }
  }

  /**
   * Unsubscribe from FCM notifications
   */
  async unsubscribe(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = localStorage.getItem('fcm_token');
      const userId = localStorage.getItem('fcm_user_id');

      if (!token || !userId) {
        return { success: true }; // Already unsubscribed
      }

      // Delete token from Firebase
      if (this.messaging) {
        await deleteToken(this.messaging);
      }

      // Remove token from server
      const response = await fetch('/api/fcm/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          token
        })
      });

      if (!response.ok) {
        console.warn('Failed to remove FCM token from server');
      }

      // Clear local storage
      localStorage.removeItem('fcm_token');
      localStorage.removeItem('fcm_user_id');

      return { success: true };
    } catch (error: any) {
      console.error('FCM unsubscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to unsubscribe from notifications'
      };
    }
  }

  /**
   * Set up foreground message listener
   */
  onMessage(callback: (payload: any) => void): () => void {
    if (!this.messaging) {
      return () => {};
    }

    const unsubscribe = onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      callback(payload);
    });

    return unsubscribe;
  }

  /**
   * Get current FCM token if available
   */
  getCurrentToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('fcm_token');
  }

  /**
   * Check if user is subscribed
   */
  isSubscribed(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('fcm_token');
  }

  /**
   * Get device type for analytics
   */
  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile';
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Refresh FCM token (useful for token rotation)
   */
  async refreshToken(userId: string): Promise<FCMTokenResult> {
    try {
      // First unsubscribe
      await this.unsubscribe();
      
      // Then subscribe again to get new token
      return await this.subscribe(userId);
    } catch (error: any) {
      console.error('FCM token refresh error:', error);
      return {
        success: false,
        error: error.message || 'Failed to refresh FCM token'
      };
    }
  }
}
