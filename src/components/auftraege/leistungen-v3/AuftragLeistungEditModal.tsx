'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import {
  LEISTUNG_STATUS_OPTIONS,
  type AuftragLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import { updateAuftragPositionSteuerung } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import { notifyPartnerPositionGeaendertV3 } from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import type { AuftragPosition } from '@/lib/types'
import { normalizeLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'

type GewerkOpt = { id: string; name: string; slug: string }

export function AuftragLeistungEditModal({
  open,
  onClose,
  pos,
  auftragId,
  angebotId,
  projektName,
  gewerke,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  pos: AuftragPosition | null
  auftragId: string
  angebotId?: string | null
  projektName: string
  gewerke: GewerkOpt[]
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [vk, setVk] = useState('')
  const [ek, setEk] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [status, setStatus] = useState<AuftragLeistungStatus>('offen')

  useEffect(() => {
    if (!open || !pos) return
    setName(pos.leistung_name ?? '')
    setBeschreibung(pos.beschreibung ?? '')
    setVk(pos.preis_fix != null ? String(pos.preis_fix) : '')
    setEk(pos.preis_partner != null ? String(pos.preis_partner) : '')
    setVon(pos.start_datum?.slice(0, 10) ?? '')
    setBis(pos.end_datum?.slice(0, 10) ?? '')
    setStatus(normalizeLeistungStatus(pos.leistung_status))
  }, [open, pos])

  function save() {
    if (!pos) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Name ist erforderlich.')
      return
    }
    const vkNum = vk.trim() ? Number(vk.replace(',', '.')) : null
    const ekNum = ek.trim() ? Number(ek.replace(',', '.')) : null

    startTransition(async () => {
      const r = await updateAuftragPositionSteuerung(pos.id, auftragId, {
        leistung_name: trimmed,
        beschreibung: beschreibung.trim() || null,
        preis_fix: vkNum != null && Number.isFinite(vkNum) ? vkNum : null,
        preis_partner: ekNum != null && Number.isFinite(ekNum) ? ekNum : null,
        start_datum: von || null,
        end_datum: bis || null,
        leistung_status: status,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }

      if (r.partnerAenderung && pos.handwerker_id) {
        const notify = await notifyPartnerPositionGeaendertV3({
          auftragId,
          angebotId,
          positionId: pos.id,
          projektName,
          gewerke,
        })
        if (!notify.ok) toast.error(notify.message)
      }

      toast.success('Leistung gespeichert.')
      onSaved()
      onClose()
    })
  }

  if (!pos) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Leistung bearbeiten"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" onClick={save} disabled={pending}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="input-label">Name</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Beschreibung</label>
          <textarea
            className="input w-full min-h-[4.5rem]"
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label">VK netto</label>
          <div className="txt-prefix">
            <span className="prefix">€</span>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0"
              value={vk}
              onChange={(e) => setVk(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="input-label">EK netto</label>
          <div className="txt-prefix">
            <span className="prefix">€</span>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0"
              value={ek}
              onChange={(e) => setEk(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="input-label">Von</label>
          <input type="date" className="input w-full" value={von} onChange={(e) => setVon(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Bis</label>
          <input type="date" className="input w-full" value={bis} onChange={(e) => setBis(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Baufortschritt</label>
          <div className="pos-v3-segmented">
            {LEISTUNG_STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={status === o.value ? 'active' : undefined}
                onClick={() => setStatus(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
