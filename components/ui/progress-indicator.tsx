'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  title: string
  description?: string
}

interface ProgressIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isActive = stepNumber === currentStep
          const isInactive = stepNumber > currentStep

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div
                className={cn(
                  "progress-step",
                  {
                    "completed": isCompleted,
                    "active": isActive,
                    "inactive": isInactive
                  }
                )}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors duration-300",
                    isCompleted || (isActive && index === steps.length - 2)
                      ? "bg-[var(--color-success)]"
                      : isActive
                      ? "bg-[var(--color-secondary)]"
                      : "bg-[var(--color-accent)]"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Labels */}
      <div className="flex justify-between mt-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const isActive = stepNumber === currentStep

          return (
            <div key={step.id} className="text-center flex-1">
              <p
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isActive
                    ? "text-[var(--color-secondary)]"
                    : "text-[var(--color-text-muted)]"
                )}
              >
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {step.description}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
