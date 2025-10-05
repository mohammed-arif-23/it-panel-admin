"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { notificationTemplates, NotificationTemplate } from '@/lib/notificationApi';
import { Zap } from 'lucide-react';

interface QuickTemplatesProps {
  onSelectTemplate: (template: NotificationTemplate) => void;
}

export default function QuickTemplates({ onSelectTemplate }: QuickTemplatesProps) {
  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
    };
    return colorMap[color] || colorMap.blue;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: '🟢 Low',
      medium: '🔵 Medium',
      high: '🟠 High',
      urgent: '🔴 Urgent'
    };
    return badges[priority] || badges.medium;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <div>
            <CardTitle>Quick Templates</CardTitle>
            <CardDescription>
              Pre-made notification templates for common scenarios
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notificationTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400"
              onClick={() => onSelectTemplate(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getColorClasses(template.color)} flex items-center justify-center text-white text-xl flex-shrink-0`}>
                    {template.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                      {template.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {template.body}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full">
                        {template.category}
                      </span>
                      <span className="text-xs">
                        {getPriorityBadge(template.priority)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template);
                  }}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
