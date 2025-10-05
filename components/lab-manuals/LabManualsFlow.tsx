'use client'

import { useState } from 'react'
import { LabManualsSelectionStep, type LabManualsSelectionStepType } from './LabManualsSelectionStep'
import { LabManualsUploadStep } from './LabManualsUploadStep'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface LabManualsData {
  department?: string
  year?: string
  semester?: string
  subject?: SubjectItem
}

export function LabManualsFlow() {
  const [currentStep, setCurrentStep] = useState<LabManualsSelectionStepType>('department')
  const [data, setData] = useState<Partial<LabManualsData>>({})

  const handleNext = (stepData: Partial<LabManualsData>) => {
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
      <LabManualsUploadStep
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Lab Manuals</h1>
          <p className="text-gray-600">Select subject and upload lab manual files</p>
        </div>

        <LabManualsSelectionStep
          data={data}
          onNext={handleNext}
          onBack={handleBack}
          currentStep={currentStep}
        />

        {/* Progress Indicator */}
        <div className="mt-8 flex justify-center">
          <div className="flex space-x-2">
            {(['department', 'year', 'semester', 'subject'] as LabManualsSelectionStepType[]).map((step, index) => (
              <div
                key={step}
                className={`w-3 h-3 rounded-full transition-colors ${
                  currentStep === step
                    ? 'bg-green-600'
                    : index < (['department', 'year', 'semester', 'subject'] as LabManualsSelectionStepType[]).indexOf(currentStep)
                    ? 'bg-green-500'
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
