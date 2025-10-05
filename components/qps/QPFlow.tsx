'use client'

import { useState } from 'react'
import { ProgressIndicator } from '@/components/ui/progress-indicator'
import { QPSelectionStep } from './QPSelectionStep'
import { QPUploadStep } from './QPUploadStep'
import { QPSuccessStep } from './QPSuccessStep'

export type QPStep = 'selection' | 'upload' | 'success'

interface SubjectItem {
  code: string
  name: string
  staff?: string | null
  internal?: string | null
}

interface QPData {
  department: string
  year: string
  subject: SubjectItem
  uploadedFiles?: number
}

interface QPFlowProps {
  onComplete?: (data: QPData) => void
  onCancel?: () => void
}

const qpSteps = [
  { id: 1, title: 'Selection', description: 'Choose subject' },
  { id: 2, title: 'Upload', description: 'Add files' },
  { id: 3, title: 'Complete', description: 'Success' }
]

export function QPFlow({ onComplete, onCancel }: QPFlowProps) {
  const [currentStep, setCurrentStep] = useState<QPStep>('selection')
  const [qpData, setQpData] = useState<Partial<QPData>>({})

  const getStepNumber = (step: QPStep): number => {
    switch (step) {
      case 'selection': return 1
      case 'upload': return 2
      case 'success': return 3
      default: return 1
    }
  }

  const handleStepChange = (step: QPStep, data?: Partial<QPData>) => {
    if (data) {
      setQpData(prev => ({ ...prev, ...data }))
    }
    setCurrentStep(step)
  }

  const handleNext = (stepData: Partial<QPData>) => {
    const updatedData = { ...qpData, ...stepData }
    setQpData(updatedData)

    switch (currentStep) {
      case 'selection':
        setCurrentStep('upload')
        break
      case 'upload':
        setCurrentStep('success')
        break
      case 'success':
        onComplete?.(updatedData as QPData)
        break
    }
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'upload':
        setCurrentStep('selection')
        break
      case 'success':
        setCurrentStep('upload')
        break
    }
  }

  const handleComplete = () => {
    onComplete?.(qpData as QPData)
    // Reset to selection for new upload
    setCurrentStep('selection')
    setQpData({})
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'selection':
        return (
          <QPSelectionStep
            data={qpData}
            onNext={handleNext}
            onCancel={onCancel}
          />
        )
      case 'upload':
        return (
          <QPUploadStep
            data={qpData as QPData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )
      case 'success':
        return (
          <QPSuccessStep
            data={qpData as QPData}
            onComplete={handleComplete}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] page-transition">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Current Step Content */}
        <div className="fade-in">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  )
}
