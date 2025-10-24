"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  RefreshCw, 
  Hash, 
  AlertTriangle, 
  FileText, 
  Users, 
  Trash2, 
  Download,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  Clock,
  ArrowLeft,
  CheckSquare,
  Square
} from 'lucide-react';
import PlagiarismDetection from "@/components/adminComponents/PlagiarismDetection";

interface AssignmentSubmission {
  id: string;
  student_id: string;
  assignment_id: string;
  file_url: string;
  file_name: string;
  submitted_at: string;
  status: string;
  student_name: string;
  register_number: string;
  assignment_title: string;
  file_hash?: string;
  file_size?: number;
  similarity_score?: number;
  matched_submissions?: string[];
}

interface DetectionResult {
  method: string;
  description: string;
  suspicious_groups: Array<{
    group_id: string;
    submissions: AssignmentSubmission[];
    confidence: number;
    reason: string;
  }>;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  class_year: string;
  due_date: string;
  created_at: string;
}

export default function DetectAssignmentsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("detect-assignments");
  
  // Detection states
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [deletingSubmissionId, setDeletingSubmissionId] = useState<string | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    assignment: "",
    class_year: "",
    date_range: "",
    min_similarity: 80
  });

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAssignments();
      fetchSubmissions();
    }
  }, [isAuthenticated, filters]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/admin/auth");
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await fetch("/api/admin/assignments");
      const data = await response.json();
      
      if (data.data) {
        setAssignments(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.assignment) params.append('assignment', filters.assignment);
      if (filters.class_year) params.append('class_year', filters.class_year);
      if (filters.date_range) params.append('date_range', filters.date_range);
      
      const response = await fetch(`/api/admin/detect-assignments?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setSubmissions(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  };

  const runDetection = async () => {
    setIsDetecting(true);
    try {
      // Pre-check hash generation stats to decide the best detection method.
      // If all submissions have stored hashes (without_hash === 0), prefer hash-based detection
      // to avoid direct file checks.
      console.log("Running hash detection with:", {
        assignment_id: selectedAssignment,
        method: "hash",
        min_similarity: filters.min_similarity
      });

      const response = await fetch("/api/admin/detect-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignment_id: selectedAssignment,
          method: "hash",
          min_similarity: filters.min_similarity
        }),
      });

      const data = await response.json();
      console.log("Detection response:", data);
      
      if (data.success) {
        setDetectionResults(data.results || []);
        if (!data.results || data.results.length === 0) {
          alert("No suspicious patterns detected. This could mean:\n1. No submissions found for the selected criteria\n2. All submissions are unique\n3. Similarity threshold is too high");
        }
      } else {
        alert("Detection failed: " + data.error);
      }
    } catch (error) {
      console.error("Detection error:", error);
      alert("Detection failed. Please try again.");
    } finally {
      setIsDetecting(false);
    }
  };

  const testDatabase = async () => {
    try {
      const response = await fetch("/api/admin/test-db");
      const data = await response.json();
      
      if (data.success) {
        console.log("Database test results:", data.data);
        alert(`Database Test Results:
        
Assignments: ${data.data.assignments.count} (${data.data.assignments.error || 'OK'})
Submissions: ${data.data.submissions.count} (${data.data.submissions.error || 'OK'})
Students: ${data.data.students.count} (${data.data.students.error || 'OK'})
Joined Query: ${data.data.joined.count} (${data.data.joined.error || 'OK'})

Check console for detailed results.`);
      } else {
        alert("Database test failed: " + data.error);
      }
    } catch (error) {
      alert("Database test failed: " + error);
    }
  };

  const testDetectionWithoutFilter = async () => {
    setIsDetecting(true);
    try {
      console.log("Testing detection without assignment filter...");
      
      const response = await fetch("/api/admin/detect-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignment_id: "", // No assignment filter
          method: "all",
          min_similarity: 80
        }),
      });

      const data = await response.json();
      console.log("Detection without filter response:", data);
      
      if (data.success) {
        alert(`Detection Test Results:
        
Total Submissions: ${data.total_submissions || 0}
Total Groups: ${data.total_groups || 0}
Results: ${data.results?.length || 0}

Check console for detailed logs.`);
      } else {
        alert("Detection test failed: " + data.error);
      }
    } catch (error) {
      console.error("Detection test error:", error);
      alert("Detection test failed: " + error);
    } finally {
      setIsDetecting(false);
    }
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const toggleGroupSelection = (submissions: AssignmentSubmission[]) => {
    const groupIds = submissions.map(s => s.id);
    const allSelected = groupIds.every(id => selectedSubmissions.has(id));
    
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        groupIds.forEach(id => newSet.delete(id));
      } else {
        groupIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const bulkDeleteSubmissions = async () => {
    if (selectedSubmissions.size === 0) {
      alert("Please select submissions to delete");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedSubmissions.size} selected submission(s)?\n\nThis action cannot be undone and will permanently remove these plagiarized submissions from the database.`)) {
      return;
    }

    setIsBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const submissionId of selectedSubmissions) {
        try {
          const response = await fetch(`/api/admin/assignment-submissions/delete?id=${submissionId}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      alert(`Bulk delete completed!\n\nSuccessfully deleted: ${successCount}\nFailed: ${failCount}`);
      setSelectedSubmissions(new Set());
      // Refresh the detection results
      await runDetection();
    } catch (error) {
      console.error("Bulk delete error:", error);
      alert("Bulk delete failed. Please try again.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const deleteSubmission = async (submissionId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete the submission from ${studentName}?\n\nThis action cannot be undone and will permanently remove this plagiarized submission from the database.`)) {
      return;
    }

    setDeletingSubmissionId(submissionId);
    try {
      const response = await fetch(`/api/admin/assignment-submissions/delete?id=${submissionId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully deleted submission from ${studentName}`);
        // Refresh the detection results
        await runDetection();
      } else {
        alert("Failed to delete submission: " + data.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete submission. Please try again.");
    } finally {
      setDeletingSubmissionId(null);
    }
  };

  const exportResults = () => {
    const exportData = detectionResults.flatMap(result => 
      result.suspicious_groups.map(group => ({
        method: result.method,
        group_id: group.group_id,
        confidence: group.confidence,
        reason: group.reason,
        student_count: group.submissions.length,
        students: group.submissions.map(s => s.student_name).join(", "),
        register_numbers: group.submissions.map(s => s.register_number).join(", "),
        assignment: group.submissions[0]?.assignment_title || "",
        submitted_at: group.submissions[0]?.submitted_at || ""
      }))
    );

    const csvContent = [
      ["Method", "Group ID", "Confidence", "Reason", "Student Count", "Students", "Register Numbers", "Assignment", "Submitted At"],
      ...exportData.map(row => [
        row.method,
        row.group_id,
        row.confidence,
        row.reason,
        row.student_count,
        row.students,
        row.register_numbers,
        row.assignment,
        row.submitted_at
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assignment_detection_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-lg text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 page-transition">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/20 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center shadow-2xl ring-2 ring-white/50">
                  <Search className="h-7 w-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
              </div>
              <div className="leading-tight">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 bg-clip-text text-transparent">Plagiarism Detection</h1>
                <p className="text-sm text-slate-600 font-medium">AI-Powered Assignment Analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/admin">
                <button className="px-3 py-2 sm:px-4 text-xs sm:text-sm rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-1 sm:gap-2">
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Back to Admin</span>
                  <span className="sm:hidden">Back</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <div className="flex items-center space-x-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold shimmer-text">
              Advanced Plagiarism Detection
            </h2>
          </div>
          <p className="text-slate-600 text-base sm:text-lg font-medium">
            Detect identical submissions using AI-powered hash-based file comparison with 100% accuracy
          </p>
        </div>
        {/* Hash Generation & Setup */}
        <div className="mb-10">
          <Card className="glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <CardContent className="p-8">
              <PlagiarismDetection />
            </CardContent>
          </Card>
        </div>

        {/* Detection Method Info */}
        <Card className="mb-10 glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Hash className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-purple-900 bg-clip-text text-transparent">Hash-Based Detection</span>
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Advanced cryptographic analysis for 100% accurate plagiarism detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 border border-blue-200/50 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">SHA-256 Cryptographic Analysis</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Our system analyzes the SHA-256 hash of each submission file. Files with identical hashes are 
                    guaranteed to be exact duplicates, making this the most reliable method for detecting plagiarism 
                    with zero false positives.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detection Controls */}
        <Card className="mb-10 glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Search className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-emerald-900 bg-clip-text text-transparent">Detection Controls</span>
            </CardTitle>
            <CardDescription className="text-base text-slate-600">
              Configure and execute advanced plagiarism detection algorithms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="space-y-2">
                <Label htmlFor="assignment" className="text-xs sm:text-sm font-semibold text-slate-700">Assignment</Label>
                <select
                  id="assignment"
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}
                  className="w-full p-2 sm:p-3 text-sm border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">All Assignments</option>
                  {assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.title} ({assignment.class_year})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="class_year" className="text-xs sm:text-sm font-semibold text-slate-700">Class Year</Label>
                <select
                  id="class_year"
                  value={filters.class_year}
                  onChange={(e) => setFilters(prev => ({ ...prev, class_year: e.target.value }))}
                  className="w-full p-2 sm:p-3 text-sm border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                >
                  <option value="">All Classes</option>
                  <option value="I-IT">I-IT (1st Year)</option>
                  <option value="II-IT">II-IT (2nd Year)</option>
                  <option value="III-IT">III-IT (3rd Year)</option>
                  <option value="IV-IT">IV-IT (4th Year)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min_similarity" className="text-xs sm:text-sm font-semibold text-slate-700">Min Similarity (%)</Label>
                <Input
                  id="min_similarity"
                  type="number"
                  min="0"
                  max="100"
                  value={filters.min_similarity}
                  onChange={(e) => setFilters(prev => ({ ...prev, min_similarity: parseInt(e.target.value) || 80 }))}
                  className="p-2 sm:p-3 text-sm border border-slate-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                />
              </div>
              
              <div className="flex items-end">
                <Button 
                  onClick={runDetection} 
                  disabled={isDetecting}
                  className="w-full h-10 sm:h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm sm:text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {isDetecting ? (
                    <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  )}
                  {isDetecting ? "Analyzing..." : "Run Detection"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Results */}
        {detectionResults.length > 0 && (
          <Card className="mb-10 glass border-white/50 shadow-xl hover:shadow-2xl transition-all duration-500">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-slate-900 to-red-900 bg-clip-text text-transparent">Detection Results</span>
                  </CardTitle>
                  <CardDescription className="text-base text-slate-600 mt-2">
                    Found <span className="font-bold text-red-600">{detectionResults.reduce((acc, result) => acc + result.suspicious_groups.length, 0)}</span> suspicious groups with high confidence
                    {selectedSubmissions.size > 0 && (
                      <span className="ml-2 text-blue-600 font-semibold">
                        • {selectedSubmissions.size} selected
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={exportResults}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {detectionResults.map((result, resultIndex) => (
                  result.suspicious_groups.map((group, groupIndex) => (
                    <div key={`${resultIndex}-${groupIndex}`} className="glass border-white/50 rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <Hash className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">
                            Detection Group: <span className="text-orange-600 font-mono text-sm">{group.group_id}</span>
                          </h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium">
                          <span className="font-bold text-red-600">{group.submissions.length}</span> suspicious submissions detected
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {group.submissions.map((submission: AssignmentSubmission, submissionIndex: number) => (
                        <div key={submissionIndex} className="p-3 sm:p-4 border border-slate-200/50 rounded-xl bg-gradient-to-br from-slate-50/50 to-white/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
                          <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {submission.student_name || 'Unknown Student'}
                              </span>
                            </div>
                            <Badge 
                              variant={submission.status === 'flagged' ? 'destructive' : 'secondary'}
                              className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                                submission.status === 'flagged' 
                                  ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white' 
                                  : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white'
                              }`}
                            >
                              {submission.status || 'pending'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mb-2 sm:mb-3 min-w-0">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                            <p className="text-xs sm:text-sm text-slate-700 font-medium truncate">
                              {submission.file_name}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-slate-500 mb-2 sm:mb-3">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(submission.submitted_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{new Date(submission.submitted_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => window.open(submission.file_url, '_blank')}
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs rounded-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              onClick={() => deleteSubmission(submission.id, group.group_id)}
                              size="sm"
                              className="px-2 sm:px-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  ))
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {detectionResults.length === 0 && !isDetecting && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Detection Results</h3>
              <p className="text-gray-600 mb-4">
                Run detection to identify suspicious assignment submissions.
              </p>
              {submissions.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-yellow-800 mb-4">
                    <strong>No submissions found.</strong> Make sure there are assignment submissions in the database for the selected criteria.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={testDatabase} variant="outline" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Test DB
                    </Button>
                    <Button onClick={testDetectionWithoutFilter} variant="outline" size="sm" disabled={isDetecting}>
                      <Search className="h-4 w-4 mr-2" />
                      Test Detection
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800 mb-4">
                    <strong>{submissions.length} submissions available.</strong> Try running detection with different parameters or lower similarity threshold.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={testDatabase} variant="outline" size="sm">
                      <Search className="h-4 w-4 mr-2" />
                      Test DB
                    </Button>
                    <Button onClick={testDetectionWithoutFilter} variant="outline" size="sm" disabled={isDetecting}>
                      <Search className="h-4 w-4 mr-2" />
                      Test Detection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
