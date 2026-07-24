'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { notfallDirektBeauftragen } from '@/app/(dashboard)/auftraege/notfall-direkt-actions'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import type { PositionVerguetung } from '@/lib/auftraege/position-lebenszyklus'

/**
 * Dialog Notfall / Direkt beauftragen (§4): Partner + Stundensatz oder Festpreis.
 * Stunden werden nicht vorab erfasst — Abrechnung später über Rechnung / Bautagebuch.
 */
export function NotfallDirektBeauftragenModal({
  open,
  onClose,
  auftragId,
  leadId,
  gewerkName,
  variant = 'auftrag',
  onDone,
}: {
  open: boolean
  onClose: () => void
  auftragId?: string | null
  leadId?: string | null
  gewerkName?: string | null
  /** anfrage = „Notfall melden“ (legt Auftrag an); auftrag = bestehende Direkt-Beauftragung */
  variant?: 'auftrag' | 'anfrage'
  onDone?: (auftragId: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [handwerker, setHandwerker] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [hwId, setHwId] = useState('')
  const [verguetung, setVerguetung] = useState<PositionVerguetung>('aufwand')
  const [betrag, setBetrag] = useState('')

  const fromAnfrage = variant === 'anfrage'
  const title = fromAnfrage ? 'Notfall melden' : 'Direkt beauftragen'
  const submitLabel = fromAnfrage ? 'Auftrag anlegen' : 'Direkt beauftragen'
  const gewerkLabel = gewerkName?.trim() || 'Gewerk'

  useEffect(() => {
    if (!open) return
    setBetrag('')
    setVerguetung('aufwand')
    void listHandwerkerAuswahlFuerGewerk({}).then((r) => {
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      const list = [...r.empfohlen, ...r.alle]
      setHandwerker(list)
      if (list[0]?.id) setHwId((prev) => prev || list[0]!.id)
    })
  }, [open])

  if (!open) return null

  function submit() {
    if (!hwId) {
      toast.error('Bitte Partner wählen.')
      return
    }
    const betragNum = betrag.trim() ? Number(betrag.replace(',', '.')) : NaN
    if (!Number.isFinite(betragNum) || betragNum <= 0) {
      toast.error(
        verguetung === 'aufwand'
          ? 'Bitte Stundensatz angeben.'
          : 'Bitte Festpreis angeben.'
      )
      return
    }
    startTransition(async () => {
      const r = await notfallDirektBeauftragen({
        auftragId,
        leadId,
        handwerkerId: hwId,
        verguetung,
        betragNetto: betragNum,
        gewerkName: gewerkName ?? 'Allgemein',
        ohneDeckel: true,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(
        fromAnfrage
          ? 'Notfall-Auftrag angelegt'
          : 'Notfall direkt beauftragt (ohne Deckel)'
      )
      onClose()
      onDone?.(r.auftragId)
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4 p-1">
        <p className="text-[13px] text-bw-text-muted">
          {fromAnfrage
            ? `Aus der Anfrage wird direkt ein Auftrag mit Regie-Leistung „Notfalleinsatz [${gewerkLabel}]“ angelegt. Stunden später über Bautagebuch — daraus entsteht die Rechnung.`
            : `Notfall ohne Betragsdeckel. Es wird automatisch eine Regie-Position „Notfalleinsatz [${gewerkLabel}]“ angelegt. Stunden nicht vorab — Abrechnung über Rechnung.`}
        </p>

        <label className="block text-[12px] font-medium text-bw-text">
          Partner
          <select
            className="mt-1 w-full rounded-md border border-bw-border bg-white px-3 py-2 text-[13px]"
            value={hwId}
            onChange={(e) => setHwId(e.target.value)}
          >
            <option value="">— wählen —</option>
            {handwerker.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.firma ? ` · ${h.firma}` : ''}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-[12px] font-medium text-bw-text">Vergütung</legend>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="radio"
              name="verguetung"
              checked={verguetung === 'aufwand'}
              onChange={() => setVerguetung('aufwand')}
            />
            Nach Aufwand (Stundensatz)
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="radio"
              name="verguetung"
              checked={verguetung === 'festpreis'}
              onChange={() => setVerguetung('festpreis')}
            />
            Festpreis
          </label>
        </fieldset>

        {verguetung === 'aufwand' ? (
          <label className="block text-[12px] font-medium text-bw-text">
            Stundensatz netto (€)
            <input
              className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
              inputMode="decimal"
              value={betrag}
              onChange={(e) => setBetrag(e.target.value)}
              placeholder="z. B. 85"
              autoFocus
            />
          </label>
        ) : (
          <label className="block text-[12px] font-medium text-bw-text">
            Festpreis netto (€)
            <input
              className="mt-1 w-full rounded-md border border-bw-border px-3 py-2 text-[13px]"
              inputMode="decimal"
              value={betrag}
              onChange={(e) => setBetrag(e.target.value)}
              placeholder="z. B. 450"
              autoFocus
            />
          </label>
        )}

        <p className="rounded-md bg-emerald-50 px-3 py-2 text-[12px] text-emerald-900">
          Kein Deckel (DD-10). Keine Stunden im Voraus — Konditionen gehen an den Partner.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
