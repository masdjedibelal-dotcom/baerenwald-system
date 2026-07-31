'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import {
  angebotNrAnzeige,
  angebotStatusKurz,
  auftragStatusKurz,
  formatEurKurz,
  rechnungStatusKurz,
} from '@/lib/vorgang/projekt-kontext-labels'
import { hrefWithAkteFrom, type AkteFromRef } from '@/lib/vorgang/akte-from'
import { resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
import { buildAnfragePhaseSheetProps } from '@/lib/anfragen/funnel-bedarf-rows'
import { formatDatum, kanalLabel, cn } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'

type PhaseKind = 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'
type PhaseState = 'done' | 'current' | 'open'

type PhaseRowModel = {
  kind: PhaseKind
  label: string
  state: PhaseState
  kopf: string
  sub?: string | null
  betrag?: string | null
  href: string | null
  sheetTitle: string
  /** Breadcrumb über dem Sheet-Titel (Mock: „RE-… >“) */
  sheetCrumb?: string | null
  props: { k: string; v: string }[]
}

export type VorgangPhasenExtras = {
  auftrag?: {
    kopf?: string
    sub?: string
    betrag?: string | null
    props?: { k: string; v: string }[]
  }
  rechnung?: {
    kopf?: string
    sub?: string
    betrag?: string | null
    props?: { k: string; v: string }[]
    sheetCrumb?: string | null
    sheetTitle?: string
  }
}

function hasAngebotRecord(
  a: ProjektKontext['angebote'][number] | undefined
): a is ProjektKontext['angebote'][number] {
  return Boolean(a?.id)
}

function hasRealAngebotNummer(a: ProjektKontext['angebote'][number] | undefined): boolean {
  return Boolean(a?.angebotsnr?.trim())
}

/**
 * Mock „Verlauf des Vorgangs“ —
 * Desktop: vertikale Timeline · Mobil: horizontale Strip-Karten (aktuell zuerst sichtbar).
 */
export function VorgangPhasenVerlauf({
  kontext,
  fromRef,
  lead,
  onSaved: _onSaved,
  extras,
  className,
}: {
  kontext: ProjektKontext | null | undefined
  fromRef?: AkteFromRef | null
  lead?: LeadDetail | null
  onSaved?: () => void
  extras?: VorgangPhasenExtras
  className?: string
}) {
  void _onSaved
  const router = useRouter()
  const isMobile = useIsMobile()
  const [readKind, setReadKind] = useState<PhaseKind | null>(null)
  const [showEarlier, setShowEarlier] = useState(false)
  const [navBusy, setNavBusy] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const currentCardRef = useRef<HTMLDivElement>(null)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const withFrom = (pathname: string, extra?: Record<string, string>) => {
    if (fromRef) return hrefWithAkteFrom(pathname, fromRef, extra)
    if (!extra) return pathname
    const q = new URLSearchParams(extra)
    const qs = q.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  const rows = useMemo(
    () => buildPhaseRows(kontext, lead ?? null, withFrom, extras),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- withFrom stable via fromRef
    [kontext, lead, fromRef, extras]
  )

  const currentIdx = rows.findIndex((r) => r.state === 'current')
  const collapseFrom =
    !isMobile && (fromRef?.kind === 'auftrag' || fromRef?.kind === 'rechnung')
      ? Math.max(0, currentIdx)
      : 0
  const earlierCount = collapseFrom
  const visibleRows =
    showEarlier || earlierCount <= 0 ? rows : rows.slice(collapseFrom)

  const active = rows.find((r) => r.kind === readKind) ?? null

  /* Mobil: aktuelle Phase als erstes im Strip sichtbar (Timeline-Reihenfolge bleibt) */
  useEffect(() => {
    if (!isMobile || currentIdx < 0) return
    const scroller = stripRef.current
    const card = currentCardRef.current
    if (!scroller || !card) return
    const frame = window.requestAnimationFrame(() => {
      const left = Math.max(0, card.offsetLeft - 14)
      scroller.scrollTo({ left, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isMobile, currentIdx, rows])

  function openRow(row: PhaseRowModel) {
    if (row.state === 'open') return
    setReadKind(row.kind)
  }

  function closeRead() {
    setReadKind(null)
  }

  function navigateFromPhaseSheet(href: string | null | undefined, label: string) {
    if (navBusy) return
    const target = (href ?? '').trim()
    if (!target) {
      toast.error(`${label} ist noch nicht verfügbar.`)
      return
    }
    setNavBusy(true)
    actionBusy.show('Phase wird geladen…')
    if (navTimerRef.current) clearTimeout(navTimerRef.current)
    navTimerRef.current = setTimeout(() => {
      setNavBusy(false)
      actionBusy.hide()
      toast.error('Laden dauert zu lange — bitte erneut versuchen.')
    }, 10000)
    try {
      // Sheet ohne History-Back schließen, sonst frisst history.back() die Navigation
      setReadKind(null)
      router.push(target)
    } catch (e) {
      setNavBusy(false)
      actionBusy.hide()
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
      toast.error(e instanceof Error ? e.message : 'Navigation fehlgeschlagen.')
    }
  }

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current)
    }
  }, [])

  function onZurPhase() {
    navigateFromPhaseSheet(active?.href, active?.label ?? 'Phase')
  }

  return (
    <>
      <div className={cn('card', className)}>
        <div className="card-h">
          <div className="card-title title">Verlauf des Vorgangs</div>
        </div>
        <div className="card-b">
          {isMobile ? (
            <div
              ref={stripRef}
              className="vgp-strip"
              role="list"
              aria-label="Phasenverlauf"
            >
              {rows.map((row, i) => {
                const clickable = row.state !== 'open'
                return (
                  <div
                    key={row.kind}
                    ref={row.state === 'current' ? currentCardRef : undefined}
                    role="listitem"
                    className={cn('vgp-strip-item', row.state)}
                  >
                    {i > 0 ? <span className="vgp-strip-rail" aria-hidden /> : null}
                    <button
                      type="button"
                      className="vgp-strip-card"
                      disabled={!clickable}
                      onClick={() => openRow(row)}
                      aria-current={row.state === 'current' ? 'step' : undefined}
                      aria-label={`${row.label}: ${row.kopf}`}
                    >
                      <span className="vgp-strip-dot" aria-hidden />
                      <span className="vgp-strip-label">{row.label}</span>
                      <span
                        className={cn(
                          'vgp-strip-kopf',
                          row.state === 'open' && 'vgp-leer'
                        )}
                      >
                        {row.kopf}
                      </span>
                      {row.betrag ? (
                        <span className="vgp-strip-betrag">{row.betrag}</span>
                      ) : null}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {earlierCount > 0 && !showEarlier ? (
                <button
                  type="button"
                  className="vgp-earlier"
                  onClick={() => setShowEarlier(true)}
                >
                  <ChevronRight size={14} aria-hidden />
                  {earlierCount} frühere Phasen anzeigen
                </button>
              ) : null}
              {earlierCount > 0 && showEarlier ? (
                <button
                  type="button"
                  className="vgp-earlier"
                  onClick={() => setShowEarlier(false)}
                >
                  Frühere Phasen ausblenden
                </button>
              ) : null}
              <div className="vgp-list" role="list">
                {visibleRows.map((row, i) => {
                  const isLast = i === visibleRows.length - 1
                  const clickable = row.state !== 'open'
                  return (
                    <div
                      key={row.kind}
                      role="listitem"
                      className={cn('vgp', row.state, isLast && 'last')}
                    >
                      <button
                        type="button"
                        className="vgp-head"
                        disabled={!clickable}
                        onClick={() => openRow(row)}
                        aria-label={`${row.label}: ${row.kopf}`}
                      >
                        <span className="vgp-rail" aria-hidden>
                          <span className="vgp-dot" />
                        </span>
                        <span className="vgp-body">
                          <span className="vgp-top">
                            <span className="vgp-label">{row.label}</span>
                            <span
                              className={cn(
                                'vgp-kopf',
                                row.state === 'open' && 'vgp-leer'
                              )}
                            >
                              {row.kopf}
                            </span>
                            {row.betrag ? (
                              <span className="vgp-betrag">{row.betrag}</span>
                            ) : null}
                          </span>
                          {row.sub ? <span className="vgp-sub">{row.sub}</span> : null}
                        </span>
                        {clickable ? (
                          <ChevronRight className="vgp-chv" size={16} aria-hidden />
                        ) : null}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <EditorSheet
        open={Boolean(active)}
        onClose={closeRead}
        title={active?.sheetTitle ?? ''}
        crumb={active?.sheetCrumb ?? null}
        size="lg"
        manageHistory={false}
        headerEnd={
          active?.href && fromRef?.kind !== active.kind ? (
            <button
              type="button"
              className="btn primary sm"
              onClick={onZurPhase}
              disabled={navBusy}
            >
              {navBusy ? 'Laden…' : 'Zur Phase'}
            </button>
          ) : null
        }
      >
        {active ? (
          <div className="phase-sheet-props props">
            {active.props.map((p) => (
              <div key={p.k} className="prop">
                <span className="k">{p.k}</span>
                <span className="v" style={{ whiteSpace: 'pre-wrap' }}>
                  {p.v}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}

function buildPhaseRows(
  kontext: ProjektKontext | null | undefined,
  lead: LeadDetail | null,
  withFrom: (pathname: string, extra?: Record<string, string>) => string,
  extras?: VorgangPhasenExtras
): PhaseRowModel[] {
  const angebot = kontext?.angebote[0]
  const hasAngebot = hasAngebotRecord(angebot)
  const auftrag = kontext?.auftrag ?? null
  const rechnungen = kontext?.rechnungen ?? []
  const latestRe = kontext
    ? [...rechnungen].sort((a, b) =>
        String(b.rechnungsdatum || b.created_at || '').localeCompare(
          String(a.rechnungsdatum || a.created_at || '')
        )
      )[0]
    : undefined
  const hasRechnung = Boolean(latestRe)
  const aktiveRechnungen = rechnungen.filter(
    (r) => String(r.status).toLowerCase() !== 'storniert'
  )

  const budget = lead
    ? resolveLeadPreisAnzeige(
        lead.kanal,
        lead.budget_ca,
        lead.preis_min,
        lead.preis_max,
        lead.funnel_daten
      )
    : '—'

  const anfrageTitel =
    kontext?.lead?.label?.trim() ||
    lead?.situation?.trim() ||
    'Anfrage'
  const leadId = lead?.id ?? kontext?.lead?.id ?? null
  const leadCreated = lead?.created_at ?? kontext?.lead?.created_at ?? null

  // Zustände aus Daten, nicht aus Phasenfeld
  let anfrageState: PhaseState = 'current'
  let angebotState: PhaseState = 'open'
  let auftragState: PhaseState = 'open'
  let rechnungState: PhaseState = 'open'

  if (hasRechnung) {
    anfrageState = 'done'
    angebotState = 'done'
    auftragState = 'done'
    rechnungState = 'current'
  } else if (auftrag) {
    anfrageState = 'done'
    angebotState = 'done'
    auftragState = 'current'
  } else if (hasAngebot) {
    anfrageState = 'done'
    angebotState = 'current'
  }

  const anfrageKopf =
    anfrageState === 'done'
      ? `eingegangen ${leadCreated ? formatDatum(leadCreated) : '—'}`
      : anfrageState === 'current'
        ? leadCreated
          ? `eingegangen ${formatDatum(leadCreated)}`
          : 'in Bearbeitung'
        : 'noch nicht erstellt'

  const anfrageProps = lead ? buildAnfragePhaseSheetProps(lead) : []

  const angebotNr = hasAngebot
    ? angebotNrAnzeige(angebot!.angebotsnr, angebot!.id)
    : null

  const auftragExtra = extras?.auftrag
  const rechnungExtra = extras?.rechnung

  const defaultAuftragKopf =
    auftragState === 'open'
      ? 'noch nicht erstellt'
      : auftragStatusKurz(auftrag!.status) || 'in Bearbeitung'

  const defaultRechnungKopf =
    rechnungState === 'open'
      ? 'noch nicht erstellt'
      : aktiveRechnungen.length > 1
        ? `${aktiveRechnungen.length} gestellt`
        : rechnungStatusKurz(latestRe!.status) || 'in Bearbeitung'

  return [
    {
      kind: 'anfrage',
      label: 'Anfrage',
      state: anfrageState,
      kopf: anfrageKopf,
      betrag: budget !== '—' ? budget : null,
      href: leadId ? withFrom(`/anfragen/${leadId}`) : null,
      sheetTitle: 'Anfrage',
      props: anfrageProps.length
        ? anfrageProps
        : [
            {
              k: 'Eingegangen',
              v: leadCreated ? formatDatum(leadCreated) : '—',
            },
            { k: 'Quelle', v: lead ? kanalLabel(lead.kanal) || '—' : '—' },
            { k: 'Anliegen', v: anfrageTitel },
          ],
    },
    {
      kind: 'angebot',
      label: 'Angebot',
      state: angebotState,
      kopf:
        angebotState === 'open'
          ? 'noch nicht erstellt'
          : angebotState === 'current'
            ? angebotStatusKurz(angebot!.status, angebot!.status_einfach) ||
              'in Bearbeitung'
            : `angenommen ${angebot?.created_at ? formatDatum(angebot.created_at) : ''}`.trim(),
      betrag: hasAngebot
        ? formatEurKurz(
            angebot!.gesamt_fix ?? angebot!.gesamt_max ?? angebot!.gesamt_min
          )
        : null,
      href: hasAngebot ? withFrom(`/angebote/${angebot!.id}`) : null,
      sheetTitle: angebotNr ? `Angebot ${angebotNr}` : 'Angebot',
      props: hasAngebot
        ? [
            ...(hasRealAngebotNummer(angebot)
              ? [{ k: 'Nummer', v: angebot!.angebotsnr!.trim() }]
              : []),
            {
              k: 'Datum',
              v: angebot!.created_at ? formatDatum(angebot!.created_at) : '—',
            },
            {
              k: 'Summe',
              v:
                formatEurKurz(
                  angebot!.gesamt_fix ?? angebot!.gesamt_max ?? angebot!.gesamt_min
                ) || '—',
            },
            {
              k: 'Status',
              v: angebotStatusKurz(angebot!.status, angebot!.status_einfach),
            },
            {
              k: 'Gültigkeit',
              v: angebot!.gueltig_bis ? formatDatum(angebot!.gueltig_bis) : '—',
            },
          ]
        : [],
    },
    {
      kind: 'auftrag',
      label: 'Auftrag',
      state: auftragState,
      kopf: auftragExtra?.kopf ?? defaultAuftragKopf,
      sub: auftragExtra?.sub ?? null,
      betrag: auftragExtra?.betrag ?? null,
      href: auftrag ? withFrom(`/auftraege/${auftrag.id}`) : null,
      sheetTitle: auftrag?.titel?.trim() || 'Auftrag',
      props:
        auftragExtra?.props ??
        (auftrag
          ? [
              { k: 'Titel', v: auftrag.titel?.trim() || '—' },
              {
                k: 'Datum',
                v: auftrag.created_at ? formatDatum(auftrag.created_at) : '—',
              },
              { k: 'Status', v: auftragStatusKurz(auftrag.status) },
            ]
          : []),
    },
    {
      kind: 'rechnung',
      label: 'Rechnung',
      state: rechnungState,
      kopf: rechnungExtra?.kopf ?? defaultRechnungKopf,
      sub: rechnungExtra?.sub ?? null,
      betrag:
        rechnungExtra?.betrag ??
        (hasRechnung
          ? formatEurKurz(
              aktiveRechnungen.reduce((s, r) => s + (r.brutto ?? 0), 0) ||
                latestRe!.brutto
            )
          : null),
      href: hasRechnung ? withFrom(`/rechnungen/${latestRe!.id}`) : null,
      sheetCrumb: rechnungExtra?.sheetCrumb ?? (latestRe?.rechnungsnummer?.trim()
        ? `${latestRe.rechnungsnummer.trim()} >`
        : null),
      sheetTitle: rechnungExtra?.sheetTitle ?? 'Rechnung',
      props:
        rechnungExtra?.props ??
        (hasRechnung
          ? [
              {
                k: 'Nummer',
                v: latestRe!.rechnungsnummer?.trim() || '—',
              },
              {
                k: 'Datum',
                v: latestRe!.rechnungsdatum
                  ? formatDatum(latestRe!.rechnungsdatum)
                  : '—',
              },
              { k: 'Summe', v: formatEurKurz(latestRe!.brutto) || '—' },
              { k: 'Status', v: rechnungStatusKurz(latestRe!.status) },
              ...(aktiveRechnungen.length > 1
                ? [{ k: 'Anzahl', v: String(aktiveRechnungen.length) }]
                : []),
            ]
          : []),
    },
  ]
}


/** @deprecated unused — kept for typecheck of optional children patterns */
export type VorgangPhasenVerlaufSlot = ReactNode
