"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';

interface ModernPageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function ModernPageHeader({
  title,
  description,
  icon,
  showBackButton = true,
  backHref = '/',
  backLabel = 'Back',
  actions,
}: ModernPageHeaderProps) {
  return (
    <div className="sticky top-0 z-40 glass border-b border-white/20 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex items-center justify-between mb-3">
            {showBackButton && (
              <Link href={backHref}>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{backLabel}</span>
                </Button>
              </Link>
            )}
            {!showBackButton && <div />}
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  {icon}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
                {description && (
                  <p className="text-gray-600 text-sm sm:text-base mt-1">{description}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2 ml-4">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
