'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import {
  saveAuftragZahlungsplan,
  clearAuftragZahlungsplan,
} from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
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
  rechnungFuerAbschlagZeile,
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
import { zahlplanDarfGeloeschtWerden } from '@/lib/rechnungen/zahlplan-gates'
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
    if (hasPlan && kontext) {
      const naechsteId =
        kontext.zeilen.find((z) => zahlplanRateStatus(z.id, abschlagLinks) === 'geplant')?.id ??
        null
      return kontext.zeilen.map((z) => {
        const st = zahlplanRateStatus(z.id, abschlagLinks)
        const link = rechnungFuerAbschlagZeile(z.id, abschlagLinks)
        const r = link?.id ? rechnungById.get(link.id) ?? null : null
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
          reklamation: r?.reklamation_am
            ? { datum: r.reklamation_am, grund: r.reklamation_grund }
            : null,
          isNext: z.id === naechsteId,
          sub:
            [
              pct != null && !z.istSchluss ? `${pct} % der Auftragssumme` : null,
              z.istSchluss ? 'Restbetrag' : null,
              r?.rechnungsnummer?.trim() || null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Abschlag',
          badgeLabel: badge.label,
          badgeTone: badge.tone,
          badgeStatus: badge.status,
        }
      })
    }

    // Einzelrechnung(en) ohne Plan
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
        return {
          id: r.id,
          label: r.rechnungsnummer?.trim() || 'Rechnung',
          status: st,
          betrag: Number(r.brutto ?? 0) || 0,
          faellig: r.faellig_am ? String(r.faellig_am).slice(0, 10) : null,
          reNr: r.rechnungsnummer?.trim() || null,
          rechnungId: r.id,
          reklamation: r.reklamation_am
            ? { datum: r.reklamation_am, grund: r.reklamation_grund }
            : null,
          sub: 'Gesamtbetrag des Auftrags',
          badgeLabel: badge.label,
          badgeTone: badge.tone,
          badgeStatus: badge.status,
        }
      })
  }, [hasPlan, kontext, abschlagLinks, rechnungById, rechnungen, gesamtNetto])

  const nurEinzel = !hasPlan && rows.length > 0
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

  const pct =
    totalBrutto > 0 ? Math.round((bezahltBrutto / Math.max(totalBrutto, bezahltBrutto)) * 100) : 0
  const offen = Math.max(0, totalBrutto - bezahltBrutto)
  const naechste = rows.find((r) => r.isNext) ?? null
  const openRate = rows.find((r) => r.id === openRateId) ?? null
  const openRechnung = openRate?.rechnungId
    ? rechnungById.get(openRate.rechnungId) ?? null
    : null
  const openMahnungen = mahnungenFromRechnung(openRechnung)
  const planLoeschGate = zahlplanDarfGeloeschtWerden(plan, abschlagLinks)

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

  function loeschenPlan() {
    if (!auftragId) return
    if (!planLoeschGate.ok) {
      toast.error(planLoeschGate.message)
      return
    }
    if (!window.confirm('Abschlagsplan wirklich löschen? Offene Raten entfallen.')) return
    startTransition(async () => {
      const res = await clearAuftragZahlungsplan(auftragId)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setPlan(emptyZahlungsplan())
      toast.success('Gelöscht')
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
      const ueber = faelligUeberfaellig(rate.faellig)
      if (ueber) {
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
            startTransition(async () => {
              const res = await setRechnungReklamation(rechnungId, {
                grund: 'Kunde beanstandet Position',
              })
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success('Reklamation erfasst — Rechnung als strittig markiert')
              onRefresh?.()
              router.refresh()
            })
          },
        })
      } else {
        ctas.push({
          id: 'reklamation-done',
          label: 'Reklamation erledigt',
          icon: 'check',
          onClick: () => {
            startTransition(async () => {
              const res = await setRechnungReklamation(rechnungId, { clear: true })
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success('Reklamation erledigt')
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
            const res = auftragId
              ? await loadWizardBootstrap(rechnungId, auftragId)
              : await loadRechnungWizardBootstrapStandalone(rechnungId)
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            if (onOpenWizard) {
              onOpenWizard(res.bootstrap)
              return
            }
            router.push(`/rechnungen/${rechnungId}`)
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
    }

    if (rechnungId) {
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
  const canEditPlan = interactive && Boolean(auftragId)

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
            initial={null}
            onSave={speichern}
            saving={pending}
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
          canEditPlan && hasPlan ? (
            <MockBtn
              sm
              kind="ghost"
              icon="pencil"
              title="Zahlplan bearbeiten"
              onClick={() => setEditorOpen(true)}
            >
              Plan
            </MockBtn>
          ) : canEditPlan && !hasPlan ? (
            <MockBtn sm kind="ghost" icon="plus" onClick={() => setEditorOpen(true)}>
              Abschläge
            </MockBtn>
          ) : variant === 'rechnung' && auftragId ? (
            <Link href={`/auftraege/${auftragId}?tab=zahlung`}>
              <MockBtn sm kind="ghost" icon="external-link">
                Im Auftrag
              </MockBtn>
            </Link>
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
            {formatEurBetrag(bezahltBrutto)} / {formatEurBetrag(totalBrutto || bezahltBrutto)}
          </b>
        </div>
        <div className="zahlplan-bar" aria-hidden>
          <div className="zahlplan-bar__fill" style={{ width: `${Math.min(100, pct)}%` }} />
        </div>

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
            <div>{nurEinzel ? 'Rechnung' : 'Abschlag'}</div>
            <div style={{ textAlign: 'right' }}>Betrag</div>
            <div>Fällig</div>
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
                  </span>
                  {row.sub ? <div className="zahlplan-row__pct">{row.sub}</div> : null}
                </div>
                <div className="zahlplan-row__betrag">{formatEurBetrag(row.betrag)}</div>
                <div className="zahlplan-row__faellig">
                  {row.faellig ? formatDatum(String(row.faellig).slice(0, 10)) : '—'}
                </div>
                <div className="zahlplan-row__menu">
                  <MockIcon ctx="btn" n="chevron-right" size={15} />
                </div>
              </div>
            )
          })}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 12,
            fontSize: 'var(--fs-meta)',
            color: 'var(--text-3)',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <b style={{ color: 'var(--text)' }}>{rows.length}</b>{' '}
            {nurEinzel ? (rows.length === 1 ? 'Rechnung' : 'Rechnungen') : 'Abschläge'}
          </span>
          <span style={{ display: 'flex', gap: 14, fontVariantNumeric: 'tabular-nums' }}>
            <span>
              Bezahlt <b style={{ color: 'var(--text)' }}>{formatEurBetrag(bezahltBrutto)}</b>
            </span>
            {gestelltBrutto > 0 ? (
              <span>
                Gestellt <b style={{ color: 'var(--text)' }}>{formatEurBetrag(gestelltBrutto)}</b>
              </span>
            ) : null}
            <span>
              Offen <b style={{ color: 'var(--text)' }}>{formatEurBetrag(offen)}</b>
            </span>
          </span>
        </div>

        {canEditPlan && hasPlan && planLoeschGate.ok ? (
          <div style={{ marginTop: 10 }}>
            <MockBtn sm kind="ghost" icon="trash" disabled={pending} onClick={loeschenPlan}>
              Plan löschen
            </MockBtn>
          </div>
        ) : null}
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
          initial={hasPlan ? plan : null}
          onSave={speichern}
          saving={pending}
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
