'use client'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import {
  updateAuftragHandwerkerDetails,
  updateAuftragPositionDetails,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'
import { TOAST } from '@/lib/copy'

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
  const [pending, startTransition] = useLocalTransition()
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
      if (!r.ok) toast.systemError(r)
      else {
        toast.success(TOAST.gespeichert)
        onSaved()
        onClose()
      }
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      secondary={{ label: 'Abbrechen' }}
      primary={{ label: 'Speichern', busy: pending, onClick: save }}
    >
      <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
        Intern: Preis, Absprachen und Notizen zur Partner-Zuweisung.
      </p>
      <div className="space-y-3">
        <MockField label={mode === 'gewerk' ? 'Vereinbarter Preis (€)' : 'Preis Leistung (€)'}><MockInput type="number" value={preis} onChange={(e) => setPreis(e.target.value)} /></MockField>
        <MockField label="Absprachen"><RichTextEditor value={typeof (absprachen) === 'string' ? (absprachen) : ''} onChange={(__v) => setAbsprachen(__v)} minHeight={120} aria-label="Absprachen" /></MockField>
        <MockField label="Notizen (intern)"><RichTextEditor value={typeof (notizen) === 'string' ? (notizen) : ''} onChange={(__v) => setNotizen(__v)} minHeight={120} aria-label="Notizen (intern)" /></MockField>
      </div>
    </EditorSheet>
  )
}
