'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, X, Library, FolderOpen, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface QPSelectionData {
  department?: string
  year?: string
  semester?: string
  subject?: SubjectItem
}

interface QPSelectionStepProps {
  data: Partial<QPSelectionData>
  onNext: (data: Partial<QPSelectionData>) => void
  onCancel?: () => void
}

export function QPSelectionStep({ data, onNext, onCancel }: QPSelectionStepProps) {
  const [departments, setDepartments] = useState<string[]>([])
  const [years, setYears] = useState<string[]>([])
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  
  const [selectedDept, setSelectedDept] = useState(data.department || '')
  const [selectedYear, setSelectedYear] = useState(data.year || '')
  const [selectedSemester, setSelectedSemester] = useState(data.semester || '')
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(data.subject || null)
  
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/qps/departments', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch departments')
      setDepartments(json.departments || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchYears = async (dept: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/qps/years?dept=${encodeURIComponent(dept)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch years')
      setYears(json.years || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (dept: string, year: string, semester: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/qps/subjects?dept=${encodeURIComponent(dept)}&year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch subjects')
      setSubjects(json.subjects || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const getSemestersForYear = (year: string) => {
    console.log('getSemestersForYear called with:', year)
    switch (year) {
      case 'I-IT':
        return ['Semester 1', 'Semester 2']
      case 'II-IT':
        return ['Semester 3', 'Semester 4']
      case 'III-IT':
        return ['Semester 5', 'Semester 6']
      case 'IV-IT':
        return ['Semester 7', 'Semester 8']
      default:
        console.log('No match found for year:', year, 'defaulting to Semester 1, 2')
        return ['Semester 1', 'Semester 2']
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    setSelectedYear('')
    setSelectedSemester('')
    setYears([])
    setSubjects([])
    setSelectedSubject(null)
    if (selectedDept) fetchYears(selectedDept)
  }, [selectedDept])

  useEffect(() => {
    setSelectedSemester('')
    setSubjects([])
    setSelectedSubject(null)
  }, [selectedYear])

  useEffect(() => {
    setSubjects([])
    setSelectedSubject(null)
    if (selectedDept && selectedYear && selectedSemester) {
      fetchSubjects(selectedDept, selectedYear, selectedSemester)
    }
  }, [selectedSemester])

  const handleNext = () => {
    if (!selectedDept || !selectedYear || !selectedSemester || !selectedSubject) return
    
    onNext({
      department: selectedDept,
      year: selectedYear,
      semester: selectedSemester,
      subject: selectedSubject
    })
  }

  const isFormValid = selectedDept && selectedYear && selectedSemester && selectedSubject

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
            <Library className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-[var(--color-primary)]">Select Question Paper</h2>
        <p className="text-[var(--color-text-muted)]">Choose department, year, semester, and subject</p>
      </div>

      {/* Form */}
      <div className="saas-card p-6 space-y-6">
        {/* Department Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
            Department *
          </label>
          {!selectedDept ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map(dept => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className="p-4 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-secondary)] bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)] transition-all text-left"
                >
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="w-5 h-5 text-[var(--color-secondary)]" />
                    <span className="font-medium">{dept}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-[var(--color-accent)] rounded-xl border border-[var(--color-secondary)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FolderOpen className="w-5 h-5 text-[var(--color-secondary)]" />
                  <span className="font-medium text-[var(--color-primary)]">{selectedDept}</span>
                </div>
                <button
                  onClick={() => setSelectedDept('')}
                  className="text-xs text-[var(--color-secondary)] hover:underline"
                >
                  Change
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Year Selection */}
        {selectedDept && (
          <div className="space-y-3 slide-in-left">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
              Year *
            </label>
            {!selectedYear ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {years.map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setSelectedYear(year)}
                    className="p-4 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-secondary)] bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)] transition-all text-center font-medium"
                  >
                    {year}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-accent)] rounded-xl border border-[var(--color-secondary)]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-primary)]">{selectedYear}</span>
                  <button
                    onClick={() => setSelectedYear('')}
                    className="text-xs text-[var(--color-secondary)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Semester Selection */}
        {selectedDept && selectedYear && (
          <div className="space-y-3 slide-in-left">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
              Semester *
            </label>
            {!selectedSemester ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {getSemestersForYear(selectedYear).map(semester => (
                  <button
                    key={semester}
                    type="button"
                    onClick={() => setSelectedSemester(semester)}
                    className="p-4 rounded-xl border border-[var(--color-border-light)] hover:border-[var(--color-secondary)] bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:bg-[var(--color-accent)] transition-all text-center font-medium"
                  >
                    {semester}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[var(--color-accent)] rounded-xl border border-[var(--color-secondary)]">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[var(--color-primary)]">{selectedSemester}</span>
                  <button
                    onClick={() => setSelectedSemester('')}
                    className="text-xs text-[var(--color-secondary)] hover:underline"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subject Selection */}
        {selectedDept && selectedYear && selectedSemester && (
          <div className="space-y-3 slide-in-left">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">
              Subject *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {subjects.map(subject => (
                <button
                  key={subject.code}
                  type="button"
                  onClick={() => setSelectedSubject(subject)}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    selectedSubject?.code === subject.code
                      ? 'bg-[var(--color-accent)] border-[var(--color-secondary)] text-[var(--color-secondary)]'
                      : 'bg-[var(--color-background)] border-[var(--color-border-light)] text-[var(--color-text-muted)] hover:border-[var(--color-secondary)]'
                  }`}
                >
                  <div className="font-semibold text-[var(--color-primary)]">{subject.code}</div>
                  <div className="text-sm text-[var(--color-text-muted)] mt-1">{subject.name}</div>
                  {subject.staff && (
                    <div className="text-xs text-[var(--color-text-muted)] mt-1">Staff: {subject.staff}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Guidelines */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">📋 Selection Guidelines:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Select your department first</li>
            <li>• Choose the academic year</li>
            <li>• Pick the specific subject for QP management</li>
            <li>• You can change selections at any time</li>
          </ul>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="saas-button-secondary flex-1 flex items-center justify-center space-x-2"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}
        <Button
          onClick={handleNext}
          disabled={!isFormValid || loading}
          className="saas-button-primary flex-1 flex items-center justify-center space-x-2 ripple"
        >
          <span>Continue to Upload</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
