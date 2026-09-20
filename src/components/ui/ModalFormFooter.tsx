'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui'
import { cn } from '@/lib/utils'

/** Abbrechen/Zurücksetzen + Primary — kanonisches Paar für Modals/Sheets. */
export function ModalFormFooter({
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel = 'Abbrechen',
  loading = false,
  submitDisabled = false,
  extra,
  className,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  cancelLabel?: string
  loading?: boolean
  submitDisabled?: boolean
  extra?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'modal-form-footer flex flex-wrap items-center justify-end gap-2',
        className
      )}
    >
      {extra ? <div className="mr-auto w-full md:w-auto">{extra}</div> : null}
      <MockBtn type="button" kind="secondary" onClick={onCancel}>
        {cancelLabel}
      </MockBtn>
      <MockBtn
        type="button"
        kind="primary"
        loading={loading}
        disabled={submitDisabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </MockBtn>
    </div>
  )
}
