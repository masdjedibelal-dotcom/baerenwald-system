'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
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
import { ZahlungserinnerungMailModal } from '@/components/rechnungen/ZahlungserinnerungMailModal'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import {
  createGutschriftFromRechnung,
  sendRechnung,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import { setRechnungReklamation } from '@/app/(dashboard)/rechnungen/reklamation-actions'
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
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import type { StatusTone } from '@/lib/status/status-tone'

export type RechnungErstellenOpts = {
  zeileId?: string
  voll?: boolean
  naechsterAbschlag?: boolean
}

export type VorgangZahlungVariant = 'auftrag' | 'angebot' | 'rechnung'

type RateRow = RateDrawerRate & {
  zeileId?: string
  isNext?: boolean
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
  const [pending, startTransition] = useTransition()
  const initial = useMemo(
    () => parseZahlungsplan(zahlungsplanRaw) ?? emptyZahlungsplan(),
    [zahlungsplanRaw]
  )
  const [plan, setPlan] = useState<Zahlungsplan>(initial)
  const [editorOpen, setEditorOpen] = useState(false)
  const [openRateId, setOpenRateId] = useState<string | null>(null)
  const [mahnungRechnungId, setMahnungRechnungId] = useState<string | null>(null)

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
    // Rechnung-Detail: immer Belegzeilen (Mock-Tabelle), Plan-Editor bleibt am Auftrag
    const usePlanRows = variant !== 'rechnung' && hasPlan && kontext

    if (usePlanRows && kontext) {
      const naechsteId =
        kontext.zeilen.find((z) => zahlplanRateStatus(z.id, abschlagLinks) === 'geplant')?.id ??
        null
      return kontext.zeilen.map((z) => {
        const st = zahlplanRateStatus(z.id, abschlagLinks)
        const link = rechnungFuerAbschlagZeile(z.id, abschlagLinks)
        const r = link?.id ? rechnungById.get(link.id) ?? null : null
        const related = rechnungenZuAbschlagZeile(z.id, rechnungen)
        const belege = related.map((x) => ({
          id: x.id,
          nummer: x.rechnungsnummer?.trim() || '—',
          status: String(x.status),
          statusLabel: belegStatusLabel(x),
          belegTyp: x.beleg_typ ?? null,
          brutto: x.brutto,
        }))
        const badge = rateBadgeMeta(st, r)
        const betrag = st === 'geplant' || !r ? Number(z.brutto) || 0 : Number(r.brutto ?? 0) || 0
        const pct =
          z.typ === 'prozent'
            ? z.wert
            : gesamtNetto > 0
              ? Math.round((z.netto / gesamtNetto) * 100)
              : null
        const faellig =
          z.faellig_am?.slice(0, 10) ||
          (typeof r?.faellig_am === 'string' ? r.faellig_am.slice(0, 10) : null)
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
          belege,
          reklamation: r?.reklamation_am
            ? { datum: r.reklamation_am, grund: r.reklamation_grund }
            : null,
          isNext: z.id === naechsteId,
          sub:
            [
              pct != null ? `${pct} % der Auftragssumme` : z.istSchluss ? 'Restbetrag' : null,
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

    // Einzelrechnung(en) / Rechnung-Tab
    return rechnungen
      .filter((r) => String(r.status) !== 'storniert')
      .map((r) => {
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
          (isCurrent ? fallbackTitel?.trim() || null : null) ||
          (artTitel !== 'Rechnung' ? artTitel : null) ||
          fallbackTitel?.trim() ||
          r.rechnungsnummer?.trim() ||
          'Rechnung'
        const reNr = r.rechnungsnummer?.trim() || null
        return {
          id: r.id,
          label,
          status: st,
          betrag: Number(r.brutto ?? 0) || 0,
          faellig: r.faellig_am ? String(r.faellig_am).slice(0, 10) : null,
          reNr,
          rechnungId: r.id,
          belege: [
            {
              id: r.id,
              nummer: reNr || '—',
              status: String(r.status),
              statusLabel: belegStatusLabel(r),
              belegTyp: r.beleg_typ ?? null,
              brutto: r.brutto,
            },
          ],
          reklamation: r.reklamation_am
            ? { datum: r.reklamation_am, grund: r.reklamation_grund }
            : null,
          sub: reNr || 'Gesamtbetrag',
          badgeLabel: badge.label,
          badgeTone: badge.tone,
          badgeStatus: badge.status,
          belegCount: 1,
        }
      })
  }, [
    variant,
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

  const nurEinzel = (!hasPlan || variant === 'rechnung') && rows.length === 1
  const empty = rows.length === 0

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
    variant === 'rechnung'
      ? invoiceSumBrutto || gesamtBruttoHint || 0
      : totalBrutto || invoiceSumBrutto

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

  function buildCtas(rate: RateRow): RateDrawerCta[] {
    if (readOnly || variant === 'angebot') return []
    const ctas: RateDrawerCta[] = []
    const rechnungId = rate.rechnungId

    if (rate.status === 'geplant') {
      ctas.push({
        id: 'invoice',
        label: 'Rechnung erstellen',
        icon: 'file-invoice',
        primary: true,
        onClick: () => {
          setOpenRateId(null)
          onCreateInvoice?.(rate.zeileId ? { zeileId: rate.zeileId } : { voll: true })
        },
      })
      return ctas
    }

    if (rate.status === 'gestellt' && rechnungId) {
      ctas.push({
        id: 'paid',
        label: 'Als bezahlt markieren',
        icon: 'check',
        primary: true,
        onClick: () => {
          startTransition(async () => {
            const res = await updateRechnungStatus(rechnungId, 'bezahlt')
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success('Als bezahlt markiert (ohne Kunden-Mail)')
            setOpenRateId(null)
            onRefresh?.()
            router.refresh()
          })
        },
      })
      if (faelligUeberfaellig(rate.faellig)) {
        const nextStufe = openMahnungen.length + 1
        ctas.push({
          id: 'mahnung',
          label: `Mahnung senden (Stufe ${Math.min(nextStufe, 3)})`,
          icon: 'alert-triangle',
          onClick: () => {
            setMahnungRechnungId(rechnungId)
          },
        })
      }
      if (!rate.reklamation) {
        ctas.push({
          id: 'reklamation',
          label: 'Reklamation erfassen',
          icon: 'alert-triangle',
          onClick: () => {
            const grund = window.prompt(
              'Reklamationsgrund (kurz):',
              'Kunde beanstandet Position'
            )
            if (grund == null) return
            startTransition(async () => {
              const res = await setRechnungReklamation(rechnungId, { grund })
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success('Reklamation erfasst')
              onRefresh?.()
              router.refresh()
            })
          },
        })
      }
      ctas.push({
        id: 'edit',
        label: 'Rechnung bearbeiten',
        icon: 'pencil',
        onClick: () => {
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
        },
      })
      ctas.push({
        id: 'resend',
        label: 'Nochmal versenden',
        icon: 'send',
        onClick: () => {
          startTransition(async () => {
            const res = await sendRechnung(rechnungId)
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success('Rechnung erneut versendet')
            onRefresh?.()
            router.refresh()
          })
        },
      })
      ctas.push({
        id: 'open',
        label: 'Rechnung öffnen',
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
      return ctas
    }

    if (rate.status === 'bezahlt' && rechnungId) {
      ctas.push({
        id: 'credit',
        label: 'Korrigieren (Gutschrift)',
        icon: 'file-pencil',
        primary: true,
        onClick: () => {
          setOpenRateId(null)
          startTransition(async () => {
            const res = await createGutschriftFromRechnung(rechnungId)
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success('Gutschrift erstellt')
            const boot = auftragId
              ? await loadWizardBootstrap(res.id, auftragId)
              : await loadRechnungWizardBootstrapStandalone(res.id)
            if (boot.ok && onOpenWizard) {
              onOpenWizard(boot.bootstrap)
            } else {
              router.push(`/rechnungen/${res.id}`)
            }
            onRefresh?.()
            router.refresh()
          })
        },
      })
      ctas.push({
        id: 'reset',
        label: 'Zahlung zurücksetzen',
        icon: 'history',
        onClick: () => {
          startTransition(async () => {
            const res = await updateRechnungStatus(rechnungId, 'gesendet')
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success('Zahlung zurückgesetzt')
            setOpenRateId(null)
            onRefresh?.()
            router.refresh()
          })
        },
      })
      ctas.push({
        id: 'open',
        label: 'Rechnung öffnen',
        icon: 'eye',
        onClick: () => {
          setOpenRateId(null)
          router.push(`/rechnungen/${rechnungId}`)
        },
      })
    }

    return ctas
  }

  const interactive = !readOnly && variant !== 'angebot'
  const canEditPlan = interactive && variant === 'auftrag' && Boolean(auftragId)

  // ─── Leer ───
  if (empty) {
    return (
      <>
        <MockCard title="Zahlung" icon="calculator">
          <div className="zahlplan-empty">
            <MockIcon ctx="empty" n="calculator" size={26} />
            <div className="zahlplan-empty__title">
              {variant === 'angebot' ? 'Kein Zahlungsvorschlag' : 'Noch nicht abgerechnet'}
            </div>
            <div className="zahlplan-empty__text">
              {variant === 'angebot' ? (
                <>
                  Auftragssumme <b>{formatEurBetrag(totalBrutto || gesamtNetto)}</b> — Einzelrechnung
                  oder Abschläge legst du bei der Rechnung fest.
                </>
              ) : (
                <>
                  Auftragssumme <b>{formatEurBetrag(totalBrutto || gesamtNetto)}</b> — Einzelrechnung
                  oder Abschläge wählst du beim Erstellen.
                </>
              )}
            </div>
            {interactive ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 4 }}>
                <MockBtn
                  kind="primary"
                  icon="file-invoice"
                  onClick={() => onCreateInvoice?.({ voll: true })}
                >
                  Rechnung erstellen
                </MockBtn>
              </div>
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
          <span className="zahlplan-summary__left">
            {pct} % bezahlt
            {gestelltBrutto > 0 ? ` · ${formatEurBetrag(gestelltBrutto)} gestellt` : ''}
          </span>
          <b className="zahlplan-summary__right">
            {formatEurBetrag(bezahltBrutto)} / {formatEurBetrag(totalBruttoResolved || bezahltBrutto)}
          </b>
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
          <div className="list-row head zahlplan-row zahlplan-row--simple">
            <div>{variant === 'rechnung' || nurEinzel || !hasPlan ? 'Rechnung' : 'Abschlag'}</div>
            <div>Fällig</div>
            <div style={{ textAlign: 'right' }}>Betrag</div>
            <div />
          </div>
          {rows.map((row) => {
            const aktiv = row.rechnungId && row.rechnungId === aktuelleRechnungId
            return (
              <div
                key={row.id}
                role="button"
                tabIndex={0}
                className={[
                  'list-row',
                  'zahlplan-row',
                  'zahlplan-row--simple',
                  'zahlung-row',
                  row.isNext ? 'zahlung-row--next' : '',
                  aktiv ? 'zahlung-row--next' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setOpenRateId(row.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setOpenRateId(row.id)
                  }
                }}
              >
                <div className="zahlplan-row__label">
                  <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {row.label}
                    <StatusBadge
                      status={row.badgeStatus}
                      label={row.badgeLabel}
                      tone={row.badgeTone}
                    />
                    {(row.belegCount ?? 0) > 1 ? (
                      <span className="zahlplan-row__count">{row.belegCount} Rechnungen</span>
                    ) : null}
                  </span>
                  {row.sub ? <div className="zahlplan-row__pct">{row.sub}</div> : null}
                </div>
                <div className="zahlplan-row__faellig">
                  {row.faellig ? formatDatum(String(row.faellig).slice(0, 10)) : '—'}
                </div>
                <div className="zahlplan-row__betrag">{formatEurBetrag(row.betrag)}</div>
                <div className="zahlplan-row__menu">
                  <MockIcon ctx="btn" n="chevron-right" size={15} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="zahlplan-foot">
          <span>
            <b>{rows.length}</b>{' '}
            {variant !== 'rechnung' && hasPlan && rows.length !== 1
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

      {mahnungRechnungId ? (
        <ZahlungserinnerungMailModal
          open
          onClose={() => setMahnungRechnungId(null)}
          rechnungId={mahnungRechnungId}
          rechnungsnummer={
            rechnungById.get(mahnungRechnungId)?.rechnungsnummer?.trim() || 'Rechnung'
          }
          erinnerung7SentAt={rechnungById.get(mahnungRechnungId)?.erinnerung_7_sent_at}
          erinnerung21SentAt={rechnungById.get(mahnungRechnungId)?.erinnerung_21_sent_at}
          onSent={() => {
            setMahnungRechnungId(null)
            setOpenRateId(null)
            onRefresh?.()
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
