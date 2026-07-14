'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useMemo } from 'react'
import { Folders } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { EntityListShell } from '@/components/layout/app'
import { SearchInput } from '@/components/ui/SearchInput'
import {
  PHASE_LABELS,
  PHASE_UNTERSTATUS_VALUES,
  unterstatusLabel,
} from '@/lib/vorgang/vorgang-labels'
import {
  computeVorgaengeKpis,
  countVorgaengeByPhase,
} from '@/lib/vorgang/vorgaenge-kpis'
import type { VorgangListeRow } from '@/lib/vorgang/types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { cn, formatDatumZeit } from '@/lib/utils'

const GRID_COLS = 'minmax(88px,0.7fr) minmax(100px,0.8fr) minmax(1.6fr,2fr) minmax(140px,1fr)'

const KPI_ITEMS = [
  { key: 'neueAnfragen' as const, label: 'Neue Anfragen' },
  { key: 'offeneAngebote' as const, label: 'Offene Angebote' },
  { key: 'aktiveAuftraege' as const, label: 'Aktive Aufträge' },
  { key: 'offeneRechnungen' as const, label: 'Offene Rechnungen' },
]

const PHASE_CHIPS: Array<{ id: '' | VorgangPhase; label: string }> = [
  { id: '', label: 'Alle' },
  { id: 'anfrage', label: 'Anfrage' },
  { id: 'angebot', label: 'Angebot' },
  { id: 'auftrag', label: 'Auftrag' },
  { id: 'rechnung', label: 'Rechnung' },
]

function phaseBadgeClass(phase: VorgangPhase): string {
  switch (phase) {
    case 'anfrage':
      return 'badge badge-new'
    case 'angebot':
      return 'badge badge-offer'
    case 'auftrag':
      return 'badge badge-order'
    case 'rechnung':
      return 'badge badge-done'
    default:
      return 'badge badge-plain'
  }
}

function unterstatusClass(unterstatus: string): string {
  const u = unterstatus.toLowerCase()
  if (u === 'storniert' || u === 'abgebrochen') return 'badge badge-cancel'
  if (u === 'gesendet' || u === 'in_arbeit') return 'badge badge-contacted'
  if (u === 'bezahlt' || u === 'abgeschlossen') return 'badge badge-done'
  return 'badge badge-plain badge-no-dot'
}

export function VorgaengeListeClient({ rows }: { rows: VorgangListeRow[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phaseFilter = (searchParams.get('phase') ?? '') as '' | VorgangPhase
  const unterstatusFilter = (searchParams.get('unterstatus') ?? '').trim().toLowerCase()
  const query = (searchParams.get('q') ?? '').trim().toLowerCase()

  const kpis = useMemo(() => computeVorgaengeKpis(rows), [rows])
  const phaseCounts = useMemo(() => countVorgaengeByPhase(rows), [rows])

  const unterstatusCounts = useMemo(() => {
    if (!phaseFilter) return new Map<string, number>()
    const m = new Map<string, number>()
    for (const r of rows) {
      if (r.phase !== phaseFilter) continue
      const k = r.unterstatus.toLowerCase()
      m.set(k, (m.get(k) ?? 0) + 1)
    }
    return m
  }, [rows, phaseFilter])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (phaseFilter && r.phase !== phaseFilter) return false
      if (unterstatusFilter && r.unterstatus.toLowerCase() !== unterstatusFilter) return false
      if (!query) return true
      const hay = `${r.titel} ${r.kundeName ?? ''} ${r.unterstatusLabel} ${r.kanalMeta ?? ''}`.toLowerCase()
      return hay.includes(query)
    })
  }, [rows, phaseFilter, unterstatusFilter, query])

  function pushParams(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(searchParams.toString())
    mutate(p)
    router.push(`/vorgaenge?${p.toString()}`)
  }

  function setPhase(phase: '' | VorgangPhase) {
    pushParams((p) => {
      if (phase) p.set('phase', phase)
      else p.delete('phase')
      p.delete('unterstatus')
    })
  }

  function setUnterstatus(value: string) {
    pushParams((p) => {
      if (value) p.set('unterstatus', value)
      else p.delete('unterstatus')
    })
  }

  return (
    <EntityListShell
      className="min-h-0 flex-1"
      header={
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {KPI_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-bw-border bg-bw-card px-3 py-2.5 text-left"
              >
                <div className="text-xs text-bw-text-muted">{item.label}</div>
                <div className="text-xl font-semibold tabular-nums text-bw-text">{kpis[item.key]}</div>
              </div>
            ))}
          </div>

          <div className="tabs flex-wrap" role="tablist" aria-label="Phase filtern">
            {PHASE_CHIPS.map((chip) => {
              const active = phaseFilter === chip.id
              const count = chip.id ? phaseCounts[chip.id] : rows.length
              return (
                <button
                  key={chip.id || 'alle'}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPhase(chip.id)}
                  className={cn('tab', active && 'active')}
                >
                  {chip.label}
                  <span className="tab-count">{count}</span>
                </button>
              )
            })}
          </div>

          {phaseFilter ? (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Unterstatus filtern">
              <button
                type="button"
                onClick={() => setUnterstatus('')}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  !unterstatusFilter
                    ? 'border-bw-primary bg-bw-primary/10 text-bw-primary'
                    : 'border-bw-border bg-bw-card text-bw-text-muted hover:border-bw-primary/40'
                )}
              >
                Alle Unterstatus
              </button>
              {PHASE_UNTERSTATUS_VALUES[phaseFilter].map((u) => {
                const count = unterstatusCounts.get(u) ?? 0
                if (!count) return null
                const active = unterstatusFilter === u
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnterstatus(active ? '' : u)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      active
                        ? 'border-bw-primary bg-bw-primary/10 text-bw-primary'
                        : 'border-bw-border bg-bw-card text-bw-text-muted hover:border-bw-primary/40'
                    )}
                  >
                    {unterstatusLabel(phaseFilter, u)}
                    <span className="ml-1 tabular-nums opacity-70">{count}</span>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      }
      filters={
        <SearchInput
          value={searchParams.get('q') ?? ''}
          onChange={(v) => {
            const p = new URLSearchParams(searchParams.toString())
            if (v) p.set('q', v)
            else p.delete('q')
            router.replace(`/vorgaenge?${p.toString()}`)
          }}
          placeholder="Vorgänge durchsuchen…"
        />
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={Folders}
          title="Keine Vorgänge"
          description="Für diesen Filter gibt es noch keine Einträge."
        />
      ) : (
        <>
          <div
            className="hidden border-b border-bw-border bg-bw-bg px-4 py-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted lg:grid"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <div>Phase</div>
            <div>Unterstatus</div>
            <div>Vorgang</div>
            <div>Meta</div>
          </div>
          {filtered.map((row) => (
            <Link
              key={row.leadId}
              href={row.detailHref}
              className="block border-b border-bw-border px-4 py-3 transition-colors hover:bg-bw-hover"
            >
              <div
                className="grid w-full gap-2 lg:items-center"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div>
                  <span className={phaseBadgeClass(row.phase)}>{PHASE_LABELS[row.phase]}</span>
                </div>
                <div>
                  <span className={unterstatusClass(row.unterstatus)}>{row.unterstatusLabel}</span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-bw-text">{row.titel}</div>
                  {row.kundeName ? (
                    <div className="truncate text-xs text-bw-text-muted">{row.kundeName}</div>
                  ) : null}
                </div>
                <div className="text-xs text-bw-text-muted">
                  <div>{formatDatumZeit(row.updatedAt)}</div>
                  <div className="truncate">
                    {[row.kanalMeta, row.wertLabel, row.ueberfaellig ? 'Überfällig' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </>
      )}
    </EntityListShell>
  )
}
