"use client";

import React from "react";
import Link from "next/link";
import ModernFineManagementV2 from "@/components/admin/ModernFineManagementV2";
import { DollarSign, ArrowLeft } from "lucide-react";

export default function FinesPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="relative">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 sm:h-4 sm:w-4 bg-amber-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 bg-clip-text text-transparent">
                  Fine Management
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 font-medium hidden sm:block">
                  Advanced Financial Control
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <button className="px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-1 sm:gap-2">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Back to Admin</span>
                  <span className="sm:hidden">Back</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3">
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <DollarSign className="h-3 w-3 sm:h-5 sm:w-5 text-white" />
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold shimmer-text">
              Class-Based Fine Management
            </h2>
          </div>
          <p className="text-slate-600 text-sm sm:text-base lg:text-lg font-medium">
            Select a class, view students, and manage their fines with bulk payment marking
          </p>
        </div>
        <ModernFineManagementV2 />
      </div>
    </div>
  );
}
