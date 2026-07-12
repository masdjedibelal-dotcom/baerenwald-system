'use client'

import { useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import {
  AnfrageNeuForm,
  ANFRAGE_BEARBEITEN_FORM_ID,
  ANFRAGE_NEU_FORM_ID,
} from '@/components/anfragen/AnfrageNeuForm'
import { FormSheet } from '@/components/ui/FormSheet'
import { Button } from '@/components/ui/Button'
import type { LeadDetail } from '@/lib/types'

export type AnfrageNeuSheetProps = {
  open: boolean
  onClose: () => void
  defaultKundeId?: string | null
  onSuccess?: (id: string) => void
  /** Detail: gleiches Formular wie „Neue Anfrage“, aber vorbefüllt und speichert per Update */
  bearbeitenLead?: LeadDetail | null
}

export function AnfrageNeuSheet({
  open,
  onClose,
  defaultKundeId,
  onSuccess,
  bearbeitenLead,
}: AnfrageNeuSheetProps) {
  const [meta, setMeta] = useState({ loading: false, isValid: false })

  const isBearbeiten = Boolean(bearbeitenLead?.id)
  const formId = useMemo(
    () => (isBearbeiten ? ANFRAGE_BEARBEITEN_FORM_ID : ANFRAGE_NEU_FORM_ID),
    [isBearbeiten]
  )

  const title = isBearbeiten ? 'Anfrage bearbeiten' : 'Neue Anfrage anlegen'
  const primaryLabel = isBearbeiten ? 'Speichern' : 'Anfrage anlegen'

  return (
    <FormSheet
      open={open}
      onClose={onClose}
      width="lg"
      breadcrumb="Anfragen"
      title={title}
      footer={
        <>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Abbrechen
          </Button>
          <div className="flex-1" />
          <Button
            type="submit"
            form={formId}
            variant="primary"
            size="sm"
            loading={meta.loading}
            disabled={!meta.isValid || meta.loading}
            className="inline-flex gap-1.5"
          >
            <Save className="h-4 w-4" aria-hidden />
            {primaryLabel}
          </Button>
        </>
      }
    >
      <AnfrageNeuForm
        variant="sheet"
        formId={formId}
        defaultKundeId={defaultKundeId}
        bearbeitenLead={bearbeitenLead}
        onMetaChange={setMeta}
        onSuccess={(id) => onSuccess?.(id)}
        onCancel={onClose}
      />
    </FormSheet>
  )
}
