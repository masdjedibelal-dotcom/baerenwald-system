'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Info, MoreHorizontal } from 'lucide-react'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'
import { LeistungDrawer } from '@/components/leistungen/LeistungDrawer'
import { LeistungenMaengelCard } from '@/components/leistungen/LeistungenMaengelCard'
import type {
  LeistungDrawerAction,
  LeistungMangelAnzeige,
  LeistungPhase,
  LeistungRow,
} from '@/components/leistungen/types'

export type LeistungenTabBulkAction = {
  id: 'zuweisen' | 'erledigt' | 'termin' | string
  label: string
  onClick: (selectedIds: string[]) => void
}

const LS_KEY = 'crm.cols.leistungen.v1'

type ColId = 'bezeichnung' | 'menge' | 'preis' | 'status' | 'gewerk' | 'handwerker' | 'ek'

const CORE_COLS: ColId[] = ['bezeichnung', 'menge', 'preis', 'status']
const OPTIONAL_COLS: ColId[] = ['gewerk', 'handwerker', 'ek']
const ALL_COLS: ColId[] = [...CORE_COLS, ...OPTIONAL_COLS]

const COL_LABELS: Record<ColId, string> = {
  bezeichnung: 'Bezeichnung',
  menge: 'Menge',
  preis: 'Preis',
  status: 'Status',
  gewerk: 'Gewerk',
  handwerker: 'Handwerker',
  ek: 'EK',
}

const DEFAULT_VISIBLE: Record<ColId, boolean> = {
  bezeichnung: true,
  menge: true,
  preis: true,
  status: true,
  gewerk: false,
  handwerker: false,
  ek: false,
}

function loadVisible(): Record<ColId, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_VISIBLE }
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_VISIBLE }
    const parsed = JSON.parse(raw) as Partial<Record<ColId, boolean>>
    const next = { ...DEFAULT_VISIBLE }
    for (const id of ALL_COLS) {
      if (typeof parsed[id] === 'boolean') next[id] = parsed[id]!
    }
    // Kernspalten bleiben immer anwählbar, Default an — Nutzer darf ausblenden außer Bezeichnung
    next.bezeichnung = true
    return next
  } catch {
    return { ...DEFAULT_VISIBLE }
  }
}

/**
 * Spec §7 / Phase 6 — eine read-only Leistungen-Tabelle für alle Phasen.
 * Positionen ändern = zuständiges Dokument öffnen (Callback), nicht inline editieren.
 * N4: Spalten-⋯ mit localStorage-Persistenz.
 */
export function LeistungenTab({
  phase,
  rows,
  maengel = [],
  onOpenDokument,
  dokumentHint,
  dokumentActionLabel,
  groupByGewerk = false,
  footerNettoMwst,
  bulkActions,
  drawerActionsForRow,
  belowTable,
  emptyTitle = 'Noch keine Leistungen',
  emptyHint,
}: {
  phase: LeistungPhase
  rows: LeistungRow[]
  maengel?: LeistungMangelAnzeige[]
  /** Öffnet Angebots-/Rechnungs-Canvas (read-only Tab schreibt nicht). */
  onOpenDokument?: () => void
  dokumentHint?: string | null
  /** CTA-Label für onOpenDokument (Empty/Hint/Drawer). */
  dokumentActionLabel?: string | null
  /** Positionen nach Gewerk gruppieren */
  groupByGewerk?: boolean
  /** Footer: Netto · MwSt (statt nur Summe) */
  footerNettoMwst?: {
    netto: number
    mwstSatz: number
    mwstBetrag: number
    brutto?: number
  } | null
  /** Sammelaktionen — nur Auftrag (Spec). */
  bulkActions?: LeistungenTabBulkAction[]
  drawerActionsForRow?: (row: LeistungRow) => LeistungDrawerAction[]
  /** z. B. Button „Tagebucheintrag“ unter der Tabelle */
  belowTable?: ReactNode
  emptyTitle?: string
  emptyHint?: string
}) {
  const allowBulk = phase === 'auftrag' && (bulkActions?.length ?? 0) > 0
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [visibleCols, setVisibleCols] = useState<Record<ColId, boolean>>(DEFAULT_VISIBLE)
  const [colsOpen, setColsOpen] = useState(false)

  useEffect(() => {
    setVisibleCols(loadVisible())
  }, [])

  function persistCols(next: Record<ColId, boolean>) {
    setVisibleCols(next)
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(next))
    } catch {
      /* ignore quota */
    }
  }

  function toggleCol(id: ColId) {
    if (id === 'bezeichnung') return
    persistCols({ ...visibleCols, [id]: !visibleCols[id] })
  }

  const activeRow = useMemo(
    () => (activeId ? rows.find((r) => r.id === activeId) ?? null : null),
    [activeId, rows]
  )

  const summe = useMemo(
    () => rows.reduce((s, r) => s + (Number.isFinite(r.preisValue) ? r.preisValue : 0), 0),
    [rows]
  )

  const gewerkGroups = useMemo(() => {
    if (!groupByGewerk) return null
    const map = new Map<string, LeistungRow[]>()
    for (const row of rows) {
      const key = row.gewerkName?.trim() || 'Allgemein'
      const list = map.get(key)
      if (list) list.push(row)
      else map.set(key, [row])
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
  }, [groupByGewerk, rows])

  const deskCols = useMemo(() => {
    const cols = ALL_COLS.filter((id) => visibleCols[id])
    if (groupByGewerk) return cols.filter((id) => id !== 'gewerk')
    return cols
  }, [visibleCols, groupByGewerk])

  const cols = useMemo(() => {
    const parts: string[] = []
    if (allowBulk) parts.push('auto')
    for (const id of deskCols) {
      if (id === 'bezeichnung') parts.push('minmax(140px, 1.6fr)')
      else if (id === 'menge') parts.push('minmax(72px, 0.6fr)')
      else if (id === 'preis') parts.push('minmax(88px, 0.7fr)')
      else if (id === 'status') parts.push('minmax(88px, 0.7fr)')
      else if (id === 'gewerk') parts.push('minmax(100px, 0.9fr)')
      else if (id === 'handwerker') parts.push('minmax(100px, 0.9fr)')
      else if (id === 'ek') parts.push('minmax(72px, 0.6fr)')
    }
    return parts.join(' ')
  }, [allowBulk, deskCols])

  const hint = dokumentHint?.trim() || null

  const dokLabel =
    dokumentActionLabel?.trim() ||
    (phase === 'rechnung'
      ? 'Rechnung öffnen'
      : phase === 'angebot'
        ? 'Angebot öffnen'
        : phase === 'auftrag'
          ? 'Dokument öffnen'
          : phase === 'anfrage'
            ? 'Angebot erstellen'
            : 'Dokument öffnen')

  function toggleOne(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!allowBulk) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (!allowBulk) return
    setSelectedIds((prev) => {
      if (prev.size === rows.length) return new Set()
      return new Set(rows.map((r) => r.id))
    })
  }

  const selectedCount = selectedIds.size

  function renderLeistungRow(row: LeistungRow) {
    const selected = selectedIds.has(row.id)
    return (
      <div
        key={row.id}
        className={cn('lt-row', selected && 'sel')}
        role="button"
        tabIndex={0}
        onClick={() => setActiveId(row.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setActiveId(row.id)
          }
        }}
      >
        {allowBulk ? (
          <div
            className="lt-chk"
            onClick={(e) => toggleOne(row.id, e)}
            role="checkbox"
            aria-checked={selected}
          >
            <span className={cn('lt-box', selected && 'on')}>
              {selected ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
            </span>
          </div>
        ) : null}
        {deskCols.map((id) => {
          if (id === 'bezeichnung') {
            return (
              <div key={id} className="lt-main">
                <div className="lt-name">
                  <span className="lt-nametext">{row.bezeichnung}</span>
                  {visibleCols.status ? (
                    <span className="lt-status-mobile">
                      <StatusBadge status={row.status} label={row.statusLabel} />
                    </span>
                  ) : null}
                </div>
                {row.subline ? <div className="lt-sub">{row.subline}</div> : null}
                <div className="lt-mobile-foot">
                  {visibleCols.menge ? (
                    <span>
                      <span className="lt-mobile-lbl">Menge</span> {row.mengeLabel}
                    </span>
                  ) : null}
                  {visibleCols.preis ? (
                    <span>
                      <span className="lt-mobile-lbl">Preis</span> {row.preisLabel}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          }
          if (id === 'menge') {
            return (
              <div key={id} className="lt-c num lt-desk">
                {row.mengeLabel}
              </div>
            )
          }
          if (id === 'preis') {
            return (
              <div key={id} className="lt-c num lt-preis lt-desk">
                {row.preisLabel}
              </div>
            )
          }
          if (id === 'status') {
            return (
              <div key={id} className="lt-c lt-desk">
                <StatusBadge status={row.status} label={row.statusLabel} />
              </div>
            )
          }
          if (id === 'gewerk') {
            return (
              <div key={id} className="lt-c lt-desk lt-dim">
                {row.gewerkName?.trim() || '—'}
              </div>
            )
          }
          if (id === 'handwerker') {
            return (
              <div key={id} className="lt-c lt-desk lt-dim">
                {row.handwerkerName?.trim() || '—'}
              </div>
            )
          }
          return (
            <div key={id} className="lt-c num lt-desk lt-dim">
              {row.ekLabel?.trim() || '—'}
            </div>
          )
        })}
      </div>
    )
  }

  const toolbar = (
    <div className="lt-toolbar">
      <button
        type="button"
        className="lt-cols-btn"
        aria-label="Spalten"
        aria-expanded={colsOpen}
        title="Spalten"
        onClick={() => setColsOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {colsOpen ? (
        <div className="lt-cols-pop" role="menu" aria-label="Sichtbare Spalten">
          <div className="lt-cols-pop__title">Spalten</div>
          {ALL_COLS.map((id) => (
            <label key={id} className="lt-cols-pop__row">
              <input
                type="checkbox"
                checked={visibleCols[id]}
                disabled={id === 'bezeichnung'}
                onChange={() => toggleCol(id)}
              />
              <span>
                {COL_LABELS[id]}
                {OPTIONAL_COLS.includes(id) ? (
                  <span className="lt-cols-pop__opt"> optional</span>
                ) : null}
              </span>
            </label>
          ))}
          <button type="button" className="lt-cols-pop__done" onClick={() => setColsOpen(false)}>
            Fertig
          </button>
        </div>
      ) : null}
    </div>
  )

  if (!rows.length) {
    return (
      <div className="lt-root space-y-3">
        <LeistungenMaengelCard maengel={maengel} />
        <MockEmpty
          icon="clipboard-list"
          title={emptyTitle}
          hint={emptyHint ?? hint ?? undefined}
          action={
            onOpenDokument ? (
              <Button type="button" variant="secondary" onClick={onOpenDokument}>
                {dokLabel}
              </Button>
            ) : undefined
          }
        />
        {belowTable}
      </div>
    )
  }

  return (
    <div className="lt-root space-y-3">
      <LeistungenMaengelCard maengel={maengel} />

      {hint ? (
        <div className="lt-hint">
          <Info className="h-4 w-4" aria-hidden />
          <span>{hint}</span>
          {onOpenDokument ? (
            <Button type="button" variant="ghost" className="!px-2 !py-1 text-[length:var(--fs-meta)]" onClick={onOpenDokument}>
              {dokLabel}
            </Button>
          ) : null}
          {toolbar}
        </div>
      ) : (
        <div className="lt-hint lt-hint--bare">{toolbar}</div>
      )}

      {allowBulk && selectedCount > 0 ? (
        <div className="lt-bulk" role="toolbar" aria-label="Sammelaktionen">
          <span className="lt-bulk-n">{selectedCount} ausgewählt</span>
          {bulkActions!.map((a) => (
            <Button
              key={a.id}
              type="button"
              variant="secondary"
              onClick={() => a.onClick(Array.from(selectedIds))}
            >
              {a.label}
            </Button>
          ))}
          <Button type="button" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Aufheben
          </Button>
        </div>
      ) : null}

      <div className="lt-wrap">
        <div className="lt" style={{ ['--lt-cols' as string]: cols }}>
          <div className="lt-row head" role="row">
            {allowBulk ? (
              <div className="lt-chk" onClick={toggleAll} role="columnheader">
                <span className={cn('lt-box', selectedCount === rows.length && rows.length > 0 && 'on')}>
                  {selectedCount === rows.length && rows.length > 0 ? (
                    <Check className="h-2.5 w-2.5" aria-hidden />
                  ) : null}
                </span>
              </div>
            ) : null}
            {deskCols.map((id) => (
              <div
                key={id}
                className={cn(
                  (id === 'menge' || id === 'preis' || id === 'ek') && 'num'
                )}
              >
                {COL_LABELS[id]}
              </div>
            ))}
          </div>

          {gewerkGroups
            ? gewerkGroups.map((g) => (
                <div key={g.name} className="lt-group">
                  <div className="lt-grouphead">
                    <span className="g-name">{g.name.toUpperCase()}</span>
                    <span className="g-meta">{g.items.length}</span>
                  </div>
                  {g.items.map(renderLeistungRow)}
                </div>
              ))
            : rows.map(renderLeistungRow)}
        </div>
      </div>

      <div className="lt-foot">
        <div className="lt-foot-n">
          <span>
            {rows.length} Leistung{rows.length === 1 ? '' : 'en'}
          </span>
        </div>
        {footerNettoMwst ? (
          <div className="lt-foot-sum">
            <div>
              <span>Netto</span>
              <b>{formatEurBetrag(footerNettoMwst.netto)}</b>
            </div>
            <div>
              <span>MwSt. {footerNettoMwst.mwstSatz} %</span>
              <b>{formatEurBetrag(footerNettoMwst.mwstBetrag)}</b>
            </div>
            {footerNettoMwst.brutto != null || phase === 'auftrag' || phase === 'rechnung' ? (
              <div className="lt-foot-brutto">
                <span>Brutto</span>
                <b>
                  {formatEurBetrag(
                    footerNettoMwst.brutto ??
                      footerNettoMwst.netto + footerNettoMwst.mwstBetrag
                  )}
                </b>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="lt-foot-sum">
            <div className="lt-foot-brutto">
              <span>Summe</span>
              <b>{formatEurBetrag(summe)}</b>
            </div>
          </div>
        )}
      </div>

      {belowTable}

      <LeistungDrawer
        open={Boolean(activeRow)}
        onClose={() => setActiveId(null)}
        row={activeRow}
        actions={
          activeRow
            ? [
                ...(drawerActionsForRow?.(activeRow) ?? []),
                ...(onOpenDokument
                  ? [
                      {
                        id: 'dokument',
                        label: dokLabel,
                        variant: 'primary' as const,
                        onClick: () => {
                          setActiveId(null)
                          onOpenDokument()
                        },
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </div>
  )
}
