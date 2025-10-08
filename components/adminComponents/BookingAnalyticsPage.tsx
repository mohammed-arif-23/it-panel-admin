"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ModernBookingAnalytics from "@/components/admin/ModernBookingAnalytics";
import { Calendar, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";
import { ExcelExportDialog, ExcelExportField } from '@/components/admin/ExcelExportDialog';
import { useExcelExport } from '@/hooks/useExcelExport';

export default function BookingAnalyticsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  
  // Excel export configuration
  const exportFields: ExcelExportField[] = [
    { key: 'student_name', label: 'Student Name', selected: true },
    { key: 'register_number', label: 'Register Number', selected: true },
    { key: 'seminar_title', label: 'Seminar Title', selected: true },
    { key: 'booking_date', label: 'Booking Date', selected: true, formatter: (v) => new Date(v).toLocaleDateString() },
    { key: 'seminar_date', label: 'Seminar Date', selected: true, formatter: (v) => new Date(v).toLocaleDateString() },
    { key: 'status', label: 'Status', selected: true },
    { key: 'class_year', label: 'Class/Year', selected: true },
    { key: 'created_at', label: 'Created Date', selected: false, formatter: (v) => new Date(v).toLocaleDateString() },
  ];

  const {
    isExportDialogOpen,
    exportFields: fields,
    openExportDialog,
    closeExportDialog
  } = useExcelExport({
    data: bookings,
    fields: exportFields,
    fileName: 'seminar_bookings',
    sheetName: 'Bookings'
  });

  const formatDateTime = (d: string) => new Date(d).toLocaleString();
  const onExport = (data: any[], filename: string) => {
    setBookings(data);
    openExportDialog();
  };

  const fetchBookings = async () => {};

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition"
    >
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="relative"
              >
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse"></div>
              </motion.div>
              <div className="leading-tight">
                <motion.h1 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent"
                >
                  Booking Analytics
                </motion.h1>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-sm text-slate-600 font-medium"
                >
                  Advanced Seminar Management
                </motion.p>
              </div>
            </div>
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Admin</span>
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="mb-10"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text bg-gradient-to-r from-slate-800 via-indigo-700 to-slate-800 bg-clip-text text-transparent">
              Booking Analytics Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            View and analyze seminar bookings with comprehensive insights and performance metrics
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <ModernBookingAnalytics
            isLoading={false}
            onRefresh={fetchBookings}
            onExport={onExport}
            formatDateTime={formatDateTime}
          />
        </motion.div>
      </div>

      {/* Excel Export Dialog */}
      <ExcelExportDialog
        isOpen={isExportDialogOpen}
        onClose={closeExportDialog}
        title="Export Bookings Data"
        data={bookings}
        fields={fields}
        fileName="seminar_bookings"
        sheetName="Bookings"
        headerTitle="IT Department - Seminar Management"
        headerSubtitle="Seminar Bookings Export Report"
      />
    </motion.div>
  );
}