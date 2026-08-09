'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

/** Mobil: Primary volle Breite unten; Desktop: klassische rechte Button-Zeile. */
export function ModalFormFooter({
  onCancel,
  onSubmit,
  submitLabel,
  cancelLabel = 'Abbrechen',
  loading = false,
  submitDisabled = false,
  extra,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  cancelLabel?: string
  loading?: boolean
  submitDisabled?: boolean
  extra?: ReactNode
}) {
  return (
    <div className="modal-form-footer flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
      {extra ? <div className="order-3 w-full md:order-none md:mr-auto">{extra}</div> : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="order-2 w-full md:order-none md:w-auto"
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="order-1 w-full md:order-none md:w-auto"
        loading={loading}
        disabled={submitDisabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </div>
  )
}
