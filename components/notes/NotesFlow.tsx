'use client'

import { useState } from 'react'
import { NotesSelectionStep, type NotesSelectionStepType } from './NotesSelectionStep'
import { NotesUploadStep } from './NotesUploadStep'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface NotesData {
  department?: string
  year?: string
  semester?: string
  subject?: SubjectItem
}

export function NotesFlow() {
  const [currentStep, setCurrentStep] = useState<NotesSelectionStepType>('department')
  const [data, setData] = useState<Partial<NotesData>>({})

  const handleNext = (stepData: Partial<NotesData>) => {
    const newData = { ...data, ...stepData }
    setData(newData)

    if (currentStep === 'department') {
      setCurrentStep('year')
    } else if (currentStep === 'year') {
      setCurrentStep('semester')
    } else if (currentStep === 'semester') {
      setCurrentStep('subject')
    } else if (currentStep === 'subject') {
      setCurrentStep('upload')
    }
  }

  const handleBack = () => {
    if (currentStep === 'year') {
      setCurrentStep('department')
    } else if (currentStep === 'semester') {
      setCurrentStep('year')
    } else if (currentStep === 'subject') {
      setCurrentStep('semester')
    } else if (currentStep === 'upload') {
      setCurrentStep('subject')
    }
  }

  const handleReset = () => {
    setCurrentStep('department')
    setData({})
  }

  if (currentStep === 'upload' && data.department && data.year && data.semester && data.subject) {
    return (
      <NotesUploadStep
        data={{
          department: data.department,
          year: data.year,
          semester: data.semester,
          subject: data.subject
        }}
        onBack={handleBack}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Notes</h1>
          <p className="text-gray-600">Select subject and upload study notes</p>
        </div>

        <NotesSelectionStep
          data={data}
          onNext={handleNext}
          onBack={handleBack}
          currentStep={currentStep}
        />

        {/* Progress Indicator */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            {(['department', 'year', 'semester', 'subject'] as NotesSelectionStepType[]).map((step, index) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentStep === step
                    ? 'bg-purple-600'
                    : index < (['department', 'year', 'semester', 'subject'] as NotesSelectionStepType[]).indexOf(currentStep)
                    ? 'bg-purple-500'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
