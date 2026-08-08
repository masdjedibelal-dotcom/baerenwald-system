'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { SheetFooterActions } from '@/components/ui/SheetFooterActions'

/** Abbrechen/Zurücksetzen + Primary — kanonisches Paar für Modals/Sheets. */
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
    <SheetFooterActions className="modal-form-footer">
      {extra ? <div className="mr-auto w-full md:w-auto">{extra}</div> : null}
      <Button type="button" variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant="primary"
        loading={loading}
        disabled={submitDisabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </SheetFooterActions>
  )
}
