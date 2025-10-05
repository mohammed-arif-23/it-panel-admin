"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  RefreshCw,
  Plus,
  Calendar,
  Trash2,
  Save,
  X,
  FileSpreadsheet,
} from "lucide-react";

interface Holiday {
  id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  description?: string;
  is_announced: boolean;
  announced_date?: string;
  created_by: string;
  affects_seminars: boolean;
  affects_assignments: boolean;
  affects_exams: boolean;
  reschedule_rules?: any;
  created_at: string;
  updated_at: string;
  impact_assessments?: any[];
  reschedule_history?: any[];
}

interface ModernHolidayManagementProps {
  onRefresh: () => void;
  onExport: () => void;
  formatDateTime: (dateString: string) => string;
}

export default function ModernHolidayManagement({
  onRefresh,
  onExport,
  formatDateTime,
}: ModernHolidayManagementProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    upcoming: false,
    month: "",
    year: new Date().getFullYear().toString(),
  });

  const [newHoliday, setNewHoliday] = useState({
    holidayName: "",
    holidayDate: "",
    holidayType: "national",
    description: "",
    isAnnounced: true,
    announcedDate: "",
    createdBy: "admin",
    affectsSeminars: true,
    affectsAssignments: false,
    affectsExams: false,
  });

  const holidayTypes = [
    { value: "national", label: "National Holiday" },
    { value: "regional", label: "Regional Holiday" },
    { value: "college_specific", label: "College Holiday" },
    { value: "emergency", label: "Emergency Holiday" },
    { value: "announced", label: "Announced Holiday" },
    { value: "unannounced", label: "Unannounced Holiday" },
  ];

  useEffect(() => {
    fetchHolidays();
  }, [filters]);

  const fetchHolidays = async () => {
    setIsLoadingHolidays(true);
    try {
      const params = new URLSearchParams();

      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.upcoming) params.append("upcoming", "true");
      if (filters.month) params.append("month", filters.month);
      if (filters.year) params.append("year", filters.year);

      const response = await fetch(`/api/admin/holidays?${params}`);
      const data = await response.json();

      if (data.success) {
        setHolidays(data.holidays || []);
      } else {
        console.error("Failed to fetch holidays:", data.error);
        setHolidays([]);
      }
    } catch (error) {
      console.error("Error fetching holidays:", error);
      setHolidays([]);
    } finally {
      setIsLoadingHolidays(false);
    }
  };

  const handleAddHoliday = async () => {
    if (
      !newHoliday.holidayName ||
      !newHoliday.holidayDate ||
      !newHoliday.holidayType
    ) {
      alert("Holiday name, date, and type are required");
      return;
    }

    try {
      const response = await fetch("/api/admin/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHoliday),
      });

      const data = await response.json();

      if (data.success) {
        fetchHolidays();
        setShowAddForm(false);
        setNewHoliday({
          holidayName: "",
          holidayDate: "",
          holidayType: "national",
          description: "",
          isAnnounced: true,
          announcedDate: "",
          createdBy: "admin",
          affectsSeminars: true,
          affectsAssignments: false,
          affectsExams: false,
        });
        alert("Holiday added successfully!");
      } else {
        alert(`Failed to add holiday: ${data.error}`);
      }
    } catch (error) {
      console.error("Error adding holiday:", error);
      alert("Failed to add holiday. Please try again.");
    }
  };

  const handleDeleteHoliday = async (
    holidayId: string,
    holidayName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to delete "${holidayName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/holidays?id=${holidayId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        fetchHolidays();
        alert("Holiday deleted successfully!");
      } else {
        alert(`Failed to delete holiday: ${data.error}`);
      }
    } catch (error) {
      console.error("Error deleting holiday:", error);
      alert("Failed to delete holiday. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getHolidayTypeColor = (type: string) => {
    const colors = {
      national: "bg-red-100 text-red-800",
      regional: "bg-orange-100 text-orange-800",
      college_specific: "bg-blue-100 text-blue-800",
      emergency: "bg-red-200 text-red-900",
      announced: "bg-green-100 text-green-800",
      unannounced: "bg-yellow-100 text-yellow-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Holiday Management
          </h2>
          <p className="text-gray-600">
            Manage holidays and seminar reschedules
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onRefresh}
            disabled={isLoadingHolidays}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                isLoadingHolidays ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <Button onClick={onExport} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="type-filter">Holiday Type</Label>
              <select
                id="type-filter"
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                {holidayTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="year-filter">Year</Label>
              <Input
                id="year-filter"
                type="number"
                value={filters.year}
                onChange={(e) =>
                  setFilters({ ...filters, year: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="month-filter">Month</Label>
              <select
                id="month-filter"
                value={filters.month}
                onChange={(e) =>
                  setFilters({ ...filters, month: e.target.value })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                    {new Date(2024, i).toLocaleDateString("en-US", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.upcoming}
                  onChange={(e) =>
                    setFilters({ ...filters, upcoming: e.target.checked })
                  }
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Upcoming only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Holiday Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Add New Holiday</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holiday-name">Holiday Name *</Label>
                <Input
                  id="holiday-name"
                  value={newHoliday.holidayName}
                  onChange={(e) =>
                    setNewHoliday({
                      ...newHoliday,
                      holidayName: e.target.value,
                    })
                  }
                  placeholder="Enter holiday name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="holiday-date">Holiday Date *</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={newHoliday.holidayDate}
                  onChange={(e) =>
                    setNewHoliday({
                      ...newHoliday,
                      holidayDate: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="holiday-type">Holiday Type *</Label>
                <select
                  id="holiday-type"
                  value={newHoliday.holidayType}
                  onChange={(e) =>
                    setNewHoliday({
                      ...newHoliday,
                      holidayType: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {holidayTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="announced-date">Announced Date</Label>
                <Input
                  id="announced-date"
                  type="date"
                  value={newHoliday.announcedDate}
                  onChange={(e) =>
                    setNewHoliday({
                      ...newHoliday,
                      announcedDate: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newHoliday.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNewHoliday({
                      ...newHoliday,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter holiday description"
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Affects</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.affectsSeminars}
                      onChange={(e) =>
                        setNewHoliday({
                          ...newHoliday,
                          affectsSeminars: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Seminars</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.affectsAssignments}
                      onChange={(e) =>
                        setNewHoliday({
                          ...newHoliday,
                          affectsAssignments: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Assignments</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.affectsExams}
                      onChange={(e) =>
                        setNewHoliday({
                          ...newHoliday,
                          affectsExams: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Exams</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newHoliday.isAnnounced}
                      onChange={(e) =>
                        setNewHoliday({
                          ...newHoliday,
                          isAnnounced: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">Is Announced</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHoliday}>
                <Save className="h-4 w-4 mr-2" />
                Add Holiday
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holidays List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Holidays ({holidays.length})
          </CardTitle>
          <CardDescription>
            Manage holidays and their impact on seminars and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingHolidays ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Loading holidays...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No holidays found</p>
              <p className="text-sm text-gray-400">
                Add a holiday to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {holiday.holiday_name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getHolidayTypeColor(
                            holiday.holiday_type
                          )}`}
                        >
                          {holidayTypes.find(
                            (t) => t.value === holiday.holiday_type
                          )?.label || holiday.holiday_type}
                        </span>
                        {!holiday.is_announced && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Unannounced
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <p>
                            <strong>Date:</strong>{" "}
                            {formatDate(holiday.holiday_date)}
                          </p>
                          <p>
                            <strong>Created:</strong>{" "}
                            {formatDateTime(holiday.created_at)}
                          </p>
                          {holiday.announced_date && (
                            <p>
                              <strong>Announced:</strong>{" "}
                              {formatDate(holiday.announced_date)}
                            </p>
                          )}
                        </div>
                        <div>
                          <p>
                            <strong>Affects:</strong>
                            {[
                              holiday.affects_seminars && "Seminars",
                              holiday.affects_assignments && "Assignments",
                              holiday.affects_exams && "Exams",
                            ]
                              .filter(Boolean)
                              .join(", ") || "None"}
                          </p>
                          {holiday.reschedule_history &&
                            holiday.reschedule_history.length > 0 && (
                              <p>
                                <strong>Reschedules:</strong>{" "}
                                {holiday.reschedule_history.length}
                              </p>
                            )}
                        </div>
                      </div>

                      {holiday.description && (
                        <p className="mt-2 text-sm text-gray-700">
                          {holiday.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDeleteHoliday(holiday.id, holiday.holiday_name)
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
