'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Info } from 'lucide-react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'
import { LeistungDrawer } from '@/components/leistungen/LeistungDrawer'
import type {
  LeistungDrawerAction,
  LeistungPhase,
  LeistungRow,
} from '@/components/leistungen/types'

export type LeistungenTabBulkAction = {
  id: 'zuweisen' | 'erledigt' | 'termin' | string
  label: string
  onClick: (selectedIds: string[]) => void
}

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

/** Mobile Auftrag: Zuweisungs-Dot (rot / gelb / grün). */
function handwerkerZuweisungTone(
  row: LeistungRow
): 'offen' | 'warten' | 'zugewiesen' {
  const anfrage = (row.anfrageStatusLabel ?? '').toLowerCase()
  if (anfrage.includes('anfrag') || anfrage.includes('wart')) return 'warten'
  if (row.handwerkerName?.trim()) return 'zugewiesen'
  return 'offen'
}

function handwerkerZuweisungLabel(
  row: LeistungRow,
  tone: ReturnType<typeof handwerkerZuweisungTone>
): string {
  const name = row.handwerkerName?.trim()
  if (tone === 'warten') return name || row.anfrageStatusLabel || 'Angefragt'
  if (tone === 'zugewiesen') return name || 'Zugewiesen'
  return 'Nicht zugewiesen'
}

/** Ampel für Leistungs-Phase: offen=rot · in Arbeit=gelb · erledigt=grün */
function leistungStatusAmpelKind(row: LeistungRow): string {
  const st = String(rowStatusKindStatic(row)).toLowerCase()
  if (st === 'ueberfaellig' || st.includes('mangel')) return 'storniert'
  if (st === 'erledigt' || st === 'abgenommen' || st === 'fertig') return 'aktiv'
  if (st === 'in_arbeit' || st === 'aktiv' || st === 'abnahme') return 'warten'
  return 'storniert'
}

function rowStatusKindStatic(row: LeistungRow) {
  return row.hatMangel || row.statusLabel.toLowerCase().includes('mangel')
    ? 'ueberfaellig'
    : row.status
}

/**
 * Spec §7 / Phase 6 — eine read-only Leistungen-Tabelle für alle Phasen.
 * Positionen ändern = zuständiges Dokument öffnen (Callback), nicht inline editieren.
 */
export function LeistungenTab({
  phase,
  rows,
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
  /** @deprecated Abnahme/Mängel nicht mehr in Leistungen */
  maengel?: unknown
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
  /** Optionaler Block unter der Tabelle */
  belowTable?: ReactNode
  emptyTitle?: string
  emptyHint?: string
}) {
  const isAuftrag = phase === 'auftrag'
  const isRechnung = phase === 'rechnung'
  const allowBulk = isAuftrag && (bulkActions?.length ?? 0) > 0
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [activeId, setActiveId] = useState<string | null>(null)
  const visibleCols = DEFAULT_VISIBLE
  const isMobile = useIsMobile()

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
      ? null
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

  function openRow(row: LeistungRow) {
    setActiveId(row.id)
  }

  function rowStatusKind(row: LeistungRow) {
    return rowStatusKindStatic(row)
  }

  function renderMobileCard(row: LeistungRow) {
    const selected = selectedIds.has(row.id)
    const showStatus = !isAuftrag && !isRechnung && visibleCols.status
    const showSub = Boolean(row.subline) && (isAuftrag || isRechnung || !groupGewerk)
    const showPreis = isRechnung || !isAuftrag || visibleCols.preis
    const showMenge = isRechnung || (!isAuftrag && visibleCols.menge)
    const hwTone = isAuftrag ? handwerkerZuweisungTone(row) : null

    return (
      <div
        key={row.id}
        className={cn('lt-card', selected && 'sel', allowBulk && 'lt-card--bulk')}
        role="button"
        tabIndex={0}
        onClick={() => openRow(row)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openRow(row)
          }
        }}
      >
        {allowBulk ? (
          <div
            className="lt-card__chk"
            onClick={(e) => toggleOne(row.id, e)}
            role="checkbox"
            aria-checked={selected}
          >
            <span className={cn('lt-box', selected && 'on')}>
              {selected ? <Check className="h-2.5 w-2.5" aria-hidden /> : null}
            </span>
          </div>
        ) : null}
        <div className="lt-card__body">
          <div className="lt-card__head">
            <span className="lt-card__title">{row.bezeichnung}</span>
            {showStatus ? (
              <StatusBadge
                status={rowStatusKind(row)}
                label={row.statusLabel}
                kind={leistungStatusAmpelKind(row)}
              />
            ) : null}
          </div>
          {showSub ? <div className="lt-card__sub">{row.subline}</div> : null}
          <div className="lt-card__meta">
            <div className="lt-card__meta-left">
              {isAuftrag && hwTone ? (
                <span
                  className="lt-card__hw"
                  title={handwerkerZuweisungLabel(row, hwTone)}
                >
                  <span
                    className={cn('lt-card__hw-dot', `lt-card__hw-dot--${hwTone}`)}
                    aria-hidden
                  />
                  <span className={cn(hwTone === 'offen' && 'lt-card__dim')}>
                    {handwerkerZuweisungLabel(row, hwTone)}
                  </span>
                </span>
              ) : (
                <>
                  {showMenge ? <span>{row.mengeLabel}</span> : null}
                  {!groupGewerk && row.gewerkName?.trim() ? (
                    <span className="lt-card__dim">{row.gewerkName.trim()}</span>
                  ) : null}
                </>
              )}
            </div>
            <div className="lt-card__meta-right">
              {showPreis ? <span className="lt-card__price">{row.preisLabel}</span> : null}
              <ChevronRight className="lt-card__chev h-4 w-4" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderMobileList() {
    return (
      <div className="lt-mobile">
        {allowBulk ? (
          <div className="lt-mobile-bulk-head">
            <div className="lt-chk" onClick={toggleAll} role="checkbox" aria-checked={selectedCount === rows.length}>
              <span className={cn('lt-box', selectedCount === rows.length && rows.length > 0 && 'on')}>
                {selectedCount === rows.length && rows.length > 0 ? (
                  <Check className="h-2.5 w-2.5" aria-hidden />
                ) : null}
              </span>
            </div>
            <span>Alle auswählen</span>
          </div>
        ) : null}
        {gewerkGroups
          ? gewerkGroups.map((g) => (
              <section key={g.name} className="lt-mobile-gewerk" aria-label={g.name}>
                <div className="lt-mobile-gewerk__head">
                  <span className="lt-mobile-gewerk__name">{g.name}</span>
                  <span className="lt-mobile-gewerk__count">{g.items.length}</span>
                </div>
                <div className="lt-mobile-gewerk__cards">{g.items.map(renderMobileCard)}</div>
              </section>
            ))
          : rows.map(renderMobileCard)}
      </div>
    )
  }

  function renderRow(row: LeistungRow) {
    const selected = selectedIds.has(row.id)
    return (
      <div
        key={row.id}
        className={cn('lt-row', selected && 'sel')}
        role="button"
        tabIndex={0}
        onClick={() => openRow(row)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openRow(row)
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
            const showStatus = !isAuftrag && !isRechnung && visibleCols.status
            const showSub = Boolean(row.subline) && (isAuftrag || isRechnung || !groupGewerk)
            return (
              <div key={id} className="lt-main">
                <div className="lt-name">
                  <span className="lt-nametext">{row.bezeichnung}</span>
                  {showStatus ? (
                    <span className={cn('lt-status-inline', !isAuftrag && 'lt-status-mobile')}>
                      <StatusBadge
                        status={rowStatusKind(row)}
                        label={row.statusLabel}
                        kind={leistungStatusAmpelKind(row)}
                      />
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
                <StatusBadge
                  status={rowStatusKind(row)}
                  label={row.statusLabel}
                  kind={leistungStatusAmpelKind(row)}
                />
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

  if (!rows.length) {
    return (
      <div className="lt-root space-y-3">
        <MockEmpty
          icon="clipboard-list"
          title={emptyTitle}
          hint={emptyHint ?? hint ?? undefined}
        />
        {belowTable}
      </div>
    )
  }

  return (
    <div className={cn('lt-root space-y-3', isMobile && 'lt-root--mobile-cards')}>
      {isRechnung || (isAuftrag && onOpenDokument) ? (
        <div className="lt-sec-h">
          <span className="lt-sec-title">Leistungen</span>
          <div className="lt-sec-h__actions">
            {onOpenDokument ? (
              <Button
                type="button"
                variant="secondary"
                className="lt-sec-edit"
                onClick={onOpenDokument}
              >
                {openDocLabel}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hint && !isAuftrag ? (
        <div className="lt-hint">
          <Info className="h-4 w-4" aria-hidden />
          <span>{hint}</span>
          {onOpenDokument && !isRechnung ? (
            <Button type="button" variant="secondary" className="!px-2 !py-1 text-[length:var(--fs-meta)]" onClick={onOpenDokument}>
              {openDocLabel}
            </Button>
          ) : null}
        </div>
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

      {isMobile ? (
        renderMobileList()
      ) : (
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
      )}

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
        ) : !isAuftrag && !isRechnung && footerNettoMwst ? (
          <div className="lt-foot-sum">
            <div>
              <span>Netto</span>
              <b>{formatEurBetrag(footerNettoMwst.netto)}</b>
            </div>
            <div>
              <span>MwSt. {footerNettoMwst.mwstSatz} %</span>
              <b>{formatEurBetrag(footerNettoMwst.mwstBetrag)}</b>
            </div>
            {footerNettoMwst.brutto != null ? (
              <div className="lt-foot-brutto">
                <span>Brutto</span>
                <b>{formatEurBetrag(footerNettoMwst.brutto)}</b>
              </div>
            ) : null}
          </div>
        ) : !isAuftrag && !isRechnung ? (
          <div className="lt-foot-sum">
            <div className="lt-foot-brutto">
              <span>Summe</span>
              <b>{formatEurBetrag(summe)}</b>
            </div>
          </div>
        ) : null}
      </div>

      {belowTable}

      <LeistungDrawer
        open={Boolean(activeRow)}
        onClose={() => setActiveId(null)}
        row={activeRow}
        actions={activeRow ? (drawerActionsForRow?.(activeRow) ?? []) : []}
      />
    </div>
  )
}
