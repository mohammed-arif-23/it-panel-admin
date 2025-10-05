'use client'

import { CheckCircle, FileText, Calendar, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface QPSuccessData {
  department: string
  year: string
  subject: SubjectItem
  uploadedFiles?: number
}

interface QPSuccessStepProps {
  data: QPSuccessData
  onComplete: () => void
}

export function QPSuccessStep({ data, onComplete }: QPSuccessStepProps) {
  return (
    <div className="space-y-6">
      {/* Success Animation */}
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-3xl font-bold text-green-600 mb-2">🎉 Success!</h3>
        <p className="text-[var(--color-text-secondary)] text-lg mb-6">
          Question papers uploaded successfully
        </p>

        {/* Upload Summary */}
        {data.uploadedFiles && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 mb-6 inline-block">
            <div className="text-center">
              <p className="text-sm text-green-700 mb-2">Files Uploaded</p>
              <p className="text-4xl font-bold text-green-600">{data.uploadedFiles}</p>
              <p className="text-xs text-green-600 mt-1">question papers</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Details Card */}
      <div className="saas-card p-6">
        <h4 className="font-bold text-[var(--color-primary)] mb-4 flex items-center space-x-2">
          <FileText className="w-5 h-5" />
          <span>Upload Summary</span>
        </h4>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--color-accent)] rounded-xl">
              <div className="flex items-center space-x-3">
                <FolderOpen className="w-5 h-5 text-[var(--color-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Department</p>
                  <p className="font-semibold text-[var(--color-primary)]">{data.department}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-[var(--color-accent)] rounded-xl">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-[var(--color-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Academic Year</p>
                  <p className="font-semibold text-[var(--color-primary)]">{data.year}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-[var(--color-accent)] rounded-xl">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-[var(--color-secondary)]" />
                <div>
                  <p className="text-xs text-[var(--color-text-muted)]">Subject</p>
                  <p className="font-semibold text-[var(--color-primary)]">{data.subject.code}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">Subject Details</h5>
            <p className="text-sm text-blue-700 mb-1">
              <span className="font-medium">Name:</span> {data.subject.name}
            </p>
            {data.subject.staff && (
              <p className="text-sm text-blue-700">
                <span className="font-medium">Staff:</span> {data.subject.staff}
              </p>
            )}
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <h5 className="font-medium text-purple-900 mb-2">📁 Storage Location</h5>
            <p className="text-sm text-purple-700 font-mono">
              questionpapers/{data.subject.code.replace(/[^A-Za-z0-9 _().\-]/g, '').replace(/\s+/g, '_')}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <h5 className="font-medium text-amber-900 mb-2">✅ What's Next?</h5>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Files are now accessible to students</li>
              <li>• You can manage files anytime from the QP section</li>
              <li>• Use rename/delete options to organize files</li>
              <li>• Upload more files by selecting the same subject</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onComplete}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all duration-300 text-lg"
        >
          Back to QP Management
        </Button>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.reload()}
            className="saas-button-secondary py-3"
          >
            Upload More Files
          </button>
          <button
            onClick={() => window.open('/admin', '_blank')}
            className="saas-button-secondary py-3"
          >
            Admin Dashboard
          </button>
        </div>
      </div>

      {/* Celebration Effects */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
      </div>
    </div>
  )
}
