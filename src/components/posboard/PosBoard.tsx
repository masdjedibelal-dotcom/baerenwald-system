'use client'

import { UserPlus } from 'lucide-react'
import type { ReactNode } from 'react'
import { HandwerkerAntwortChip } from '@/components/auftraege/leistungen-v3/HandwerkerAntwortChip'
import type { AngebotPosition, AuftragPosition } from '@/lib/types'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'

export type PosBoardProps = {
  title?: string
  positionen: AngebotPosition[]
  onChange?: (next: AngebotPosition[]) => void
  readOnly?: boolean
  className?: string
  /** Auftrag-Modus: HW-Badge + Zuweisen pro Zeile (Spec §6). */
  auftragPositionen?: AuftragPosition[]
  onAssignHandwerker?: (positionIds: string[]) => void
  headerAction?: ReactNode
}

function lineTotal(p: AngebotPosition): number {
  const menge = Number(p.menge) || 0
  const einzel = Number(p.vk_netto ?? p.gesamt_min ?? 0)
  return menge * einzel
}

function auftragById(
  items: AuftragPosition[] | undefined
): Map<string, AuftragPosition> {
  const m = new Map<string, AuftragPosition>()
  for (const p of items ?? []) m.set(p.id, p)
  return m
}

/** PosBoard v2 — gruppiert nach Gewerk; optional HW-Zeilen im Auftrag. */
export function PosBoard({
  title = 'Leistungen',
  positionen,
  onChange: _onChange,
  readOnly = false,
  className,
  auftragPositionen,
  onAssignHandwerker,
  headerAction,
}: PosBoardProps) {
  const auftragMap = auftragById(auftragPositionen)
  const showHw = Boolean(auftragPositionen?.length && onAssignHandwerker)

  const groups = new Map<string, AngebotPosition[]>()
  for (const p of positionen) {
    const g = p.gewerk_name?.trim() || p.gewerk_id || 'Allgemein'
    const arr = groups.get(g) ?? []
    arr.push(p)
    groups.set(g, arr)
  }

  const netto = positionen.reduce((s, p) => s + lineTotal(p), 0)

  return (
    <section className={cn('rounded-xl border border-bw-border bg-bw-card', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-bw-border px-4 py-3">
        <h3 className="text-sm font-semibold text-bw-text">{title}</h3>
        {headerAction}
      </div>
      <div className="divide-y divide-bw-border">
        {Array.from(groups.entries()).map(([gewerk, items]) => (
          <div key={gewerk} className="px-4 py-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
              {gewerk}
            </div>
            <ul className="space-y-3">
              {items.map((p) => {
                const ap = auftragMap.get(p.id)
                return (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-bw-text">
                        {p.leistung_name || p.leistung || p.beschreibung || 'Position'}
                      </div>
                      <div className="text-xs text-bw-text-muted">
                        {p.menge} {p.einheit}
                      </div>
                      {showHw && ap ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {ap.handwerker?.name ? (
                            <span className="text-xs text-bw-text-muted">{ap.handwerker.name}</span>
                          ) : null}
                          <HandwerkerAntwortChip pos={ap} />
                          {!readOnly && onAssignHandwerker ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-bw-border px-2 py-0.5 text-[11px] font-medium text-bw-primary hover:bg-bw-hover"
                              onClick={() => onAssignHandwerker([ap.id])}
                            >
                              <UserPlus className="h-3 w-3" aria-hidden />
                              Zuweisen
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 font-medium tabular-nums text-bw-text">
                      {formatEurBetrag(lineTotal(p))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {positionen.length === 0 ? (
          <div className="px-4 py-6 text-sm text-bw-text-muted">Noch keine Positionen.</div>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-bw-border px-4 py-3 text-sm font-semibold text-bw-text">
        Netto {formatEurBetrag(netto)}
      </div>
    </section>
  )
}
