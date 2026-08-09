'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { addAngebotPosition } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import type { AngebotGewerkBlock } from '@/components/angebote/positionen-v3/utils'
import type { KostenVerteilung } from '@/lib/angebot-kosten-split'

type GewerkOpt = { id: string; name: string; slug: string }

const KOSTENART_OPTIONS: { value: KostenVerteilung; label: string }[] = [
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'lohn', label: 'Lohn' },
  { value: 'material', label: 'Material' },
]

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
  const [kostenverteilung, setKostenverteilung] = useState<KostenVerteilung>('allgemein')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setBeschreibung('')
    setVk('')
    setEk('')
    setMenge('1')
    setEinheit('Stk.')
    setKostenverteilung('allgemein')
    setGewerkSlug(block?.gewerkSlug ?? gewerke[0]?.slug ?? '')
    setDirty(false)
  }, [open, block, gewerke])

  function mark<T>(setter: (v: T) => void, v: T) {
    setter(v)
    setDirty(true)
  }

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
        kostenverteilung,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Position hinzugefügt.')
      setDirty(false)
      onSaved()
      onClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Position"
      context="detail"
      dirty={dirty}
      size="lg"
      confirmBusy={pending}
      onConfirm={save}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="input-label">Bezeichnung *</label>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => mark(setName, e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Gewerk *</label>
          {block ? (
            <p className="text-[length:var(--fs-text)] font-medium text-bw-text">{block.gewerkName}</p>
          ) : (
            <select
              className="input w-full"
              value={gewerkSlug}
              onChange={(e) => mark(setGewerkSlug, e.target.value)}
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
            onChange={(e) => mark(setBeschreibung, e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="input-label">Kostenart</label>
          <div className="seg" role="group" aria-label="Kostenart">
            {KOSTENART_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={kostenverteilung === opt.value ? 'on' : undefined}
                onClick={() => mark(setKostenverteilung, opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[length:var(--fs-meta)] text-bw-muted">
            Allgemein = keine Aufteilung im PDF; Lohn bzw. Material = Ausweis in der Kostenaufstellung
          </p>
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
              onChange={(e) => mark(setVk, e.target.value)}
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
              onChange={(e) => mark(setEk, e.target.value)}
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
            onChange={(e) => mark(setMenge, e.target.value)}
          />
        </div>
        <div>
          <label className="input-label">Einheit</label>
          <input
            className="input w-full"
            value={einheit}
            onChange={(e) => mark(setEinheit, e.target.value)}
          />
        </div>
      </div>
    </EditorSheet>
  )
}
