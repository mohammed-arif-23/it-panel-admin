"use client";

import React, { useState } from "react";
import Link from "next/link";
import ModernFineManagement from "@/components/admin/ModernFineManagement";
import FineCreationPanel from "@/components/admin/FineCreationPanel";
import ModernPageHeader from "@/components/admin/ModernPageHeader";
import { DollarSign, ArrowLeft, FileSpreadsheet } from "lucide-react";
import BackButton from "@/components/admin/BackButton";
import { ExcelExportDialog, ExcelExportField } from '@/components/admin/ExcelExportDialog';
import { useExcelExport } from '@/hooks/useExcelExport';

interface Fine {
  id: string;
  student_id: string;
  fine_type: string;
  reference_date: string;
  base_amount: number;
  payment_status: string;
  paid_amount?: number;
  created_at: string;
}

export default function FinesPage() {
  const [fines, setFines] = useState<Fine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({ class: "all", status: "all", type: "all" });

  // Excel export configuration
  const exportFields: ExcelExportField[] = [
    { key: 'student_name', label: 'Student Name', selected: true },
    { key: 'register_number', label: 'Register Number', selected: true },
    { key: 'fine_type', label: 'Fine Type', selected: true },
    { key: 'reference_date', label: 'Reference Date', selected: true, formatter: (v) => new Date(v).toLocaleDateString() },
    { key: 'base_amount', label: 'Fine Amount', selected: true, formatter: (v) => `₹${v}` },
    { key: 'payment_status', label: 'Payment Status', selected: true },
    { key: 'paid_amount', label: 'Paid Amount', selected: true, formatter: (v) => v ? `₹${v}` : '₹0' },
    { key: 'created_at', label: 'Created Date', selected: false, formatter: (v) => new Date(v).toLocaleDateString() },
  ];

  const {
    isExportDialogOpen,
    exportFields: fields,
    openExportDialog,
    closeExportDialog
  } = useExcelExport({
    data: fines,
    fields: exportFields,
    fileName: 'student_fines',
    sheetName: 'Fines'
  });

  const fetchFines = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(filters as any);
      const response = await fetch(`/api/admin/fines?${params}`);
      const data = await response.json();
      setFines(data.data?.fines || []);
    } catch (e) {
      setFines([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFine = async (fineData: any) => {
    await fetch("/api/admin/fines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_manual_fine", ...fineData }),
    });
    fetchFines();
  };

  const handleUpdateFine = async (fineId: string, status: string, amount?: number) => {
    await fetch("/api/admin/fines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_fine", fineId, paymentStatus: status, paidAmount: amount }),
    });
    fetchFines();
  };

  const exportToExcel = (data: any[], filename: string) => {
    openExportDialog();
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
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <DollarSign className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-amber-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900 bg-clip-text text-transparent">Fine Management</h1>
                <p className="text-sm text-slate-600 font-medium">Advanced Financial Control</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
              Financial Management Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Create and manage student fines with comprehensive tracking and payment processing
          </p>
        </div>
        <ModernFineManagement
          fines={fines}
          isLoading={isLoading}
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={fetchFines}
          onAddFine={handleAddFine}
          onUpdateFine={handleUpdateFine}
          onExport={() => exportToExcel(fines, "fines")}
          formatDateTime={formatDateTime}
        />
      </div>

      {/* Excel Export Dialog */}
      <ExcelExportDialog
        isOpen={isExportDialogOpen}
        onClose={closeExportDialog}
        title="Export Fines Data"
        data={fines}
        fields={fields}
        fileName="student_fines"
        sheetName="Fines"
        headerTitle="IT Department - Fine Management"
        headerSubtitle="Student Fines Export Report"
      />
    </div>
  );
}
