"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ModernAssignmentManagement from "@/components/admin/ModernAssignmentManagement";
import { BookOpen, ArrowLeft, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";
import { ExcelExportDialog, ExcelExportField } from '@/components/admin/ExcelExportDialog';
import { useExcelExport } from '@/hooks/useExcelExport';
import { Button } from '@/components/ui/button';

interface Assignment {
  id: string;
  title: string;
  description: string;
  class_year: string;
  due_date: string;
  created_at: string;
  submission_count?: number;
  graded_count?: number;
  average_marks?: number;
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Excel export configuration for assignment submissions
  const exportFields: ExcelExportField[] = [
    { key: 'register_number', label: 'Register Number', selected: true },
    { key: 'name', label: 'Student Name', selected: true },
    { key: 'email', label: 'Email', selected: true },
    { key: 'class_year', label: 'Class/Year', selected: true },
    { key: 'assignment_title', label: 'Assignment Title', selected: true },
    { key: 'status', label: 'Status', selected: true },
    { key: 'submitted_at', label: 'Submitted At', selected: true, formatter: (v) => v !== '-' ? new Date(v).toLocaleString() : '-' },
    { key: 'marks', label: 'Marks', selected: true },
    { key: 'due_date', label: 'Due Date', selected: false, formatter: (v) => v !== '-' ? new Date(v).toLocaleString() : '-' },
  ];

  const [submissionData, setSubmissionData] = useState<any[]>([]);

  const {
    isExportDialogOpen,
    exportFields: fields,
    openExportDialog,
    closeExportDialog
  } = useExcelExport({
    data: submissionData,
    fields: exportFields,
    fileName: 'assignment_submissions',
    sheetName: 'Submissions'
  });

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/assignments");
      if (response.ok) {
        const result = await response.json();
        // API returns { success: true, data: [...] } format
        setAssignments(result.data || []);
      } else {
        console.error("Failed to fetch assignments:", response.status);
        setAssignments([]);
      }
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSubmissions = (exportData: any[]) => {
    setSubmissionData(exportData);
    openExportDialog();
  };

  const handleAddAssignment = async (assignment: any) => {
    const response = await fetch("/api/admin/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assignment),
    });
    if (response.ok) fetchAssignments();
  };

  const handleUpdateAssignment = async (id: string, assignment: any) => {
    const response = await fetch("/api/admin/assignments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...assignment }),
    });
    if (response.ok) fetchAssignments();
  };

  const handleDeleteAssignment = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete assignment "${title}"?`)) {
      const response = await fetch(`/api/admin/assignments?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) fetchAssignments();
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    openExportDialog();
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

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
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
              </motion.div>
              <div className="leading-tight">
                <motion.h1 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 bg-clip-text text-transparent"
                >
                  Assignment Hub
                </motion.h1>
                <motion.p 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="text-sm text-slate-600 font-medium"
                >
                  Advanced Assignment Management
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
                <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2">
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text bg-gradient-to-r from-slate-800 via-emerald-700 to-slate-800 bg-clip-text text-transparent">
              Assignment Management Center
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Create, manage, and track student assignments with advanced analytics and grading tools
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <ModernAssignmentManagement
            assignments={assignments}
            isLoading={isLoading}
            onRefresh={fetchAssignments}
            onAddAssignment={handleAddAssignment}
            onUpdateAssignment={handleUpdateAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            formatDateTime={formatDateTime}
            onExport={handleExportSubmissions}
          />
        </motion.div>
      </div>

      {/* Excel Export Dialog */}
      <ExcelExportDialog
        isOpen={isExportDialogOpen}
        onClose={closeExportDialog}
        title="Export Assignment Submissions"
        data={submissionData}
        fields={fields}
        fileName="assignment_submissions"
        sheetName="Submissions"
        headerTitle="IT Department - Assignment Management"
        headerSubtitle="Assignment Submissions Export Report"
      />
    </motion.div>
  );
}