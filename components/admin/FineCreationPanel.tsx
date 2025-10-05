'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, IndianRupee, Users, AlertTriangle, CheckCircle, Loader2, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FinePreview {
  date: string;
  fineAmount: number;
  summary: {
    totalStudents: number;
    studentsWhoBooked: number;
    studentsToFine: number;
    studentsAlreadyFined: number;
    studentsWhoCompleted: number;
    studentsSelectedForFuture: number;
    totalFineAmount: number;
    byClass: {
      'II-IT': { toFine: number; fineAmount: number };
      'III-IT': { toFine: number; fineAmount: number };
    };
  };
  students: {
    toFine: Array<{ id: string; register_number: string; name: string; class_year: string }>;
    alreadyFined: Array<{ id: string; register_number: string; name: string; class_year: string }>;
    whoBooked: Array<{ id: string; register_number: string; name: string; class_year: string }>;
    whoCompleted: Array<{ id: string; register_number: string; name: string; class_year: string }>;
    selectedForFuture: Array<{ id: string; register_number: string; name: string; class_year: string }>;
  };
  exclusions?: {
    completedSeminars: number;
    selectedForFuture: number;
    message: string;
  };
}

export default function FineCreationPanel() {
  const [selectedDate, setSelectedDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [preview, setPreview] = useState<FinePreview | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [showDetails, setShowDetails] = useState(false);

  // Get today's date for max date validation
  const today = new Date().toISOString().split('T')[0];

  const handlePreview = async () => {
    if (!selectedDate) {
      setMessage('Please select a date');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setPreview(null);

    try {
      const response = await fetch(`/api/admin/fines/create-for-date?date=${selectedDate}`, {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch preview');
      }

      setPreview(result.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to fetch preview');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFines = async () => {
    if (!selectedDate || !preview) return;

    setIsCreating(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/fines/create-for-date', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          date: selectedDate,
          amount: 10
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create fines');
      }

      setMessage(`Successfully created ₹10 fines for ${result.data.finesCreated} students`);
      setMessageType('success');
      
      // Refresh preview to show updated data
      await handlePreview();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to create fines');
      setMessageType('error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
          <CardTitle className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
              <IndianRupee className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Create Fines for Non-Booked Students</h3>
              <p className="text-gray-600 text-sm mt-1">Generate ₹10 fines for students who didn't book seminars and haven't completed their presentations</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-inner text-gray-800 font-medium"
              />
              <p className="text-xs text-gray-600 mt-2">
                Select a past date to create fines for students who didn't book and haven't completed their seminars
              </p>
            </div>

            {/* Preview Button */}
            <Button
              onClick={handlePreview}
              disabled={!selectedDate || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 mr-2" />
                  Preview Fines
                </>
              )}
            </Button>

            {/* Message */}
            {message && (
              <Alert 
                variant={messageType === 'error' ? 'destructive' : 'default'}
                className="mt-4"
              >
                {messageType === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Preview Results */}
            {preview && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Fine Preview for {new Date(preview.date).toLocaleDateString()}
                  </h4>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 text-center border border-gray-200">
                      <p className="text-2xl font-bold text-gray-800">{preview.summary.totalStudents}</p>
                      <p className="text-xs text-gray-600">Total Students</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                      <p className="text-2xl font-bold text-green-600">{preview.summary.studentsWhoBooked}</p>
                      <p className="text-xs text-green-700">Booked</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                      <p className="text-2xl font-bold text-blue-600">{preview.summary.studentsWhoCompleted}</p>
                      <p className="text-xs text-blue-700">Completed</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                      <p className="text-2xl font-bold text-purple-600">{preview.summary.studentsSelectedForFuture}</p>
                      <p className="text-xs text-purple-700">Selected</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <p className="text-2xl font-bold text-red-600">{preview.summary.studentsToFine}</p>
                      <p className="text-xs text-red-700">To Fine</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                      <p className="text-2xl font-bold text-yellow-600">{preview.summary.studentsAlreadyFined}</p>
                      <p className="text-xs text-yellow-700">Already Fined</p>
                    </div>
                  </div>

                  {/* Exclusion Info */}
                  {preview.exclusions && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
                      <h5 className="font-semibold text-blue-800 mb-2">Students Excluded from Fines</h5>
                      <p className="text-sm text-blue-700 mb-2">{preview.exclusions.message}</p>
                      <div className="flex space-x-4 text-sm">
                        <span className="text-blue-600">
                          <strong>{preview.exclusions.completedSeminars}</strong> completed seminars
                        </span>
                        <span className="text-blue-600">
                          <strong>{preview.exclusions.selectedForFuture}</strong> selected for future
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Class Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <h5 className="font-semibold text-blue-800 mb-2">II-IT Class</h5>
                      <p className="text-sm text-blue-700">
                        Students to fine: <span className="font-bold">{preview.summary.byClass['II-IT'].toFine}</span>
                      </p>
                      <p className="text-sm text-blue-700">
                        Fine amount: <span className="font-bold">₹{preview.summary.byClass['II-IT'].fineAmount}</span>
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <h5 className="font-semibold text-purple-800 mb-2">III-IT Class</h5>
                      <p className="text-sm text-purple-700">
                        Students to fine: <span className="font-bold">{preview.summary.byClass['III-IT'].toFine}</span>
                      </p>
                      <p className="text-sm text-purple-700">
                        Fine amount: <span className="font-bold">₹{preview.summary.byClass['III-IT'].fineAmount}</span>
                      </p>
                    </div>
                  </div>

                  {/* Total Fine Amount */}
                  <div className="bg-red-100 rounded-lg p-4 border border-red-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IndianRupee className="h-5 w-5 text-red-600" />
                        <span className="font-bold text-red-800">Total Fine Amount</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">₹{preview.summary.totalFineAmount}</span>
                    </div>
                  </div>

                  {/* Toggle Details */}
                  <Button
                    variant="ghost"
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full mt-4 text-gray-600 hover:text-gray-800"
                  >
                    {showDetails ? 'Hide Details' : 'Show Student Details'}
                  </Button>

                  {/* Student Details */}
                  {showDetails && (
                    <div className="mt-4 space-y-4">
                      {preview.summary.studentsToFine > 0 && (
                        <div>
                          <h5 className="font-semibold text-red-800 mb-2">Students to be Fined ({preview.summary.studentsToFine})</h5>
                          <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {preview.students.toFine.map((student) => (
                              <div key={student.id} className="flex justify-between items-center py-1 text-sm">
                                <span className="text-red-700">{student.register_number} - {student.name}</span>
                                <span className="text-red-600 font-medium">{student.class_year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.summary.studentsAlreadyFined > 0 && (
                        <div>
                          <h5 className="font-semibold text-yellow-800 mb-2">Already Fined ({preview.summary.studentsAlreadyFined})</h5>
                          <div className="bg-yellow-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {preview.students.alreadyFined.map((student) => (
                              <div key={student.id} className="flex justify-between items-center py-1 text-sm">
                                <span className="text-yellow-700">{student.register_number} - {student.name}</span>
                                <span className="text-yellow-600 font-medium">{student.class_year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.summary.studentsWhoCompleted > 0 && (
                        <div>
                          <h5 className="font-semibold text-blue-800 mb-2">Completed Seminars ({preview.summary.studentsWhoCompleted})</h5>
                          <div className="bg-blue-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {preview.students.whoCompleted.map((student) => (
                              <div key={student.id} className="flex justify-between items-center py-1 text-sm">
                                <span className="text-blue-700">{student.register_number} - {student.name}</span>
                                <span className="text-blue-600 font-medium">{student.class_year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.summary.studentsSelectedForFuture > 0 && (
                        <div>
                          <h5 className="font-semibold text-purple-800 mb-2">Selected for Future Seminars ({preview.summary.studentsSelectedForFuture})</h5>
                          <div className="bg-purple-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                            {preview.students.selectedForFuture.map((student) => (
                              <div key={student.id} className="flex justify-between items-center py-1 text-sm">
                                <span className="text-purple-700">{student.register_number} - {student.name}</span>
                                <span className="text-purple-600 font-medium">{student.class_year}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Create Fines Button */}
                {preview.summary.studentsToFine > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-800">Confirm Fine Creation</span>
                    </div>
                    <p className="text-sm text-red-700 mb-4">
                      This will create ₹10 fines for {preview.summary.studentsToFine} students who didn't book on {new Date(preview.date).toLocaleDateString()}.
                    </p>
                    <Button
                      onClick={handleCreateFines}
                      disabled={isCreating}
                      className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Creating Fines...
                        </>
                      ) : (
                        <>
                          <IndianRupee className="h-5 w-5 mr-2" />
                          Create ₹{preview.summary.totalFineAmount} in Fines
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {preview.summary.studentsToFine === 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">No Fines Needed</span>
                    </div>
                    <p className="text-sm text-green-700 mt-2">
                      All students either booked for this date, completed their seminars, are selected for future seminars, or already have fines applied.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
