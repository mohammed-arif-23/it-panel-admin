"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { pushNotificationClient } from '@/lib/pushNotificationClient';
import { Bell, BellOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PushSubscriptionButtonProps {
  userId: string;
  className?: string;
}

export default function PushSubscriptionButton({ userId, className = '' }: PushSubscriptionButtonProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    setIsLoading(true);
    
    if (!pushNotificationClient.isSupported()) {
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    const subscribed = await pushNotificationClient.isSubscribed();
    setIsSubscribed(subscribed);
    setIsLoading(false);
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    setMessage(null);

    const result = await pushNotificationClient.subscribe(userId);

    if (result.success) {
      setIsSubscribed(true);
      setMessage({
        type: 'success',
        text: 'Successfully subscribed to push notifications!'
      });
    } else {
      setMessage({
        type: 'error',
        text: result.error || 'Failed to subscribe to notifications'
      });
    }

    setIsProcessing(false);

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUnsubscribe = async () => {
    if (!confirm('Are you sure you want to unsubscribe from push notifications?')) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const success = await pushNotificationClient.unsubscribe(userId);

    if (success) {
      setIsSubscribed(false);
      setMessage({
        type: 'success',
        text: 'Successfully unsubscribed from push notifications'
      });
    } else {
      setMessage({
        type: 'error',
        text: 'Failed to unsubscribe from notifications'
      });
    }

    setIsProcessing(false);

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const handleTestNotification = async () => {
    try {
      await pushNotificationClient.sendTestNotification();
      setMessage({
        type: 'success',
        text: 'Test notification sent!'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to send test notification'
      });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900">
              Push notifications are not supported in your browser. Please use Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          {isSubscribed 
            ? 'You are subscribed to push notifications'
            : 'Enable push notifications to receive real-time updates'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          {!isSubscribed ? (
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleTestNotification}
                variant="outline"
                className="flex-1"
              >
                <Bell className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
              <Button
                onClick={handleUnsubscribe}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unsubscribing...
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 mr-2" />
                    Disable Notifications
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {isSubscribed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-900">
              <strong>Note:</strong> You will receive notifications based on your selected preferences.
              You can manage your notification preferences in settings.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
