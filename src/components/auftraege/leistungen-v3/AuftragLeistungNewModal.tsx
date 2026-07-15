'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { addAuftragPosition } from '@/app/(dashboard)/auftraege/actions'
import { sendAuftragLeistungenAnHandwerkerV3 } from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'

type GewerkOpt = { id: string; name: string; slug: string }

export function AuftragLeistungNewModal({
  open,
  onClose,
  auftragId,
  angebotId = null,
  projektName = 'Projekt',
  block,
  gewerke,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  angebotId?: string | null
  projektName?: string
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
  const [handwerkerId, setHandwerkerId] = useState('')
  const [hwLoading, setHwLoading] = useState(false)
  const [empfohlen, setEmpfohlen] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [alle, setAlle] = useState<HandwerkerGewerkListeEintrag[]>([])

  useEffect(() => {
    if (!open) return
    setName('')
    setBeschreibung('')
    setVk('')
    setEk('')
    setVon('')
    setBis('')
    setHandwerkerId('')
    setGewerkSlug(block?.gewerkSlug ?? gewerke[0]?.slug ?? '')
  }, [open, block, gewerke])

  const gewerkName =
    gewerke.find((g) => g.slug === gewerkSlug)?.name ?? block?.gewerkName ?? gewerkSlug

  const gewerkId = gewerke.find((g) => g.slug === gewerkSlug)?.id ?? null

  useEffect(() => {
    if (!open || !gewerkSlug) {
      setEmpfohlen([])
      setAlle([])
      return
    }
    let cancelled = false
    setHwLoading(true)
    void listHandwerkerAuswahlFuerGewerk({
      gewerkId,
      gewerkSlug,
    }).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        toast.error(r.message)
        setEmpfohlen([])
        setAlle([])
        setHwLoading(false)
        return
      }
      setEmpfohlen(r.empfohlen)
      setAlle(r.alle)
      setHwLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, gewerkId, gewerkSlug])

  const handwerkerOptions = useMemo(() => {
    const seen = new Set<string>()
    const merged: HandwerkerGewerkListeEintrag[] = []
    for (const h of [...empfohlen, ...alle]) {
      if (seen.has(h.id)) continue
      seen.add(h.id)
      merged.push(h)
    }
    return merged
  }, [empfohlen, alle])

  function save(andSend: boolean) {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Bezeichnung ist erforderlich.')
      return
    }
    if (!gewerkSlug.trim()) {
      toast.error('Bitte ein Gewerk wählen.')
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
    const hwId = handwerkerId.trim() || null

    if (andSend && !hwId) {
      toast.error('Für „Speichern & senden“ bitte einen Handwerker wählen.')
      return
    }

    startTransition(async () => {
      const r = await addAuftragPosition(auftragId, {
        leistung_name: trimmed,
        gewerk_name: gewerkName,
        gewerk_slug: gewerkSlug,
        gewerk_block_key: block?.key?.trim() || null,
        beschreibung: beschreibung.trim() || null,
        preis_fix: vkNum,
        preis_partner: ekNum != null && Number.isFinite(ekNum) ? ekNum : null,
        start_datum: von || null,
        end_datum: bis || null,
        handwerker_id: hwId,
        handwerker_status: hwId ? 'zugewiesen' : null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }

      if (andSend && hwId) {
        const send = await sendAuftragLeistungenAnHandwerkerV3({
          auftragId,
          angebotId,
          projektName,
          gewerke,
          positionIds: [r.id],
        })
        if (!send.ok) {
          toast.error(send.message)
          onSaved()
          onClose()
          return
        }
        toast.success('Leistung gespeichert und an Handwerker gesendet.')
      } else {
        toast.success(
          hwId ? 'Leistung hinzugefügt und Handwerker zugewiesen.' : 'Leistung hinzugefügt.'
        )
      }

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
          <Button type="button" variant="secondary" onClick={() => save(false)} disabled={pending}>
            Speichern
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => save(true)}
            disabled={pending || !handwerkerId.trim()}
          >
            Speichern & senden
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
              onChange={(e) => {
                setGewerkSlug(e.target.value)
                setHandwerkerId('')
              }}
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
          <label className="input-label" htmlFor="leistung-neu-handwerker">
            Handwerker
          </label>
          <select
            id="leistung-neu-handwerker"
            className="input w-full"
            value={handwerkerId}
            onChange={(e) => setHandwerkerId(e.target.value)}
            disabled={hwLoading || pending}
          >
            <option value="">
              {hwLoading ? 'Lade Handwerker…' : '— Handwerker wählen —'}
            </option>
            {empfohlen.length > 0 ? (
              <optgroup label="Empfohlen für dieses Gewerk">
                {empfohlen.map((h) => (
                  <option key={`emp-${h.id}`} value={h.id}>
                    {h.name}
                    {h.firma ? ` · ${h.firma}` : ''}
                    {!h.verfuegbar ? ' (belegt)' : ''}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {alle.length > 0 ? (
              <optgroup label={empfohlen.length > 0 ? 'Weitere Handwerker' : 'Alle Handwerker'}>
                {alle
                  .filter((h) => !empfohlen.some((e) => e.id === h.id))
                  .map((h) => (
                    <option key={`all-${h.id}`} value={h.id}>
                      {h.name}
                      {h.firma ? ` · ${h.firma}` : ''}
                      {!h.verfuegbar ? ' (belegt)' : ''}
                    </option>
                  ))}
              </optgroup>
            ) : null}
            {!hwLoading && handwerkerOptions.length === 0 ? (
              <option value="" disabled>
                Keine aktiven Handwerker
              </option>
            ) : null}
          </select>
          <p className="mt-1 text-xs text-bw-text-muted">
            Handwerker für diese Leistung wählen. Mit „Speichern & senden“ geht die Anfrage direkt
            ins Partner-Portal (Tab Offen/Anfragen). Ohne Handwerker nur speichern — Versand später
            über „An Handwerker senden“.
          </p>
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
