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
  /** CTA-Label neben dem Hinweis (Default: „Dokument öffnen“) */
  dokumentActionLabel?: string
  /** Positionen nach Gewerk gruppieren (Mock Angebot) */
  groupByGewerk?: boolean
  /** Footer: Positionen · Netto · MwSt (statt nur Summe) */
  footerNettoMwst?: { netto: number; mwstSatz: number; mwstBetrag: number; brutto?: number } | null
  /** Sammelaktionen — nur Auftrag (Spec). */
  bulkActions?: LeistungenTabBulkAction[]
  drawerActionsForRow?: (row: LeistungRow) => LeistungDrawerAction[]
  /** z. B. Button „Tagebucheintrag“ unter der Tabelle */
  belowTable?: ReactNode
  emptyTitle?: string
  emptyHint?: string
}) {
  const isAuftrag = phase === 'auftrag'
  const isRechnung = phase === 'rechnung'
  const allowBulk = isAuftrag && (bulkActions?.length ?? 0) > 0
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

  const groupGewerk = groupByGewerk || isAuftrag || isRechnung
  const gewerkGroups = useMemo(() => {
    if (!groupGewerk) return null
    const map = new Map<string, LeistungRow[]>()
    for (const row of rows) {
      const key = row.gewerkName?.trim() || 'Allgemein'
      const list = map.get(key)
      if (list) list.push(row)
      else map.set(key, [row])
    }
    return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
  }, [groupGewerk, rows])

  /** Auftrag: Bezeichnung + Handwerker · Rechnung-Mock: Bezeichnung · Menge · Preis */
  const deskCols = useMemo(() => {
    if (isAuftrag) return ['bezeichnung', 'handwerker'] as ColId[]
    if (isRechnung) return ['bezeichnung', 'menge', 'preis'] as ColId[]
    const cols = ALL_COLS.filter((id) => visibleCols[id])
    if (groupByGewerk) return cols.filter((id) => id !== 'gewerk')
    return cols
  }, [visibleCols, groupByGewerk, isAuftrag, isRechnung])

  const erledigtCount = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.status === 'erledigt' ||
          r.status === 'abgenommen' ||
          r.statusLabel.toLowerCase().includes('abgenommen')
      ).length,
    [rows]
  )

  const cols = useMemo(() => {
    const parts: string[] = []
    if (allowBulk) parts.push('28px')
    for (const id of deskCols) {
      // Bezeichnung = flexible Restbreite (abschneiden); Neben-Spalten fest — kein Horizontalscroll
      if (id === 'bezeichnung') parts.push('minmax(0, 1fr)')
      else if (id === 'menge') parts.push('4.25rem')
      else if (id === 'preis') parts.push('5.5rem')
      else if (id === 'status') parts.push('6.75rem')
      else if (id === 'gewerk') parts.push('5.5rem')
      else if (id === 'handwerker') parts.push(isAuftrag ? 'minmax(7rem, 11rem)' : '5.75rem')
      else if (id === 'ek') parts.push('4rem')
    }
    return parts.join(' ')
  }, [allowBulk, deskCols, isAuftrag])

  const hint =
    dokumentHint ??
    (phase === 'rechnung'
      ? 'Positionen sind gestellt — Änderungen über eine Rechnungskorrektur.'
      : phase === 'angebot'
        ? 'Positionen änderst du im Dokument — nicht in dieser Tabelle.'
        : phase === 'anfrage'
          ? 'Verbindliche Leistungen entstehen erst mit dem Angebot — hier siehst du nur den Bedarf aus der Anfrage.'
          : null)

  const defaultDocActionLabel =
    phase === 'anfrage'
      ? 'Angebot erstellen'
      : phase === 'angebot'
        ? 'Im Angebot bearbeiten'
        : phase === 'rechnung'
          ? 'Rechnung korrigieren'
          : 'Dokument öffnen'
  const openDocLabel = dokumentActionLabel ?? defaultDocActionLabel

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

  function renderRow(row: LeistungRow) {
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
            const showStatus = isAuftrag || (!isRechnung && visibleCols.status)
            const showSub = Boolean(row.subline) && (isAuftrag || isRechnung || !groupGewerk)
            const statusKind =
              row.hatMangel || row.statusLabel.toLowerCase().includes('mangel')
                ? 'ueberfaellig'
                : row.status
            return (
              <div key={id} className="lt-main">
                <div className="lt-name">
                  <span className="lt-nametext">{row.bezeichnung}</span>
                  {showStatus ? (
                    <span className={cn('lt-status-inline', !isAuftrag && 'lt-status-mobile')}>
                      <StatusBadge status={statusKind} label={row.statusLabel} />
                    </span>
                  ) : null}
                </div>
                {showSub ? <div className="lt-sub">{row.subline}</div> : null}
                {!isAuftrag && !isRechnung ? (
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
                ) : isRechnung ? (
                  <div className="lt-mobile-foot lt-mobile-foot--rechnung">
                    <span>
                      <span className="lt-mobile-lbl">Menge</span> {row.mengeLabel}
                    </span>
                    <span>
                      <span className="lt-mobile-lbl">Preis</span> {row.preisLabel}
                    </span>
                  </div>
                ) : null}
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

  const toolbar = isAuftrag ? null : (
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
          {(isRechnung ? (['bezeichnung', 'menge', 'preis'] as ColId[]) : ALL_COLS).map((id) => (
            <label key={id} className="lt-cols-pop__row">
              <input
                type="checkbox"
                checked={isRechnung ? true : visibleCols[id]}
                disabled={id === 'bezeichnung' || isRechnung}
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
                {openDocLabel}
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

      {isRechnung ? (
        <div className="lt-sec-h">
          <span className="lt-sec-title">Leistungen</span>
          {toolbar}
        </div>
      ) : null}

      {hint ? (
        <div className="lt-hint">
          <Info className="h-4 w-4" aria-hidden />
          <span>{hint}</span>
          {onOpenDokument ? (
            <Button type="button" variant="secondary" className="!px-2 !py-1 text-[length:var(--fs-meta)]" onClick={onOpenDokument}>
              {isRechnung ? `✎ ${openDocLabel}` : openDocLabel}
            </Button>
          ) : null}
          {!isRechnung ? toolbar : null}
        </div>
      ) : toolbar && !isRechnung ? (
        <div className="lt-hint lt-hint--bare">{toolbar}</div>
      ) : null}

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
                  {g.items.map(renderRow)}
                </div>
              ))
            : rows.map(renderRow)}
        </div>
      </div>

      <div className="lt-foot">
        <div className="lt-foot-n">
          <span>
            {rows.length} Position{rows.length === 1 ? '' : 'en'}
            {isAuftrag ? (
              <>
                {' '}
                · {erledigtCount} erledigt
              </>
            ) : null}
          </span>
          {!isAuftrag && !isRechnung && !footerNettoMwst ? (
            <>
              <span className="sep">·</span>
              <span>
                Summe <b>{formatEurBetrag(summe)}</b>
              </span>
            </>
          ) : null}
          {!isAuftrag && !isRechnung && footerNettoMwst ? (
            <>
              <span className="sep">·</span>
              <span>
                Netto <b>{formatEurBetrag(footerNettoMwst.netto)}</b>
              </span>
              <span className="sep">·</span>
              <span>
                MwSt. {footerNettoMwst.mwstSatz}%{' '}
                <b>{formatEurBetrag(footerNettoMwst.mwstBetrag)}</b>
              </span>
            </>
          ) : null}
        </div>
        {(isAuftrag || isRechnung) && footerNettoMwst ? (
          <div className="lt-foot-sum">
            <div>
              <span>Netto</span>
              <b>{formatEurBetrag(footerNettoMwst.netto)}</b>
            </div>
            <div>
              <span>MwSt. {footerNettoMwst.mwstSatz} %</span>
              <b>{formatEurBetrag(footerNettoMwst.mwstBetrag)}</b>
            </div>
            <div className="lt-foot-brutto">
              <span>Brutto</span>
              <b>
                {formatEurBetrag(
                  footerNettoMwst.brutto ??
                    footerNettoMwst.netto + footerNettoMwst.mwstBetrag
                )}
              </b>
            </div>
          </div>
        ) : null}
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
                ...(onOpenDokument && phase !== 'auftrag'
                  ? [
                      {
                        id: 'dokument',
                        label:
                          phase === 'rechnung'
                            ? 'Rechnung korrigieren'
                            : phase === 'angebot'
                              ? 'Angebot öffnen'
                              : 'Angebot erstellen',
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
