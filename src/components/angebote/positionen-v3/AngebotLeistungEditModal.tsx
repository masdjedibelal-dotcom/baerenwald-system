'use client'
import { MockBtn } from '@/components/mock-ui'
import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { GroupedFieldCard, GroupedFieldRow } from '@/components/surfaces/primitives'
import { toast } from '@/components/ui/app-toast'
import { updateAngebotPositionSteuerung } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import { positionNettoZeile } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'
import { TOAST } from '@/lib/copy'

export function AngebotLeistungEditModal({
  open,
  onClose,
  pos,
  angebotId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  pos: AngebotPosition | null
  angebotId: string
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [showBeschreibung, setShowBeschreibung] = useState(false)
  const [vk, setVk] = useState('')
  const [ek, setEk] = useState('')
  const [menge, setMenge] = useState('1')
  const [einheit, setEinheit] = useState('Stk.')

  useEffect(() => {
    if (!open || !pos) return
    setName(pos.leistung_name || pos.leistung || '')
    setBeschreibung(pos.beschreibung ?? '')
    setShowBeschreibung(Boolean(pos.beschreibung?.trim()))
    setVk(String(positionNettoZeile(pos)))
    const ekLine = (pos.einkaufspreis ?? 0) * (pos.menge || 1)
    setEk(ekLine > 0 ? String(ekLine) : '')
    setMenge(String(pos.menge || 1))
    setEinheit(pos.einheit || 'Stk.')
  }, [open, pos])

  const dirty = useMemo(() => {
    if (!pos) return false
    const origName = pos.leistung_name || pos.leistung || ''
    const origVk = String(positionNettoZeile(pos))
    const origEk = String(((pos.einkaufspreis ?? 0) * (pos.menge || 1)) || '')
    return (
      name !== origName ||
      beschreibung !== (pos.beschreibung ?? '') ||
      vk !== origVk ||
      ek !== (origEk || '') ||
      menge !== String(pos.menge || 1) ||
      einheit !== (pos.einheit || 'Stk.')
    )
  }, [pos, name, beschreibung, vk, ek, menge, einheit])

  function save() {
    if (!pos) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error(TOAST.bezeichnung_fehlt)
      return
    }
    const vkNum = vk.trim() ? Number(vk.replace(',', '.')) : null
    const ekNum = ek.trim() ? Number(ek.replace(',', '.')) : null
    const mengeNum = menge.trim() ? Number(menge.replace(',', '.')) : 1

    startTransition(async () => {
      const r = await updateAngebotPositionSteuerung(angebotId, pos.id, {
        leistung_name: trimmed,
        beschreibung: beschreibung.trim() || null,
        vk_netto: vkNum != null && Number.isFinite(vkNum) ? vkNum : null,
        ek_netto: ekNum != null && Number.isFinite(ekNum) ? ekNum : null,
        menge: mengeNum > 0 ? mengeNum : 1,
        einheit: einheit.trim() || 'Stk.',
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.gespeichert)
      onSaved()
      onClose()
    })
  }

  if (!pos) return null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Position"
      context="detail"
      dirty={dirty}
      confirmBusy={pending}
      onConfirm={save}
    >
      <GroupedFieldCard>
        <GroupedFieldRow label="Bezeichnung">
          <MockInput className="w-full text-right" value={name} onChange={(e) => setName(e.target.value)} />
        </GroupedFieldRow>
        <GroupedFieldRow label="Menge">
          <MockInput type="number" className="w-24 text-right" step="0.01" min="0.01" value={menge} onChange={(e) => setMenge(e.target.value)} />
        </GroupedFieldRow>
        <GroupedFieldRow label="Einheit">
          <MockInput className="w-24 text-right" value={einheit} onChange={(e) => setEinheit(e.target.value)} />
        </GroupedFieldRow>
        <GroupedFieldRow label="Preis">
          <div className="txt-prefix justify-end">
            <span className="prefix">€</span>
            <MockInput type="number" className="w-28 text-right" step="0.01" min="0" value={vk} onChange={(e) => setVk(e.target.value)} />
          </div>
        </GroupedFieldRow>
        <GroupedFieldRow label="EK">
          <div className="txt-prefix justify-end">
            <span className="prefix">€</span>
            <MockInput type="number" className="w-28 text-right" step="0.01" min="0" value={ek} onChange={(e) => setEk(e.target.value)} />
          </div>
        </GroupedFieldRow>
      </GroupedFieldCard>

      {showBeschreibung ? (
        <GroupedFieldCard className="mt-3">
          <div className="px-4 py-3">
            <label className="input-label">Beschreibung</label>
            <MockTextarea className="mt-1 w-full min-h-[4rem]" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} />
          </div>
        </GroupedFieldCard>
      ) : (
        <MockBtn className="mt-3 text-[length:var(--fs-text)] font-medium text-bw-primary" type="button" onClick={() => setShowBeschreibung(true)}>
          + Beschreibung
        </MockBtn>
      )}
    </EditorSheet>
  )
}
