"use client";

import React, { useState } from "react";
import Link from "next/link";
import ModernFineStudentManagement from "@/components/admin/ModernFineStudentManagement";
import ModernPageHeader from "@/components/admin/ModernPageHeader";
import { DollarSign, ArrowLeft, Users, FileSpreadsheet } from "lucide-react";
import { ExcelExportDialog, ExcelExportField } from '@/components/admin/ExcelExportDialog';
import { useExcelExport } from '@/hooks/useExcelExport';

export default function FineStudentsPage() {
  const [studentsData, setStudentsData] = useState<any[]>([]);
  
  // Excel export configuration
  const exportFields: ExcelExportField[] = [
    { key: 'name', label: 'Student Name', selected: true },
    { key: 'register_number', label: 'Register Number', selected: true },
    { key: 'email', label: 'Email', selected: true },
    { key: 'class_year', label: 'Class/Year', selected: true },
    { key: 'total_fines', label: 'Total Fines', selected: true, formatter: (v) => `₹${v}` },
    { key: 'paid_amount', label: 'Paid Amount', selected: true, formatter: (v) => `₹${v}` },
    { key: 'pending_amount', label: 'Pending Amount', selected: true, formatter: (v) => `₹${v}` },
    { key: 'fine_count', label: 'Number of Fines', selected: true },
    { key: 'last_payment_date', label: 'Last Payment', selected: false, formatter: (v) => v ? new Date(v).toLocaleDateString() : 'No Payment' },
  ];

  const {
    isExportDialogOpen,
    exportFields: fields,
    openExportDialog,
    closeExportDialog
  } = useExcelExport({
    data: studentsData,
    fields: exportFields,
    fileName: 'fine_students',
    sheetName: 'Fine Students'
  });

  const onExport = (data: any[]) => {
    setStudentsData(data);
    openExportDialog();
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 bg-clip-text text-transparent">Student Management</h1>
                <p className="text-sm text-slate-600 font-medium">Advanced Student Records</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
              Student Management Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Comprehensive student records and fine management with advanced analytics
          </p>
        </div>
        <ModernFineStudentManagement />
      </div>

      {/* Excel Export Dialog */}
      <ExcelExportDialog
        isOpen={isExportDialogOpen}
        onClose={closeExportDialog}
        title="Export Fine Students Data"
        data={studentsData}
        fields={fields}
        fileName="fine_students"
        sheetName="Fine Students"
        headerTitle="IT Department - Fine Management"
        headerSubtitle="Student Fine Records Export Report"
      />
    </div>
  );
}
