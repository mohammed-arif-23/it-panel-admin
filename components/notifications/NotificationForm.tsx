"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TargetSelector from './TargetSelector';
import NotificationPreview from './NotificationPreview';
import { notificationApi, NotificationPayload } from '@/lib/notificationApi';
import { Send, Loader2, CheckCircle, AlertCircle, Bell, Mail, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function NotificationForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/dashboard');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState('general');
  const [target, setTarget] = useState('all');
  const [targetValue, setTargetValue] = useState<any>(null);
  const [includePush, setIncludePush] = useState(true);
  const [includeEmail, setIncludeEmail] = useState(false);
  
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTargetChange = (newTarget: string, newTargetValue: any) => {
    setTarget(newTarget);
    setTargetValue(newTargetValue);
  };

  const validateForm = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (title.length > 50) return 'Title must be 50 characters or less';
    if (!body.trim()) return 'Message body is required';
    if (body.length > 200) return 'Message body must be 200 characters or less';
    if (!includePush && !includeEmail) return 'Please select at least one notification type';
    
    // Validate target-specific requirements
    if (target === 'student' && !targetValue) {
      return 'Please select a student';
    }
    if (target === 'students' && (!targetValue || targetValue.length === 0)) {
      return 'Please select at least one student';
    }
    if (target === 'class' && !targetValue) {
      return 'Please select a class';
    }
    if (target === 'category' && (!targetValue || !targetValue.category)) {
      return 'Please select a category';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      setResult({ type: 'error', message: error });
      return;
    }

    // Show confirmation for bulk sends
    if (target === 'all' || target === 'class') {
      setShowConfirm(true);
      return;
    }

    await sendNotification();
  };

  const sendNotification = async () => {
    setIsSending(true);
    setResult(null);
    setShowConfirm(false);

    try {
      const notification: NotificationPayload = {
        title,
        body,
        url: url || '/dashboard',
        icon: '/icons/android-launchericon.png',
        tag: category,
        data: {
          type: category,
          priority,
          category
        }
      };

      const response = await notificationApi.sendNotification({
        target: target as any,
        targetValue,
        notification,
        includePush,
        includeEmail
      });

      setResult({
        type: 'success',
        message: `Notification sent successfully! Delivered to ${response.success} student(s). ${response.failed > 0 ? `Failed: ${response.failed}` : ''}`
      });

      // Reset form on success
      setTimeout(() => {
        setTitle('');
        setBody('');
        setUrl('/dashboard');
        setPriority('medium');
        setCategory('general');
        setIncludePush(true);
        setIncludeEmail(false);
        setResult(null);
      }, 3000);

    } catch (error: any) {
      setResult({
        type: 'error',
        message: error.message || 'Failed to send notification. Please try again.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const getTargetDescription = () => {
    switch (target) {
      case 'student':
        return 'single student';
      case 'students':
        return `${targetValue?.length || 0} students`;
      case 'class':
        return `all students in ${targetValue}`;
      case 'category':
        return `students subscribed to ${targetValue?.category}`;
      case 'all':
        return 'ALL students';
      default:
        return 'unknown target';
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Push Notification</CardTitle>
                <CardDescription>
                  Compose and send push notifications to students
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Target Selection */}
                <TargetSelector onTargetChange={handleTargetChange} />

                {/* Notification Content */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="title">Notification Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Important Announcement"
                      maxLength={50}
                      className="mt-2"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        Keep it short and clear
                      </span>
                      <span className={`text-xs ${title.length > 50 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {title.length}/50
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="body">Message Body *</Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Enter your message here..."
                      maxLength={200}
                      rows={4}
                      className="mt-2"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        Be concise and actionable
                      </span>
                      <span className={`text-xs ${body.length > 200 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {body.length}/200
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low</SelectItem>
                          <SelectItem value="medium">🔵 Medium</SelectItem>
                          <SelectItem value="high">🟠 High</SelectItem>
                          <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="assignments">Assignments</SelectItem>
                          <SelectItem value="seminars">Seminars</SelectItem>
                          <SelectItem value="fines">Fines</SelectItem>
                          <SelectItem value="cod">COD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="url">Action URL (Optional)</Label>
                    <Input
                      id="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="/dashboard"
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Page to open when notification is clicked
                    </p>
                  </div>

                  {/* Notification Type Toggles */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <Label className="text-base font-medium">Notification Types</Label>
                      <p className="text-sm text-gray-500 mb-4">Choose how to deliver this notification</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">Push Notification</span>
                          </div>
                          <Switch
                            checked={includePush}
                            onCheckedChange={setIncludePush}
                          />
                        </div>
                        <p className="text-xs text-blue-700">
                          {includePush ? 'Will send browser/app notifications' : 'Push notifications disabled'}
                        </p>
                      </div>
                      
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">Email</span>
                          </div>
                          <Switch
                            checked={includeEmail}
                            onCheckedChange={setIncludeEmail}
                          />
                        </div>
                        <p className="text-xs text-purple-700">
                          {includeEmail ? 'Will send email notifications' : 'Email notifications disabled'}
                        </p>
                      </div>
                    </div>
                    
                    {!includePush && !includeEmail && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-800">Please select at least one notification type</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Result Message */}
                {result && (
                  <Alert className={result.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                    {result.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription className={result.type === 'success' ? 'text-green-900' : 'text-red-900'}>
                      {result.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSending}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Send Notification
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <NotificationPreview
                title={title}
                body={body}
              />
            </div>
          </div>
        </div>
      </form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send this notification to <strong>{getTargetDescription()}</strong>.
              This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={sendNotification}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Yes, Send Notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
