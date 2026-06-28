'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { addAuftragPosition } from '@/app/(dashboard)/auftraege/actions'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'

type GewerkOpt = { id: string; name: string; slug: string }

export function AuftragLeistungNewModal({
  open,
  onClose,
  auftragId,
  block,
  gewerke,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  block: AuftragGewerkBlock | null
  gewerke: GewerkOpt[]
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [gewerkSlug, setGewerkSlug] = useState('')
  const [vk, setVk] = useState('')
  const [ek, setEk] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setBeschreibung('')
    setVk('')
    setEk('')
    setVon('')
    setBis('')
    setGewerkSlug(block?.gewerkSlug ?? gewerke[0]?.slug ?? '')
  }, [open, block, gewerke])

  const gewerkName =
    gewerke.find((g) => g.slug === gewerkSlug)?.name ?? block?.gewerkName ?? gewerkSlug

  function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Bezeichnung ist erforderlich.')
      return
    }
    if (!gewerkName.trim()) {
      toast.error('Gewerk ist erforderlich.')
      return
    }
    const vkNum = vk.trim() ? Number(vk.replace(',', '.')) : null
    if (vkNum == null || !Number.isFinite(vkNum) || vkNum <= 0) {
      toast.error('VK netto ist erforderlich.')
      return
    }
    const ekNum = ek.trim() ? Number(ek.replace(',', '.')) : null

    startTransition(async () => {
      const r = await addAuftragPosition(auftragId, {
        leistung_name: trimmed,
        gewerk_name: gewerkName,
        gewerk_slug: gewerkSlug || null,
        gewerk_block_key: block?.key ?? null,
        beschreibung: beschreibung.trim() || null,
        preis_fix: vkNum,
        preis_partner: ekNum != null && Number.isFinite(ekNum) ? ekNum : null,
        start_datum: von || null,
        end_datum: bis || null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Leistung hinzugefügt.')
      onSaved()
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Leistung hinzufügen"
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
          <label className="input-label">Von</label>
          <input type="date" className="input w-full" value={von} onChange={(e) => setVon(e.target.value)} />
        </div>
        <div>
          <label className="input-label">Bis</label>
          <input type="date" className="input w-full" value={bis} onChange={(e) => setBis(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
