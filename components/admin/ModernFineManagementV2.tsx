"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  RefreshCw,
  CheckCircle,
  Users,
  ArrowLeft,
  Check,
  Eye,
} from "lucide-react";

interface Student {
  id: string;
  register_number: string;
  name: string;
  email: string;
  class_year: string;
}

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

interface StudentWithFines extends Student {
  fines: Fine[];
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}

export default function ModernFineManagementV2() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [students, setStudents] = useState<StudentWithFines[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithFines | null>(null);
  const [selectedFineIds, setSelectedFineIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const classes = ["II-IT", "III-IT", "IV-IT"];

  // Fetch students by class
  const fetchStudentsByClass = async (classYear: string) => {
    setIsLoadingStudents(true);
    try {
      const response = await fetch(
        `/api/admin/students?class=${encodeURIComponent(classYear)}&limit=1000`
      );
      const data = await response.json();

      if (data.success && data.data) {
        // Fetch fines for each student
        const studentsWithFines = await Promise.all(
          data.data.map(async (student: Student) => {
            const finesRes = await fetch(
              `/api/admin/fines?student_id=${student.id}`
            );
            const finesData = await finesRes.json();
            const fines = finesData.data?.fines || [];

            const totalAmount = fines.reduce(
              (sum: number, f: Fine) => sum + f.base_amount,
              0
            );
            const pendingAmount = fines
              .filter((f: Fine) => f.payment_status === "pending")
              .reduce((sum: number, f: Fine) => sum + f.base_amount, 0);
            const paidAmount = fines
              .filter((f: Fine) => f.payment_status === "paid")
              .reduce(
                (sum: number, f: Fine) =>
                  sum + (f.paid_amount || f.base_amount),
                0
              );

            return {
              ...student,
              fines,
              totalAmount,
              pendingAmount,
              paidAmount,
            };
          })
        );

        // Sort by register number in ascending order
        studentsWithFines.sort((a, b) =>
          a.register_number.localeCompare(b.register_number)
        );

        setStudents(studentsWithFines);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  // Handle class selection
  const handleClassSelect = (classYear: string) => {
    setSelectedClass(classYear);
    setSelectedStudent(null);
    setSelectedFineIds([]);
    fetchStudentsByClass(classYear);
  };

  // Handle student selection to view fines
  const handleViewFines = (student: StudentWithFines) => {
    setSelectedStudent(student);
    setSelectedFineIds([]);
  };

  // Toggle fine selection
  const toggleFineSelection = (fineId: string) => {
    setSelectedFineIds((prev) =>
      prev.includes(fineId)
        ? prev.filter((id) => id !== fineId)
        : [...prev, fineId]
    );
  };

  // Select all fines
  const toggleSelectAll = () => {
    if (!selectedStudent) return;

    const pendingFines = selectedStudent.fines.filter(
      (f) => f.payment_status === "pending"
    );

    if (selectedFineIds.length === pendingFines.length) {
      setSelectedFineIds([]);
    } else {
      setSelectedFineIds(pendingFines.map((f) => f.id));
    }
  };

  // Mark selected fines as paid
  const handleMarkAsPaid = async () => {
    if (selectedFineIds.length === 0) {
      alert("Please select at least one fine to mark as paid");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to mark ${selectedFineIds.length} fine(s) as paid?`
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/fines/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fineIds: selectedFineIds,
          paymentStatus: "paid",
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully marked ${selectedFineIds.length} fine(s) as paid`);
        setSelectedFineIds([]);
        // Refresh the student's fines
        if (selectedStudent) {
          const finesRes = await fetch(
            `/api/admin/fines?student_id=${selectedStudent.id}`
          );
          const finesData = await finesRes.json();
          const fines = finesData.data?.fines || [];

          const totalAmount = fines.reduce(
            (sum: number, f: Fine) => sum + f.base_amount,
            0
          );
          const pendingAmount = fines
            .filter((f: Fine) => f.payment_status === "pending")
            .reduce((sum: number, f: Fine) => sum + f.base_amount, 0);
          const paidAmount = fines
            .filter((f: Fine) => f.payment_status === "paid")
            .reduce(
              (sum: number, f: Fine) => sum + (f.paid_amount || f.base_amount),
              0
            );

          setSelectedStudent({
            ...selectedStudent,
            fines,
            totalAmount,
            pendingAmount,
            paidAmount,
          });

          // Update in the students list
          setStudents((prev) =>
            prev.map((s) =>
              s.id === selectedStudent.id
                ? {
                    ...s,
                    fines,
                    totalAmount,
                    pendingAmount,
                    paidAmount,
                  }
                : s
            )
          );
        }
      } else {
        alert(`Failed to update fines: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating fines:", error);
      alert("Failed to update fines. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "waived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getFineTypeLabel = (type: string) => {
    switch (type) {
      case "seminar_no_booking":
        return "Seminar No Booking";
      case "assignment_late":
        return "Assignment Late";
      case "attendance_absent":
        return "Attendance Absent";
      default:
        return type.replace("_", " ").toUpperCase();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Class Selection */}
      {!selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Class
            </CardTitle>
            <CardDescription>
              Choose a class to view students and manage their fines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {classes.map((classYear) => (
                <button
                  key={classYear}
                  onClick={() => handleClassSelect(classYear)}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group"
                >
                  <div className="text-center">
                    <div className="h-16 w-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600">
                      {classYear}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">View Students</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Students List */}
      {selectedClass && !selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Users className="h-5 w-5" />
                  Students in {selectedClass}
                </CardTitle>
                <CardDescription className="text-sm">
                  Click on a student to view and manage their fines
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedClass("");
                  setStudents([]);
                }}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Classes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="text-grater py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
                <p className="text-gray-600">Loading students...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No students found in this class</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewFines(student)}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900">
                          {student.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 break-all">
                          {student.register_number}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 break-all">
                          {student.email}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <div className="text-center sm:text-left">
                          <p className="text-xs text-gray-600">Total</p>
                          <p className="text-lg sm:text-xl font-bold text-gray-900">
                            ₹{student.totalAmount}
                          </p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-xs text-gray-600">Pending</p>
                          <p className="text-lg sm:text-xl font-bold text-yellow-600">
                            ₹{student.pendingAmount}
                          </p>
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-xs text-gray-600">Paid</p>
                          <p className="text-lg sm:text-xl font-bold text-green-600">
                            ₹{student.paidAmount}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="w-full sm:w-auto">
                        <Eye className="h-4 w-4 mr-2" />
                        View Fines
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Student Fines Management */}
      {selectedStudent && (
        <div className="space-y-6">
          {/* Student Info Card */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <DollarSign className="h-5 w-5" />
                    Fines for {selectedStudent.name}
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm break-all">
                    {selectedStudent.register_number}
                  </CardDescription>
                  <CardDescription className="text-xs sm:text-sm break-all">
                    {selectedStudent.email}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null);
                    setSelectedFineIds([]);
                  }}
                  className="w-full sm:w-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Students
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Total Amount
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    ₹{selectedStudent.totalAmount}
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Pending Amount
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-yellow-600">
                    ₹{selectedStudent.pendingAmount}
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">
                    Paid Amount
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600">
                    ₹{selectedStudent.paidAmount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fines Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4">
                <CardTitle className="text-lg sm:text-xl">
                  Fine Details
                </CardTitle>
                {selectedFineIds.length > 0 && (
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="text-center sm:text-left">
                      <p className="text-xs sm:text-sm text-gray-600">
                        Selected Amount
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-600">
                        ₹
                        {selectedStudent.fines
                          .filter((f) => selectedFineIds.includes(f.id))
                          .reduce((sum, f) => sum + f.base_amount, 0)}
                      </p>
                    </div>
                    <Button
                      onClick={handleMarkAsPaid}
                      disabled={isUpdating}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                      size="sm"
                    >
                      {isUpdating ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Mark {selectedFineIds.length} as Paid
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedStudent.fines.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500">No fines for this student</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                selectedStudent.fines.filter(
                                  (f) => f.payment_status === "pending"
                                ).length > 0 &&
                                selectedFineIds.length ===
                                  selectedStudent.fines.filter(
                                    (f) => f.payment_status === "pending"
                                  ).length
                              }
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Fine Type</TableHead>
                          <TableHead>Reference Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStudent.fines
                          .sort(
                            (a, b) =>
                              new Date(a.reference_date).getTime() -
                              new Date(b.reference_date).getTime()
                          )
                          .map((fine) => (
                            <TableRow key={fine.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedFineIds.includes(fine.id)}
                                  onCheckedChange={() =>
                                    toggleFineSelection(fine.id)
                                  }
                                  disabled={fine.payment_status !== "pending"}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {getFineTypeLabel(fine.fine_type)}
                              </TableCell>
                              <TableCell>
                                {formatDate(fine.reference_date)}
                              </TableCell>
                              <TableCell className="font-semibold">
                                ₹{fine.base_amount}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={getStatusColor(
                                    fine.payment_status
                                  )}
                                >
                                  {fine.payment_status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {formatDate(fine.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3">
                    {selectedStudent.fines
                      .sort(
                        (a, b) =>
                          new Date(a.reference_date).getTime() -
                          new Date(b.reference_date).getTime()
                      )
                      .map((fine) => (
                        <div
                          key={fine.id}
                          className="border border-gray-200 rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <Checkbox
                                checked={selectedFineIds.includes(fine.id)}
                                onCheckedChange={() =>
                                  toggleFineSelection(fine.id)
                                }
                                disabled={fine.payment_status !== "pending"}
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold text-sm text-gray-900">
                                  {getFineTypeLabel(fine.fine_type)}
                                </h4>
                                <p className="text-xs text-gray-600 mt-1">
                                  Ref: {formatDate(fine.reference_date)}
                                </p>
                              </div>
                            </div>
                            <Badge
                              className={getStatusColor(fine.payment_status)}
                            >
                              {fine.payment_status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                            <div>
                              <p className="text-xs text-gray-600">Amount</p>
                              <p className="text-lg font-bold text-gray-900">
                                ₹{fine.base_amount}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">Created</p>
                              <p className="text-xs text-gray-900">
                                {formatDate(fine.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
