'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import {
  setWiedervorlage,
  type WiedervorlageEntity,
} from '@/app/(dashboard)/vorgaenge/wiedervorlage-actions'
import { formatDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'

function plusDaysYmd(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const QUICK: { label: string; days: number }[] = [
  { label: 'Morgen', days: 1 },
  { label: '3 Tage', days: 3 },
  { label: 'Woche', days: 7 },
  { label: '2 Wochen', days: 14 },
]

function isFaellig(datum: string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${datum.slice(0, 10)}T12:00:00`)
  return d.getTime() <= today.getTime()
}

/**
 * Phase 10 / Spec §12: Wiedervorlage-Chip mit Schnellwahl · Datum · Notiz.
 * Fällig → `.wv-chip.due` (Mock-gelb).
 */
export function WiedervorlageChip({
  datum,
  notiz,
  entity,
  entityId,
  className,
  onSaved,
  open: openControlled,
  onOpenChange,
}: {
  datum?: string | null
  notiz?: string | null
  entity?: WiedervorlageEntity
  entityId?: string | null
  className?: string
  onSaved?: () => void
  /** Menü ⋯ steuert Öffnen */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const editable = Boolean(entity && entityId)
  const [openUncontrolled, setOpenUncontrolled] = useState(false)
  const open = openControlled ?? openUncontrolled
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(open) : v
    onOpenChange?.(next)
    if (openControlled === undefined) setOpenUncontrolled(next)
  }
  const [draftDatum, setDraftDatum] = useState(datum?.slice(0, 10) || '')
  const [draftNotiz, setDraftNotiz] = useState(notiz?.trim() || '')
  const [pending, startTransition] = useTransition()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftDatum(datum?.slice(0, 10) || '')
    setDraftNotiz(notiz?.trim() || '')
  }, [datum, notiz])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const faellig = useMemo(() => (datum ? isFaellig(datum) : false), [datum])

  function save(nextDatum: string | null, nextNotiz: string | null) {
    if (!entity || !entityId) return
    startTransition(async () => {
      const r = await setWiedervorlage({
        entity,
        id: entityId,
        datum: nextDatum,
        notiz: nextNotiz,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(nextDatum ? 'Wiedervorlage gesetzt' : 'Wiedervorlage entfernt', {
        action: datum
          ? {
              label: 'Rückgängig',
              onClick: () => {
                void setWiedervorlage({
                  entity,
                  id: entityId,
                  datum: datum.slice(0, 10),
                  notiz: notiz ?? null,
                }).then(() => onSaved?.())
              },
            }
          : undefined,
      })
      setOpen(false)
      onSaved?.()
    })
  }

  const chip = (
    <button
      type="button"
      className={cn(
        'wv-chip',
        faellig && 'due',
        !datum && 'border-dashed bg-transparent',
        className
      )}
      title={notiz?.trim() || (editable ? 'Wiedervorlage setzen' : undefined)}
      onClick={() => editable && setOpen((v) => !v)}
      disabled={!editable}
    >
      <span aria-hidden>◷</span>
      <span className="truncate">{datum ? `WV ${formatDatum(datum)}` : 'WV setzen'}</span>
      {faellig ? <span className="font-semibold">fällig</span> : null}
    </button>
  )

  if (!editable) {
    if (!datum) return null
    return chip
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      {chip}
      {open ? (
        <div className="absolute left-0 top-full z-40 mt-1 w-[min(100vw-2rem,280px)] rounded-lg border border-bw-border bg-white p-3 shadow-lg">
          <p className="mb-2 text-[length:var(--fs-meta)] font-medium text-bw-text">Wiedervorlage</p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                className="rounded-full border border-bw-border px-2 py-0.5 text-[length:var(--fs-meta)] hover:bg-bw-surface-2"
                onClick={() => setDraftDatum(plusDaysYmd(q.days))}
              >
                {q.label}
              </button>
            ))}
          </div>
          <label className="mb-2 block text-[length:var(--fs-meta)] text-bw-text-muted">
            Datum
            <input
              type="date"
              className="mt-0.5 w-full rounded-md border border-bw-border px-2 py-1.5 text-[length:var(--fs-text)]"
              value={draftDatum}
              onChange={(e) => setDraftDatum(e.target.value)}
            />
          </label>
          <label className="mb-3 block text-[length:var(--fs-meta)] text-bw-text-muted">
            Notiz
            <input
              className="mt-0.5 w-full rounded-md border border-bw-border px-2 py-1.5 text-[length:var(--fs-text)]"
              value={draftNotiz}
              onChange={(e) => setDraftNotiz(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            {datum ? (
              <button
                type="button"
                className="text-[length:var(--fs-meta)] text-bw-text-muted underline"
                disabled={pending}
                onClick={() => save(null, null)}
              >
                Entfernen
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-md bg-bw-text px-2.5 py-1 text-[length:var(--fs-meta)] font-medium text-white disabled:opacity-50"
              disabled={pending || !draftDatum}
              onClick={() => save(draftDatum, draftNotiz || null)}
            >
              Speichern
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
