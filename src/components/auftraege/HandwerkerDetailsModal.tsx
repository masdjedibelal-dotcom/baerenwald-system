'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  updateAuftragHandwerkerDetails,
  updateAuftragPositionDetails,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'

export function HandwerkerDetailsModal({
  open,
  onClose,
  auftragId,
  mode,
  zuweisung,
  position,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  mode: 'gewerk' | 'position'
  zuweisung?: AuftragHandwerkerRow | null
  position?: AuftragPosition | null
  onSaved: () => void
}) {
  const isMobile = useIsMobile()
  const [pending, startTransition] = useTransition()
  const [preis, setPreis] = useState('')
  const [absprachen, setAbsprachen] = useState('')
  const [notizen, setNotizen] = useState('')

  useEffect(() => {
    if (!open) return
    if (mode === 'gewerk' && zuweisung) {
      setPreis(zuweisung.vereinbarter_preis != null ? String(zuweisung.vereinbarter_preis) : '')
      setAbsprachen(zuweisung.absprachen ?? '')
      setNotizen(zuweisung.notizen ?? '')
    } else if (mode === 'position' && position) {
      setPreis(position.preis_fix != null ? String(position.preis_fix) : '')
      setAbsprachen(position.absprachen ?? '')
      setNotizen(position.notizen_intern ?? '')
    }
  }, [open, mode, zuweisung, position])

  const title =
    mode === 'gewerk'
      ? `Details — ${zuweisung?.gewerke?.name ?? 'Gewerk'}`
      : `Details — ${position?.leistung_name ?? 'Leistung'}`

  function save() {
    const preisN = preis.trim() === '' || Number.isNaN(Number(preis)) ? null : Number(preis)
    startTransition(async () => {
      const r =
        mode === 'gewerk' && zuweisung
          ? await updateAuftragHandwerkerDetails({
              auftragId,
              zuweisungId: zuweisung.id,
              vereinbarter_preis: preisN,
              absprachen,
              notizen,
            })
          : mode === 'position' && position
            ? await updateAuftragPositionDetails({
                auftragId,
                positionId: position.id,
                preis_fix: preisN,
                absprachen,
                notizen_intern: notizen,
              })
            : { ok: false as const, message: 'Ungültig' }
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gespeichert')
        onSaved()
        onClose()
      }
    })
  }

  const footer = (
    <div className="flex gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
      <Button type="button" variant="primary" loading={pending} onClick={save}>
        Speichern
      </Button>
    </div>
  )

  const body = (
    <>
      <p className="mb-3 text-sm text-bw-text-muted">
        Intern: Preis, Absprachen und Notizen zur Handwerker-Zuweisung.
      </p>
      <div className="space-y-3">
        <Input
          label={mode === 'gewerk' ? 'Vereinbarter Preis (€)' : 'Preis Leistung (€)'}
          type="number"
          value={preis}
          onChange={(e) => setPreis(e.target.value)}
        />
        <Textarea label="Absprachen" value={absprachen} onChange={(e) => setAbsprachen(e.target.value)} rows={3} />
        <Textarea label="Notizen (intern)" value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={3} />
      </div>
    </>
  )

  if (isMobile) {
    return (
      <FormSheet open={open} onClose={onClose} breadcrumb="Auftrag" title={title} footer={footer}>
        {body}
      </FormSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md" footer={footer}>
      {body}
    </Modal>
  )
}
