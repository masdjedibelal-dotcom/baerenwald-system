'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { GroupedFieldCard, GroupedFieldRow } from '@/components/surfaces/primitives'
import { toast } from '@/components/ui/app-toast'
import {
  LEISTUNG_STATUS_OPTIONS,
  type AuftragLeistungStatus,
  normalizeLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import { updateAuftragPositionSteuerung } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import { notifyPartnerPositionGeaendertV3 } from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import type { AuftragPosition } from '@/lib/types'

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
  const [showBeschreibung, setShowBeschreibung] = useState(false)
  const [vk, setVk] = useState('')
  const [ek, setEk] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [status, setStatus] = useState<AuftragLeistungStatus>('offen')

  useEffect(() => {
    if (!open || !pos) return
    setName(pos.leistung_name ?? '')
    setBeschreibung(pos.beschreibung ?? '')
    setShowBeschreibung(Boolean(pos.beschreibung?.trim()))
    setVk(pos.preis_fix != null ? String(pos.preis_fix) : '')
    setEk(pos.preis_partner != null ? String(pos.preis_partner) : '')
    setVon(pos.start_datum?.slice(0, 10) ?? '')
    setBis(pos.end_datum?.slice(0, 10) ?? '')
    setStatus(normalizeLeistungStatus(pos.leistung_status))
  }, [open, pos])

  const dirty = useMemo(() => {
    if (!pos) return false
    return (
      name !== (pos.leistung_name ?? '') ||
      beschreibung !== (pos.beschreibung ?? '') ||
      vk !== (pos.preis_fix != null ? String(pos.preis_fix) : '') ||
      ek !== (pos.preis_partner != null ? String(pos.preis_partner) : '') ||
      von !== (pos.start_datum?.slice(0, 10) ?? '') ||
      bis !== (pos.end_datum?.slice(0, 10) ?? '') ||
      status !== normalizeLeistungStatus(pos.leistung_status)
    )
  }, [pos, name, beschreibung, vk, ek, von, bis, status])

  function save() {
    if (!pos) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Name fehlt.')
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

      toast.success('Gespeichert')
      onSaved()
      onClose()
    })
  }

  if (!pos) return null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Leistung"
      context="detail"
      dirty={dirty}
      confirmBusy={pending}
      onConfirm={save}
      size="lg"
    >
      <GroupedFieldCard>
        <GroupedFieldRow label="Bezeichnung">
          <input className="input w-full text-right" value={name} onChange={(e) => setName(e.target.value)} />
        </GroupedFieldRow>
        <GroupedFieldRow label="Preis">
          <div className="txt-prefix justify-end">
            <span className="prefix">€</span>
            <input
              type="number"
              className="input w-28 text-right"
              step="0.01"
              min="0"
              value={vk}
              onChange={(e) => setVk(e.target.value)}
            />
          </div>
        </GroupedFieldRow>
        <GroupedFieldRow label="EK">
          <div className="txt-prefix justify-end">
            <span className="prefix">€</span>
            <input
              type="number"
              className="input w-28 text-right"
              step="0.01"
              min="0"
              value={ek}
              onChange={(e) => setEk(e.target.value)}
            />
          </div>
        </GroupedFieldRow>
        <GroupedFieldRow label="Von">
          <input type="date" className="input w-auto" value={von} onChange={(e) => setVon(e.target.value)} />
        </GroupedFieldRow>
        <GroupedFieldRow label="Bis">
          <input type="date" className="input w-auto" value={bis} onChange={(e) => setBis(e.target.value)} />
        </GroupedFieldRow>
      </GroupedFieldCard>

      <p className="mb-2 mt-4 text-[13px] text-bw-text-muted">Status</p>
      <div className="pos-v3-segmented mb-3">
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

      {showBeschreibung ? (
        <GroupedFieldCard>
          <div className="px-4 py-3">
            <label className="input-label">Beschreibung</label>
            <textarea
              className="input mt-1 w-full min-h-[4rem]"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
            />
          </div>
        </GroupedFieldCard>
      ) : (
        <button
          type="button"
          className="text-[14px] font-medium text-bw-primary"
          onClick={() => setShowBeschreibung(true)}
        >
          + Beschreibung
        </button>
      )}
    </EditorSheet>
  )
}
