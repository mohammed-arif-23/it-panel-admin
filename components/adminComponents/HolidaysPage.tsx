"use client";

import React from "react";
import Link from "next/link";
import ModernHolidayManagement from "@/components/admin/ModernHolidayManagement";
import ModernPageHeader from "@/components/admin/ModernPageHeader";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { exportArrayToExcel } from "@/lib/exportExcel";
import BackButton from "@/components/admin/BackButton";

export default function HolidaysPage() {
  const formatDateTime = (d: string) => new Date(d).toLocaleString();
  const onExport = (rows: any[] = [], filename: string = 'holidays') => {
    exportArrayToExcel(rows, filename);
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <CalendarDays className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-rose-900 to-slate-900 bg-clip-text text-transparent">Holiday Management</h1>
                <p className="text-sm text-slate-600 font-medium">Academic Calendar Control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Admin</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
              Holiday Management Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Manage college holidays and academic breaks with comprehensive scheduling tools
          </p>
        </div>
        <ModernHolidayManagement onRefresh={() => {}} onExport={onExport} formatDateTime={formatDateTime} />
      </div>
    </div>
  );
}
