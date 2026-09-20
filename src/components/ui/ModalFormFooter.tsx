'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui'
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
    </SheetFooterActions>
  )
}
