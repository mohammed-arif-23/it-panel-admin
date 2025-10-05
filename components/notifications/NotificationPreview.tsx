"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

interface NotificationPreviewProps {
  title: string;
  body: string;
  icon?: string;
  appName?: string;
}

export default function NotificationPreview({
  title,
  body,
  icon = '/icons/android-launchericon.png',
  appName = 'IT Panel'
}: NotificationPreviewProps) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-600" />
          Notification Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
          {/* Browser-style notification */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Bell className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-500">{appName}</span>
                <span className="text-xs text-gray-400">now</span>
              </div>
              <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">
                {title || 'Notification Title'}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-2">
                {body || 'Your notification message will appear here...'}
              </p>
            </div>
          </div>
          
          {/* Mobile-style notification */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Mobile Preview:</p>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 text-white">
              <div className="flex items-start gap-2">
                <Bell className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs mb-0.5 line-clamp-1">
                    {title || 'Notification Title'}
                  </p>
                  <p className="text-xs opacity-90 line-clamp-2">
                    {body || 'Your notification message will appear here...'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Character counts */}
        <div className="mt-3 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Title length:</span>
            <span className={title.length > 50 ? 'text-red-600 font-semibold' : ''}>
              {title.length}/50 characters
            </span>
          </div>
          <div className="flex justify-between">
            <span>Body length:</span>
            <span className={body.length > 200 ? 'text-red-600 font-semibold' : ''}>
              {body.length}/200 characters
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
