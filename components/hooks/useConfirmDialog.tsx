'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type Variant = 'default' | 'success' | 'destructive'

interface ConfirmOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: Variant
  hideCancel?: boolean
  onConfirm: () => void
}

export function useConfirmDialog() {
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<ConfirmOptions | null>(null)

  const confirm = (options: ConfirmOptions) => {
    setConfig(options)
    setOpen(true)
  }

  const Dialog = config ? (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={config.title}
      description={config.description}
      confirmText={config.confirmText}
      cancelText={config.cancelText}
      variant={config.variant}
      hideCancel={config.hideCancel}
      onConfirm={() => {
        config.onConfirm()
        setOpen(false)
      }}
    />
  ) : null

  return { confirm, Dialog }
}
