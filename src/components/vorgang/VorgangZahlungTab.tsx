'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { AbschlagsplanEditorModal } from '@/components/auftraege/AbschlagsplanEditorModal'
import {
  RateDrawer,
  type RateDrawerCta,
  type RateDrawerMahnung,
  type RateDrawerRate,
} from '@/components/vorgang/RateDrawer'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { loadRechnungWizardBootstrap as loadWizardBootstrap, loadRechnungWizardBootstrapStandalone } from '@/app/(dashboard)/rechnungen/wizard-actions'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  emptyZahlungsplan,
  parseZahlungsplan,
  rechnungDokumentBezeichnung,
  rechnungFuerAbschlagZeile,
  rechnungenZuAbschlagZeile,
  zahlplanAbgerechnetAusLinks,
  zahlplanRateStatus,
  type RechnungAbschlagLink,
  type ZahlplanRateStatus,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import {
  aktuelleMahnstufeNummer,
  tageSeitFaelligkeitRechnung,
} from '@/lib/rechnungen/mahnverlauf'
import type {
  RechnungAuswahlZeile,
  RechnungWizardBootstrap,
} from '@/lib/rechnungen/rechnung-wizard-types'
import { formatDatum, cn } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import type { StatusTone } from '@/lib/status/status-tone'
import { useIsMobile } from '@/hooks/useIsMobile'

export type RechnungErstellenOpts = {
  zeileId?: string
  voll?: boolean
  naechsterAbschlag?: boolean
}

export type VorgangZahlungVariant = 'auftrag' | 'angebot' | 'rechnung'

type RateRow = RateDrawerRate & {
  zeileId?: string
  isNext?: boolean
  istSchluss?: boolean
  sub?: string
  badgeLabel: string
  badgeTone: StatusTone
  badgeStatus: string
  belegCount?: number
}

function faelligUeberfaellig(faellig?: string | null): boolean {
  if (!faellig) return false
  return tageSeitFaelligkeitRechnung(faellig) > 0
}

function mahnungenFromRechnung(r: RechnungAuswahlZeile | null | undefined): RateDrawerMahnung[] {
  if (!r) return []
  const out: RateDrawerMahnung[] = []
  if (r.erinnerung_7_sent_at) {
    out.push({ stufe: 1, datum: String(r.erinnerung_7_sent_at).slice(0, 10) })
  }
  if (r.erinnerung_21_sent_at) {
    out.push({ stufe: 2, datum: String(r.erinnerung_21_sent_at).slice(0, 10) })
  }
  if (r.intern_warnung_30_at) {
    out.push({ stufe: 3, datum: String(r.intern_warnung_30_at).slice(0, 10) })
  }
  return out
}

function rateBadgeMeta(
  st: ZahlplanRateStatus,
  r: RechnungAuswahlZeile | null | undefined
): { label: string; tone: StatusTone; status: string } {
  if (r?.reklamation_am) {
    return { label: 'Reklamiert', tone: 'rot', status: 'reklamiert' }
  }
  if (st === 'bezahlt') {
    return { label: 'Bezahlt', tone: 'gruen', status: 'bezahlt' }
  }
  if (st === 'gestellt') {
    const ueber = faelligUeberfaellig(r?.faellig_am)
    if (!ueber) return { label: 'Gestellt', tone: 'blau', status: 'gesendet' }
    const stufe = aktuelleMahnstufeNummer({
      status: String(r?.status ?? 'gesendet'),
      erinnerung_7_sent_at: r?.erinnerung_7_sent_at,
      erinnerung_21_sent_at: r?.erinnerung_21_sent_at,
      intern_warnung_30_at: r?.intern_warnung_30_at,
      faellig_am: r?.faellig_am,
    })
    if (stufe > 0) {
      return { label: `Mahnstufe ${stufe}`, tone: 'rot', status: 'ueberfaellig' }
    }
    return { label: 'Überfällig', tone: 'rot', status: 'ueberfaellig' }
  }
  if (r && String(r.status) === 'entwurf') {
    return { label: 'Entwurf', tone: 'grau', status: 'entwurf' }
  }
  return { label: 'Geplant', tone: 'grau', status: 'geplant' }
}

function belegStatusLabel(r: RechnungAuswahlZeile): string {
  const typ = String(r.beleg_typ ?? 'rechnung')
  if (typ === 'gutschrift') return 'Gutschrift'
  const st = String(r.status)
  if (st === 'bezahlt') return 'Bezahlt'
  if (st === 'storniert') return 'Storniert'
  if (st === 'entwurf') return 'Entwurf'
  if (faelligUeberfaellig(r.faellig_am)) return 'Überfällig'
  if (st === 'gesendet' || st === 'versendet') return 'Gestellt'
  return st || '—'
}

/**
 * Phase 7 — Zahlung-Tab: leer · Einzelrechnung · Abschlagsplan + RateDrawer.
 * Prefill nur aus `angebote.zahlungsplan` (nie `auftraege.zahlungsplan`).
 */
export function VorgangZahlungTab({
  variant,
  auftragId,
  zahlungsplanRaw,
  gesamtNetto,
  gesamtBruttoHint,
  rechnungen,
  aktuelleRechnungId,
  fallbackTitel,
  onCreateInvoice,
  onEditInvoice,
  onOpenWizard,
  onRefresh,
  readOnly = false,
}: {
  variant: VorgangZahlungVariant
  auftragId?: string | null
  /** Spec Q2: nur angebote.zahlungsplan */
  zahlungsplanRaw: unknown
  gesamtNetto: number
  gesamtBruttoHint?: number | null
  rechnungen: RechnungAuswahlZeile[]
  aktuelleRechnungId?: string
  /** Fallback-Bezeichnung (z. B. Projekt-/Abschlagstitel auf der Rechnung) */
  fallbackTitel?: string | null
  onCreateInvoice?: (opts?: RechnungErstellenOpts) => void
  onEditInvoice?: (rechnungId: string) => void
  onOpenWizard?: (bootstrap: RechnungWizardBootstrap) => void
  onRefresh?: () => void
  /** Angebot: Vorschlag ohne RE-Aktionen */
  readOnly?: boolean
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [pending, startTransition] = useTransition()
  const initial = useMemo(
    () => parseZahlungsplan(zahlungsplanRaw) ?? emptyZahlungsplan(),
    [zahlungsplanRaw]
  )
  const [plan, setPlan] = useState<Zahlungsplan>(initial)
  const [editorOpen, setEditorOpen] = useState(false)
  const [openRateId, setOpenRateId] = useState<string | null>(null)

  useEffect(() => {
    setPlan(initial)
  }, [initial])

  const abschlagLinks = useMemo(
    () =>
      rechnungen.map((r) => ({
        id: r.id,
        brutto: r.brutto,
        status: String(r.status),
        zahlungsplan_abschlag_id: r.zahlungsplan_abschlag_id ?? null,
        rechnung_art: r.rechnung_art ?? null,
        faellig_am: r.faellig_am ?? null,
      })) as RechnungAbschlagLink[],
    [rechnungen]
  )

  const rechnungById = useMemo(() => {
    const m = new Map<string, RechnungAuswahlZeile>()
    for (const r of rechnungen) m.set(r.id, r)
    return m
  }, [rechnungen])

  const hasPlan = plan.zeilen.length > 0
  const kontext = useMemo(
    () =>
      hasPlan
        ? berechneZahlungsplan(plan, gesamtNetto, 19, zahlplanAbgerechnetAusLinks(abschlagLinks))
        : null,
    [hasPlan, plan, gesamtNetto, abschlagLinks]
  )

  const totalBrutto =
    kontext?.gesamtBrutto ??
    gesamtBruttoHint ??
    (gesamtNetto > 0 ? Math.round(gesamtNetto * 1.19 * 100) / 100 : 0)

  const rows: RateRow[] = useMemo(() => {
    // Mit Zahlungsplan: immer Plan-Raten (auch auf Rechnung-Detail) — Gutschriften hängen als Belege
    const usePlanRows = hasPlan && kontext

    if (usePlanRows && kontext) {
      const naechsteId =
        kontext.zeilen.find((z) => zahlplanRateStatus(z.id, abschlagLinks) === 'geplant')?.id ??
        null
      return kontext.zeilen.map((z) => {
        const st = zahlplanRateStatus(z.id, abschlagLinks)
        const link = rechnungFuerAbschlagZeile(z.id, abschlagLinks)
        const r = link?.id ? rechnungById.get(link.id) ?? null : null
        const related = rechnungenZuAbschlagZeile(z.id, rechnungen)
        const badge = rateBadgeMeta(st, r)
        // Schluss: immer Plan-Rest nach Abschlägen — nicht DB-Brutto (oft volle Leistungssumme)
        const betrag = z.istSchluss
          ? Number(z.brutto) || 0
          : st === 'geplant' || !r
            ? Number(z.brutto) || 0
            : Number(r.brutto ?? 0) || 0
        const pct =
          z.typ === 'prozent' && !z.istSchluss
            ? z.wert
            : z.istSchluss
              ? null
              : gesamtNetto > 0
                ? Math.round((z.netto / gesamtNetto) * 100)
                : null
        const faellig =
          z.faellig_am?.slice(0, 10) ||
          (typeof r?.faellig_am === 'string' ? r.faellig_am.slice(0, 10) : null)
        const belegeAnzeige = related.map((x) => {
          const typ = String(x.beleg_typ ?? 'rechnung')
          const artTitel = rechnungDokumentBezeichnung(x.rechnung_art, x.abschlag_index)
          const nr = x.rechnungsnummer?.trim() || '—'
          const label =
            typ === 'gutschrift'
              ? `Gutschrift · ${nr}`
              : artTitel !== 'Rechnung'
                ? `${artTitel} · ${nr}`
                : nr
          const isSchlussBeleg =
            z.istSchluss || String(x.rechnung_art ?? '') === 'schluss'
          const belegBrutto =
            isSchlussBeleg &&
            typ !== 'gutschrift' &&
            String(x.status) !== 'storniert'
              ? betrag
              : x.brutto
          return {
            id: x.id,
            nummer: label,
            status: String(x.status),
            statusLabel: belegStatusLabel(x),
            belegTyp: x.beleg_typ ?? null,
            brutto: belegBrutto,
          }
        })
        return {
          id: z.id,
          zeileId: z.id,
          label: z.titel,
          status: st,
          betrag,
          faellig,
          prozent: pct,
          reNr: r?.rechnungsnummer?.trim() || null,
          rechnungId: r?.id ?? null,
          belege: belegeAnzeige,
          reklamation: r?.reklamation_am
            ? { datum: r.reklamation_am, grund: r.reklamation_grund }
            : null,
          isNext: z.id === naechsteId,
          istSchluss: Boolean(z.istSchluss),
          sub:
            [
              pct != null ? `${pct} % der Auftragssumme` : z.istSchluss ? 'Restbetrag nach Abschlägen' : null,
              related.length === 1 ? r?.rechnungsnummer?.trim() || null : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Abschlag',
          badgeLabel: badge.label,
          badgeTone: badge.tone,
          badgeStatus: badge.status,
          belegCount: related.length,
        }
      })
    }

    // Ohne Plan: Belegzeilen — Gutschriften mit bezug unter Parent, nicht als Top-Level
    const topLevel = rechnungen.filter((r) => {
      if (String(r.status) === 'storniert') return false
      if (String(r.beleg_typ ?? '') === 'gutschrift') return false
      return true
    })

    return topLevel.map((r) => {
      const st: ZahlplanRateStatus =
        String(r.status) === 'bezahlt'
          ? 'bezahlt'
          : String(r.status) === 'entwurf'
            ? 'geplant'
            : 'gestellt'
      const badge = rateBadgeMeta(st, r)
      const planTitel = r.zahlungsplan_abschlag_id
        ? plan.zeilen.find((z) => z.id === r.zahlungsplan_abschlag_id)?.titel?.trim() || null
        : null
      const artTitel = rechnungDokumentBezeichnung(r.rechnung_art, r.abschlag_index)
      const isCurrent = r.id === aktuelleRechnungId
      const label =
        planTitel ||
        (artTitel !== 'Rechnung' ? artTitel : null) ||
        (isCurrent ? fallbackTitel?.trim() || null : null) ||
        r.rechnungsnummer?.trim() ||
        'Rechnung'
      const reNr = r.rechnungsnummer?.trim() || null
      const children = rechnungen.filter(
        (x) =>
          String(x.bezug_rechnung_id ?? '') === r.id ||
          (String(x.id) !== r.id &&
            String(x.zahlungsplan_abschlag_id ?? '') === String(r.zahlungsplan_abschlag_id ?? '') &&
            Boolean(r.zahlungsplan_abschlag_id) &&
            String(x.beleg_typ ?? '') === 'gutschrift')
      )
      const belege = [
        {
          id: r.id,
          nummer: reNr || '—',
          status: String(r.status),
          statusLabel: belegStatusLabel(r),
          belegTyp: r.beleg_typ ?? null,
          brutto: r.brutto,
        },
        ...children.map((x) => ({
          id: x.id,
          nummer:
            String(x.beleg_typ ?? '') === 'gutschrift'
              ? `Gutschrift · ${x.rechnungsnummer?.trim() || '—'}`
              : x.rechnungsnummer?.trim() || '—',
          status: String(x.status),
          statusLabel: belegStatusLabel(x),
          belegTyp: x.beleg_typ ?? null,
          brutto: x.brutto,
        })),
      ]
      const planZeile = r.zahlungsplan_abschlag_id
        ? plan.zeilen.find((z) => z.id === r.zahlungsplan_abschlag_id)
        : null
      const istSchluss =
        String(r.rechnung_art ?? '') === 'schluss' ||
        planZeile?.typ === 'rest' ||
        Boolean(
          planZeile &&
            plan.zeilen.length > 0 &&
            plan.zeilen[plan.zeilen.length - 1]?.id === planZeile.id
        )
      return {
        id: r.id,
        label,
        status: st,
        betrag: Number(r.brutto ?? 0) || 0,
        faellig: r.faellig_am ? String(r.faellig_am).slice(0, 10) : null,
        reNr,
        rechnungId: r.id,
        belege,
        reklamation: r.reklamation_am
          ? { datum: r.reklamation_am, grund: r.reklamation_grund }
          : null,
        istSchluss,
        sub: reNr || 'Gesamtbetrag',
        badgeLabel: badge.label,
        badgeTone: badge.tone,
        badgeStatus: badge.status,
        belegCount: belege.length,
      }
    })
  }, [
    hasPlan,
    kontext,
    abschlagLinks,
    rechnungById,
    rechnungen,
    gesamtNetto,
    plan.zeilen,
    aktuelleRechnungId,
    fallbackTitel,
  ])

  const nurEinzel = !hasPlan && rows.length === 1
  const empty = rows.length === 0

  const abschlagRows = useMemo(() => rows.filter((r) => !r.istSchluss), [rows])
  const abschlussRows = useMemo(() => rows.filter((r) => r.istSchluss), [rows])
  const showGruppen =
    (hasPlan || abschlussRows.length > 0) &&
    (abschlagRows.length > 0 || abschlussRows.length > 0) &&
    rows.length > 1

  const { bezahltBrutto, gestelltBrutto } = useMemo(() => {
    let bezahlt = 0
    let gestellt = 0
    for (const row of rows) {
      if (row.status === 'bezahlt') bezahlt += row.betrag
      else if (row.status === 'gestellt') gestellt += row.betrag
    }
    return { bezahltBrutto: bezahlt, gestelltBrutto: gestellt }
  }, [rows])

  const invoiceSumBrutto = useMemo(
    () => rows.reduce((s, r) => s + (r.status === 'geplant' ? 0 : r.betrag), 0),
    [rows]
  )

  const totalBruttoResolved =
    hasPlan && totalBrutto > 0
      ? totalBrutto
      : variant === 'rechnung'
        ? invoiceSumBrutto || gesamtBruttoHint || 0
        : totalBrutto || invoiceSumBrutto

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  function isRateExpanded(rowId: string, defaultOpen: boolean): boolean {
    if (expandedIds[rowId] !== undefined) return Boolean(expandedIds[rowId])
    return defaultOpen
  }

  function toggleExpand(rowId: string, currentlyExpanded: boolean) {
    setExpandedIds((prev) => ({ ...prev, [rowId]: !currentlyExpanded }))
  }

  const pct =
    totalBruttoResolved > 0
      ? Math.round((bezahltBrutto / Math.max(totalBruttoResolved, bezahltBrutto)) * 100)
      : 0
  const offen = Math.max(0, totalBruttoResolved - bezahltBrutto)
  const naechste = rows.find((r) => r.isNext) ?? null
  const openRate = rows.find((r) => r.id === openRateId) ?? null
  const openRechnung = openRate?.rechnungId
    ? rechnungById.get(openRate.rechnungId) ?? null
    : null
  const openMahnungen = mahnungenFromRechnung(openRechnung)
  const frozenRateIds = useMemo(
    () =>
      plan.zeilen
        .filter((z) => {
          const st = zahlplanRateStatus(z.id, abschlagLinks)
          return st === 'gestellt' || st === 'bezahlt'
        })
        .map((z) => z.id),
    [plan.zeilen, abschlagLinks]
  )

  function speichern(next: Zahlungsplan) {
    if (!auftragId) {
      toast.error('Kein Auftrag — Plan nur am Angebot speicherbar.')
      return
    }
    if (!next.zeilen.length) {
      toast.error('Mindestens eine Abschlagszeile erforderlich.')
      return
    }
    startTransition(async () => {
      const res = await saveAuftragZahlungsplan(auftragId, next)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setPlan(next)
      setEditorOpen(false)
      toast.success('Gespeichert')
      onRefresh?.()
      router.refresh()
    })
  }

  function openRechnungBearbeiten(rechnungId: string) {
    setOpenRateId(null)
    if (onEditInvoice) {
      onEditInvoice(rechnungId)
      return
    }
    startTransition(async () => {
      const boot = auftragId
        ? await loadWizardBootstrap(rechnungId, auftragId)
        : await loadRechnungWizardBootstrapStandalone(rechnungId)
      if (boot.ok && onOpenWizard) {
        onOpenWizard(boot.bootstrap)
      } else if (!boot.ok) {
        toast.error(boot.message)
      } else {
        router.push(`/rechnungen/${rechnungId}?tab=leistungen`)
      }
    })
  }

  /** Vorhandener nicht-stornierter Beleg (Entwurf zuerst) → Bearbeiten statt Erstellen. */
  function editableBelegId(rate: RateRow): string | null {
    const belege = rate.belege ?? []
    const draft = belege.find(
      (b) => b.status === 'entwurf' && String(b.belegTyp ?? '') !== 'gutschrift'
    )
    if (draft) return draft.id
    if (rate.rechnungId) {
      const r = rechnungById.get(rate.rechnungId)
      if (
        r &&
        String(r.status) !== 'storniert' &&
        String(r.beleg_typ ?? '') !== 'gutschrift'
      ) {
        return rate.rechnungId
      }
    }
    const active = belege.find(
      (b) => b.status !== 'storniert' && String(b.belegTyp ?? '') !== 'gutschrift'
    )
    return active?.id ?? null
  }

  function buildCtas(rate: RateRow): RateDrawerCta[] {
    if (readOnly || variant === 'angebot') return []
    const ctas: RateDrawerCta[] = []
    const rechnungId = rate.rechnungId

    if (rate.status === 'geplant') {
      const editId = editableBelegId(rate)
      if (editId) {
        ctas.push({
          id: 'send',
          label: 'Senden',
          icon: 'send',
          onClick: () => {
            setOpenRateId(null)
            openRechnungBearbeiten(editId)
          },
        })
        ctas.push({
          id: 'open',
          label: 'Öffnen',
          icon: 'eye',
          onClick: () => {
            setOpenRateId(null)
            if (aktuelleRechnungId === editId) {
              router.push(`/rechnungen/${editId}?tab=uebersicht`)
              return
            }
            router.push(`/rechnungen/${editId}`)
          },
        })
        ctas.push({
          id: 'edit',
          label: 'Bearbeiten',
          icon: 'pencil',
          onClick: () => openRechnungBearbeiten(editId),
        })
      } else {
        ctas.push({
          id: 'invoice',
          label: 'Erstellen',
          icon: 'file-invoice',
          onClick: () => {
            setOpenRateId(null)
            onCreateInvoice?.(rate.zeileId ? { zeileId: rate.zeileId } : { voll: true })
          },
        })
      }
      return ctas
    }

    if ((rate.status === 'gestellt' || rate.status === 'bezahlt') && rechnungId) {
      ctas.push({
        id: 'open',
        label: 'Öffnen',
        icon: 'eye',
        onClick: () => {
          setOpenRateId(null)
          if (aktuelleRechnungId === rechnungId) {
            router.push(`/rechnungen/${rechnungId}?tab=uebersicht`)
            return
          }
          router.push(`/rechnungen/${rechnungId}`)
        },
      })
      ctas.push({
        id: 'edit',
        label: 'Bearbeiten',
        icon: 'pencil',
        onClick: () => openRechnungBearbeiten(rechnungId),
      })
      return ctas
    }

    return ctas
  }

  const interactive = !readOnly && variant !== 'angebot'
  const canEditPlan = interactive && variant === 'auftrag' && Boolean(auftragId)

  function renderRateRow(row: RateRow) {
    const belege = row.belege ?? []
    const hasBelege = belege.length > 0
    const aktiv =
      (row.rechnungId != null && row.rechnungId === aktuelleRechnungId) ||
      belege.some((b) => b.id === aktuelleRechnungId)
    // Accordion nur Desktop; mobil öffnet Tap immer den Bottom-Sheet (RateDrawer)
    const showAccordion = !isMobile && hasBelege && (showGruppen || belege.length > 1)
    // Standard: nur die aktive Rate offen, Rest zugeklappt
    const expanded = isRateExpanded(row.id, showAccordion && aktiv)

    function onToggleAccordion() {
      if (!showAccordion) return
      toggleExpand(row.id, expanded)
    }

    function onOpenDrawer() {
      setOpenRateId(row.id)
    }

    return (
      <div key={row.id} className={cn('zahlplan-rate', expanded && 'zahlplan-rate--open')}>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={showAccordion ? expanded : undefined}
          className={[
            'list-row',
            'zahlplan-row',
            'zahlplan-row--simple',
            'zahlung-row',
            showAccordion ? 'zahlung-row--accordion' : '',
            row.isNext ? 'zahlung-row--next' : '',
            aktiv ? 'zahlung-row--next' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            if (showAccordion) onToggleAccordion()
            else onOpenDrawer()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (showAccordion) onToggleAccordion()
              else onOpenDrawer()
            }
          }}
        >
          <div className="zahlplan-row__label">
            <span className="zahlplan-row__title">
              {showAccordion ? (
                <span className="zahlplan-row__expand" aria-hidden>
                  <MockIcon ctx="btn" n={expanded ? 'chevron-down' : 'chevron-right'} size={14} />
                </span>
              ) : null}
              <span className="zahlplan-row__name">{row.label}</span>
              <StatusBadge status={row.badgeStatus} label={row.badgeLabel} tone={row.badgeTone} />
              {(row.belegCount ?? 0) > 0 && showAccordion ? (
                <span className="zahlplan-row__count">
                  {row.belegCount} {row.belegCount === 1 ? 'Beleg' : 'Belege'}
                </span>
              ) : null}
            </span>
            {row.sub ? <div className="zahlplan-row__pct">{row.sub}</div> : null}
          </div>
          <div className="zahlplan-row__faellig">
            {row.faellig ? (
              <>
                <span className="zahlplan-row__faellig-label">Fällig</span>
                <span className="zahlplan-row__faellig-value">
                  {formatDatum(String(row.faellig).slice(0, 10))}
                </span>
              </>
            ) : (
              <span className="zahlplan-row__faellig-value zahlplan-row__faellig-value--empty">—</span>
            )}
          </div>
          <div className="zahlplan-row__betrag">{formatEurBetrag(row.betrag)}</div>
          <div className="zahlplan-row__menu">
            {showAccordion ? (
              <button
                type="button"
                className="zahlplan-row__detail"
                title="Details"
                aria-label={`${row.label} Details`}
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenDrawer()
                }}
              >
                <MockIcon ctx="btn" n="dots" size={15} />
              </button>
            ) : (
              <MockIcon ctx="btn" n="chevron-right" size={15} />
            )}
          </div>
        </div>
        {showAccordion && expanded ? (
          <div className="zahlplan-belege" role="list">
            {belege.map((b) => {
              const belegAktiv = b.id === aktuelleRechnungId
              return (
                <button
                  key={b.id}
                  type="button"
                  role="listitem"
                  className={[
                    'zahlplan-beleg',
                    belegAktiv ? 'zahlplan-beleg--aktiv' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (aktuelleRechnungId === b.id) {
                      router.push(`/rechnungen/${b.id}?tab=uebersicht`)
                      return
                    }
                    router.push(`/rechnungen/${b.id}`)
                  }}
                >
                  <span className="zahlplan-beleg__nr">{b.nummer || '—'}</span>
                  <StatusBadge status={b.status} label={b.statusLabel} />
                  <span className="zahlplan-beleg__betrag">
                    {b.brutto != null ? formatEurBetrag(b.brutto) : '—'}
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  // ─── Leer ───
  if (empty) {
    return (
      <>
        <MockCard
          title="Zahlung"
          icon="calculator"
          className="zahlplan-shell"
          actions={
            canEditPlan ? (
              <MockBtn
                sm
                kind="ghost"
                icon="plus"
                title="Abschlagsplan anlegen"
                onClick={() => setEditorOpen(true)}
              />
            ) : null
          }
        >
          <div className="zahlplan-empty">
            <MockIcon ctx="empty" n="calculator" size={26} />
            <div className="zahlplan-empty__title">
              {variant === 'angebot' ? 'Kein Zahlungsvorschlag' : 'Noch kein Abschlagsplan'}
            </div>
            <div className="zahlplan-empty__text">
              {variant === 'angebot' ? (
                <>
                  Auftragssumme <b>{formatEurBetrag(totalBrutto || gesamtNetto)}</b> — Einzelrechnung
                  oder Abschläge legst du bei der Rechnung fest.
                </>
              ) : (
                <>
                  Auftragssumme <b>{formatEurBetrag(totalBrutto || gesamtNetto)}</b> — optional in
                  Abschläge aufteilen, danach je Rate eine Rechnung erstellen.
                </>
              )}
            </div>
            {canEditPlan ? (
              <MockBtn kind="primary" icon="plus" onClick={() => setEditorOpen(true)}>
                Abschlagsplan anlegen
              </MockBtn>
            ) : null}
          </div>
        </MockCard>
        {canEditPlan ? (
          <AbschlagsplanEditorModal
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            gesamtNetto={gesamtNetto}
            gesamtBrutto={totalBrutto}
            initial={null}
            onSave={speichern}
            saving={pending}
            frozenIds={frozenRateIds}
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      <MockCard
        title="Zahlung"
        icon="calculator"
        className="zahlplan-shell"
        actions={
          canEditPlan ? (
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              title="Abschlagsplan bearbeiten"
              onClick={() => setEditorOpen(true)}
            />
          ) : variant === 'angebot' ? (
            <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>Vorschlag</span>
          ) : null
        }
      >
        {variant === 'angebot' ? (
          <div className="zahlung-tab-hint" style={{ marginBottom: 14 }}>
            <MockIcon ctx="btn" n="info" size={15} />
            <span>
              Unverbindlicher Zahlungsvorschlag — Raten werden bei der Rechnung festgelegt.
            </span>
          </div>
        ) : null}

        <div className="zahlplan-summary">
          <div className="zahlplan-summary__primary">
            <b className="zahlplan-summary__paid">{formatEurBetrag(bezahltBrutto)}</b>
            <span className="zahlplan-summary__of">
              {' '}
              von {formatEurBetrag(totalBruttoResolved || bezahltBrutto)}
            </span>
          </div>
          {variant !== 'rechnung' ? (
            <div className="zahlplan-summary__meta">
              {pct} % bezahlt
              {gestelltBrutto > 0 ? ` · ${formatEurBetrag(gestelltBrutto)} gestellt` : ''}
            </div>
          ) : null}
        </div>
        {variant !== 'rechnung' ? (
          <div className="zahlplan-bar" aria-hidden>
            <div className="zahlplan-bar__fill" style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        ) : (
          <div style={{ height: 8 }} aria-hidden />
        )}

        {nurEinzel ? (
          <div className="zahlung-tab-hint">
            <MockIcon ctx="btn" n="file-invoice" size={15} />
            <span>Gesamtrechnung — als eine Rechnung gestellt.</span>
          </div>
        ) : naechste && interactive ? (
          <div className="zahlung-tab-hint">
            <MockIcon ctx="btn" n="file-invoice" size={15} />
            <span>
              Als nächstes: <b>{naechste.label}</b>
              {naechste.faellig
                ? ` · fällig ${formatDatum(String(naechste.faellig).slice(0, 10))}`
                : ''}{' '}
              · {formatEurBetrag(naechste.betrag)}
            </span>
            <MockBtn sm kind="ghost" icon="chevron-right" onClick={() => setOpenRateId(naechste.id)}>
              Öffnen
            </MockBtn>
          </div>
        ) : null}

        <div className="zahlplan-table-wrap">
          {!isMobile ? (
            <div className="list-row head zahlplan-row zahlplan-row--simple zahlplan-row-head">
              <div>
                {showGruppen
                  ? 'Rate'
                  : variant === 'rechnung' || nurEinzel || !hasPlan
                    ? 'Rechnung'
                    : 'Abschlag'}
              </div>
              <div>Fällig</div>
              <div style={{ textAlign: 'right' }}>Betrag</div>
              <div />
            </div>
          ) : null}
          {showGruppen ? (
            <>
              {abschlagRows.length > 0 ? (
                <div className="zahlplan-gruppe">
                  <div className="zahlplan-gruppe__h">Abschläge</div>
                  {abschlagRows.map((row) => renderRateRow(row))}
                </div>
              ) : null}
              {abschlussRows.length > 0 ? (
                <div className="zahlplan-gruppe">
                  <div className="zahlplan-gruppe__h">Abschluss</div>
                  {abschlussRows.map((row) => renderRateRow(row))}
                </div>
              ) : null}
            </>
          ) : (
            rows.map((row) => renderRateRow(row))
          )}
        </div>

        <div className="zahlplan-foot">
          <span>
            <b>{rows.length}</b>{' '}
            {showGruppen
              ? rows.length === 1
                ? 'Rate'
                : 'Raten'
              : variant !== 'rechnung' && hasPlan && rows.length !== 1
                ? 'Abschläge'
                : variant !== 'rechnung' && hasPlan
                  ? 'Abschlag'
                  : rows.length === 1
                    ? 'Rechnung'
                    : 'Rechnungen'}
          </span>
          <div className="zahlplan-foot__sums">
            <span>
              Bezahlt <b>{formatEurBetrag(bezahltBrutto)}</b>
            </span>
            {gestelltBrutto > 0 ? (
              <span>
                Gestellt <b>{formatEurBetrag(gestelltBrutto)}</b>
              </span>
            ) : null}
            <span className="zahlplan-foot__offen">
              Offen <b>{formatEurBetrag(offen)}</b>
            </span>
          </div>
        </div>

      </MockCard>

      <RateDrawer
        open={Boolean(openRate)}
        rate={openRate}
        mahnungen={openMahnungen}
        onClose={() => setOpenRateId(null)}
        ctas={openRate ? buildCtas(openRate) : []}
      />

      {canEditPlan ? (
        <AbschlagsplanEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          gesamtNetto={gesamtNetto}
          gesamtBrutto={totalBrutto}
          initial={hasPlan ? plan : null}
          onSave={speichern}
          saving={pending}
          frozenIds={frozenRateIds}
        />
      ) : null}
    </>
  )
}
