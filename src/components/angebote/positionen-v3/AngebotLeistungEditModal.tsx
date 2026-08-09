'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { updateAngebotPositionSteuerung } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import { positionNettoZeile } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'

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
  const [vk, setVk] = useState('')
  const [ek, setEk] = useState('')
  const [menge, setMenge] = useState('1')
  const [einheit, setEinheit] = useState('Stk.')

  useEffect(() => {
    if (!open || !pos) return
    setName(pos.leistung_name || pos.leistung || '')
    setBeschreibung(pos.beschreibung ?? '')
    setVk(String(positionNettoZeile(pos)))
    const ekLine = (pos.einkaufspreis ?? 0) * (pos.menge || 1)
    setEk(ekLine > 0 ? String(ekLine) : '')
    setMenge(String(pos.menge || 1))
    setEinheit(pos.einheit || 'Stk.')
  }, [open, pos])

  function save() {
    if (!pos) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Bezeichnung ist erforderlich.')
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
        toast.error(r.message)
        return
      }
      toast.success('Position gespeichert.')
      onSaved()
      onClose()
    })
  }

  if (!pos) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Position bearbeiten"
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
          <label className="input-label">Bezeichnung</label>
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
          <label className="input-label">Menge</label>
          <input
            type="number"
            className="input w-full"
            step="0.01"
            min="0.01"
            value={menge}
            onChange={(e) => setMenge(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label">Einheit</label>
          <input className="input w-full" value={einheit} onChange={(e) => setEinheit(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
