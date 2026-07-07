'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { addAngebotPosition } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import type { AngebotGewerkBlock } from '@/components/angebote/positionen-v3/utils'

type GewerkOpt = { id: string; name: string; slug: string }

export function AngebotLeistungNewModal({
  open,
  onClose,
  angebotId,
  block,
  gewerke,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  angebotId: string
  block: AngebotGewerkBlock | null
  gewerke: GewerkOpt[]
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [gewerkSlug, setGewerkSlug] = useState('')
  const [vk, setVk] = useState('')
  const [ek, setEk] = useState('')
  const [menge, setMenge] = useState('1')
  const [einheit, setEinheit] = useState('Stk.')

  useEffect(() => {
    if (!open) return
    setName('')
    setBeschreibung('')
    setVk('')
    setEk('')
    setMenge('1')
    setEinheit('Stk.')
    setGewerkSlug(block?.gewerkSlug ?? gewerke[0]?.slug ?? '')
  }, [open, block, gewerke])

  const gewerk =
    gewerke.find((g) => g.slug === gewerkSlug) ??
    (block
      ? { id: block.gewerkId, name: block.gewerkName, slug: block.gewerkSlug ?? '' }
      : null)

  function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Bezeichnung ist erforderlich.')
      return
    }
    if (!gewerk?.slug) {
      toast.error('Bitte ein Gewerk wählen.')
      return
    }
    const vkNum = vk.trim() ? Number(vk.replace(',', '.')) : null
    if (vkNum == null || !Number.isFinite(vkNum) || vkNum <= 0) {
      toast.error('VK netto ist erforderlich.')
      return
    }
    const ekNum = ek.trim() ? Number(ek.replace(',', '.')) : null
    const mengeNum = menge.trim() ? Number(menge.replace(',', '.')) : 1

    startTransition(async () => {
      const r = await addAngebotPosition(angebotId, {
        leistung_name: trimmed,
        gewerk_id: gewerk.id,
        gewerk_name: gewerk.name,
        gewerk_slug: gewerk.slug,
        gewerk_block_key: block?.key?.trim() || null,
        beschreibung: beschreibung.trim() || null,
        vk_netto: vkNum,
        ek_netto: ekNum != null && Number.isFinite(ekNum) ? ekNum : null,
        menge: mengeNum > 0 ? mengeNum : 1,
        einheit: einheit.trim() || 'Stk.',
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Position hinzugefügt.')
      onSaved()
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Position hinzufügen"
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
          <label className="input-label">Bezeichnung *</label>
          <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Gewerk *</label>
          {block ? (
            <p className="text-sm font-medium text-bw-text">{block.gewerkName}</p>
          ) : (
            <select
              className="input w-full"
              value={gewerkSlug}
              onChange={(e) => setGewerkSlug(e.target.value)}
            >
              {gewerke.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Beschreibung</label>
          <textarea
            className="input w-full min-h-[4rem]"
            value={beschreibung}
            onChange={(e) => setBeschreibung(e.target.value)}
          />
        </div>
        <div>
          <label className="input-label">VK netto *</label>
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
