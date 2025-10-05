"use client";

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, User, BookOpen, X } from 'lucide-react';

interface TargetSelectorProps {
  onTargetChange: (target: string, targetValue: any) => void;
}

interface Student {
  id: string;
  register_number: string;
  name: string;
  class_year: string;
}

export default function TargetSelector({ onTargetChange }: TargetSelectorProps) {
  const [targetType, setTargetType] = useState<'student' | 'students' | 'class' | 'all' | 'category'>('all');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const classes = ['II-IT', 'III-IT'];
  const categories = ['assignments', 'seminars', 'fines', 'cod', 'general'];

  useEffect(() => {
    // Emit change to parent
    let value: any = null;
    
    switch (targetType) {
      case 'student':
        value = selectedStudents[0]?.id || null;
        break;
      case 'students':
        value = selectedStudents.map(s => s.id);
        break;
      case 'class':
        value = selectedClass;
        break;
      case 'category':
        value = { category: selectedCategory, classYear: selectedClass || undefined };
        break;
      case 'all':
        value = null;
        break;
    }
    
    onTargetChange(targetType, value);
  }, [targetType, selectedClass, selectedCategory, selectedStudents]);

  const searchStudents = async (query: string) => {
    if (!query || query.length < 2) {
      setStudents([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/admin/students/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Failed to search students:', error);
      setStudents([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.length >= 2) {
      const debounce = setTimeout(() => searchStudents(value), 300);
      return () => clearTimeout(debounce);
    }
  };

  const addStudent = (student: Student) => {
    if (targetType === 'student') {
      setSelectedStudents([student]);
    } else {
      if (!selectedStudents.find(s => s.id === student.id)) {
        setSelectedStudents([...selectedStudents, student]);
      }
    }
    setSearchQuery('');
    setStudents([]);
  };

  const removeStudent = (studentId: string) => {
    setSelectedStudents(selectedStudents.filter(s => s.id !== studentId));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">Target Audience</Label>
        <p className="text-sm text-gray-500 mb-3">Who should receive this notification?</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setTargetType('student')}
            className={`p-3 rounded-lg border-2 transition-all ${
              targetType === 'student'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <User className="h-5 w-5 mx-auto mb-1" />
            <span className="text-xs font-medium">Single Student</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTargetType('students')}
            className={`p-3 rounded-lg border-2 transition-all ${
              targetType === 'students'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Users className="h-5 w-5 mx-auto mb-1" />
            <span className="text-xs font-medium">Multiple Students</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTargetType('class')}
            className={`p-3 rounded-lg border-2 transition-all ${
              targetType === 'class'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <BookOpen className="h-5 w-5 mx-auto mb-1" />
            <span className="text-xs font-medium">Entire Class</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTargetType('category')}
            className={`p-3 rounded-lg border-2 transition-all ${
              targetType === 'category'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Badge className="mx-auto mb-1">Cat</Badge>
            <span className="text-xs font-medium">By Category</span>
          </button>
          
          <button
            type="button"
            onClick={() => setTargetType('all')}
            className={`p-3 rounded-lg border-2 transition-all ${
              targetType === 'all'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Users className="h-5 w-5 mx-auto mb-1" />
            <span className="text-xs font-medium">All Students</span>
          </button>
        </div>
      </div>

      {/* Student Selection */}
      {(targetType === 'student' || targetType === 'students') && (
        <div className="space-y-3">
          <Label>Search Students</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by name or register number..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
          
          {students.length > 0 && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => addStudent(student)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-sm">{student.name}</div>
                  <div className="text-xs text-gray-500">
                    {student.register_number} • {student.class_year}
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {selectedStudents.length > 0 && (
            <div>
              <Label className="mb-2">Selected Students ({selectedStudents.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((student) => (
                  <Badge
                    key={student.id}
                    variant="outline"
                    className="pl-3 pr-1 py-1 flex items-center gap-2"
                  >
                    <span className="text-sm">{student.name}</span>
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id)}
                      className="hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Class Selection */}
      {(targetType === 'class' || (targetType === 'category' && selectedCategory)) && (
        <div>
          <Label>Select Class {targetType === 'category' && '(Optional)'}</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose a class..." />
            </SelectTrigger>
            <SelectContent>
              {targetType === 'category' && (
                <SelectItem value="">All Classes</SelectItem>
              )}
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category Selection */}
      {targetType === 'category' && (
        <div>
          <Label>Select Category</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose a category..." />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Send to students who have enabled notifications for this category
          </p>
        </div>
      )}

      {/* All Students Info */}
      {targetType === 'all' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> This notification will be sent to all registered students.
          </p>
        </div>
      )}
    </div>
  );
}
