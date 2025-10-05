"use client";

import React from "react";
import Link from "next/link";
import ModernStudentTableManagement from "@/components/admin/ModernStudentTableManagement";
import { exportArrayToExcel } from "@/lib/exportExcel";
import ModernPageHeader from "@/components/admin/ModernPageHeader";
import { Database, ArrowLeft } from "lucide-react";

export default function DatabasePage() {
  const onExport = (rows: any[], filename: string) => {
    exportArrayToExcel(rows, filename);
  };
  const formatDateTime = (d: string) => new Date(d).toLocaleString();
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <Database className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-cyan-900 to-slate-900 bg-clip-text text-transparent">Database Management</h1>
                <p className="text-sm text-slate-600 font-medium">Advanced Student Data Control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
              Student Database Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Comprehensive student data management with advanced filtering and analytics capabilities
          </p>
        </div>
        <ModernStudentTableManagement onExport={onExport} formatDateTime={formatDateTime} />
      </div>
    </div>
  );
}


