'use client'

import { useEffect } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

interface ToastProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  variant?: 'success' | 'error'
  duration?: number
}

export function Toast({
  open,
  onOpenChange,
  title,
  description,
  variant = 'success',
  duration = 3000
}: ToastProps) {
  useEffect(() => {
    if (open && duration > 0) {
      const timer = setTimeout(() => {
        onOpenChange(false)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [open, duration, onOpenChange])

  if (!open) return null

  const bgColor = variant === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  const textColor = variant === 'success' ? 'text-green-800' : 'text-red-800'
  const iconColor = variant === 'success' ? 'text-green-600' : 'text-red-600'

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 duration-300">
      <div className={`${bgColor} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md`}>
        <div className="flex items-start gap-3">
          {variant === 'success' ? (
            <CheckCircle2 className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
          ) : (
            <XCircle className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
          )}
          <div className="flex-1">
            <p className={`font-semibold ${textColor}`}>{title}</p>
            {description && (
              <p className={`text-sm ${textColor} opacity-90 mt-1`}>{description}</p>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className={`${textColor} hover:opacity-70 transition-opacity`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}