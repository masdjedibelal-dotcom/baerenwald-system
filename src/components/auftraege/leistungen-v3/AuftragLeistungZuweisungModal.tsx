'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import { zuweiseHandwerkerAnPositionenV3 } from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import type { AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'
import { handwerkerInitialen } from '@/components/auftraege/leistungen-v3/utils'

export function AuftragLeistungZuweisungModal({
  open,
  onClose,
  auftragId,
  positionIds,
  positionen,
  onDone,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionIds: string[]
  positionen: AuftragPosition[]
  onDone: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [ek, setEk] = useState('')
  const [selectedHwId, setSelectedHwId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [empfohlen, setEmpfohlen] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [alle, setAlle] = useState<HandwerkerGewerkListeEintrag[]>([])

  const selectedPositions = useMemo(
    () => positionen.filter((p) => positionIds.includes(p.id)),
    [positionen, positionIds]
  )

  const sample = selectedPositions[0]

  useEffect(() => {
    if (!open || !sample) return
    let cancelled = false
    setLoading(true)
    void listHandwerkerAuswahlFuerGewerk({
      gewerkId: null,
      gewerkSlug: sample.gewerk_slug,
    }).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        toast.error(r.message)
        setLoading(false)
        return
      }
      setEmpfohlen(r.empfohlen)
      setAlle(r.alle)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, sample])

  useEffect(() => {
    if (!open) {
      setEk('')
      setSelectedHwId(null)
    }
  }, [open])

  const merged = useMemo(() => [...empfohlen, ...alle], [empfohlen, alle])

  function confirm() {
    if (!selectedHwId) {
      toast.error('Bitte einen Handwerker auswählen.')
      return
    }
    const ekNum = ek.trim() ? Number(ek.replace(',', '.')) : null
    startTransition(async () => {
      const r = await zuweiseHandwerkerAnPositionenV3({
        auftragId,
        positionIds,
        handwerkerId: selectedHwId,
        ekNetto: ekNum != null && Number.isFinite(ekNum) ? ekNum : null,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(
        positionIds.length === 1
          ? 'Handwerker zugewiesen — noch nicht gesendet.'
          : `${r.updated} Leistungen zugewiesen — noch nicht gesendet.`
      )
      onDone()
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Handwerker zuweisen"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" onClick={confirm} disabled={pending || loading}>
            Zuweisen
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-bw-text">
          <span className="font-semibold">{positionIds.length}</span> Leistung
          {positionIds.length === 1 ? '' : 'en'} ausgewählt
          {sample ? (
            <span className="text-bw-text-muted"> · {sample.gewerk_name}</span>
          ) : null}
        </p>

        <div>
          <label className="input-label">Einkaufspreis (EK) netto</label>
          <div className="txt-prefix">
            <span className="prefix" aria-hidden>
              €
            </span>
            <input
              type="number"
              className="input"
              step="0.01"
              min="0"
              value={ek}
              onChange={(e) => setEk(e.target.value)}
              placeholder="optional"
            />
          </div>
          {positionIds.length > 1 ? (
            <p className="mt-1 text-xs text-bw-text-muted">
              Gilt für alle ausgewählten Leistungen gleichermaßen.
            </p>
          ) : null}
        </div>

        <div>
          <p className="input-label mb-2">Handwerker</p>
          {loading ? (
            <p className="text-sm text-bw-text-muted">Lade Handwerker…</p>
          ) : merged.length === 0 ? (
            <p className="text-sm text-bw-text-muted">Keine aktiven Handwerker gefunden.</p>
          ) : (
            <ul className="pos-v3-hw-list">
              {merged.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className={cn('pos-v3-hw-row', selectedHwId === h.id && 'pos-v3-hw-row--active')}
                    onClick={() => setSelectedHwId(h.id)}
                  >
                    <span className="pos-v3-hw-avatar" aria-hidden>
                      {handwerkerInitialen(h.name)}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block text-sm font-medium text-bw-text">{h.name}</span>
                      {h.firma ? (
                        <span className="block text-xs text-bw-text-muted">{h.firma}</span>
                      ) : null}
                      {h.telefon ? (
                        <span className="block text-[10px] text-bw-text-muted">{h.telefon}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="rounded-md border border-bw-border bg-bw-bg/60 px-3 py-2 text-xs text-bw-text-muted">
          Der Auftrag wird erst nach „An Handwerker senden“ übermittelt. Handwerker erhalten dann eine
          E-Mail.
        </p>
      </div>
    </Modal>
  )
}
