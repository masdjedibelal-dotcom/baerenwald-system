'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { WerkzeugPanel } from '@/components/crm/WerkzeugPanel'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockModal } from '@/components/mock-ui/MockModal'
import { AbschlagsplanEditorModal } from '@/components/auftraege/AbschlagsplanEditorModal'
import { RechnungWizardPdfPreview } from '@/components/rechnungen/RechnungWizardPdfPreview'
import { saveAuftragZahlungsplan, clearAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import {
  storniereRechnungOhneErsatz,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  berechneZahlungsplan,
  emptyZahlungsplan,
  parseZahlungsplan,
  rechnungFuerAbschlagZeile,
  zahlplanRateStatus,
  type RechnungAbschlagLink,
  type ZahlplanRateStatus,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import {
  zahlplanDarfGeloeschtWerden,
  zahlplanZeileIstEingefroren,
} from '@/lib/rechnungen/zahlplan-gates'
import type { RechnungAuswahlZeile } from '@/lib/rechnungen/rechnung-wizard-types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

export type RechnungErstellenOpts = {
  /** Abschlagszeile — Wizard startet vorselektiert ohne erneute Auswahl. */
  zeileId?: string
  /** Vollrechnung ohne Abschlagsplan. */
  voll?: boolean
  /** Nächste offene Planzeile. */
  naechsterAbschlag?: boolean
}

function rateBadge(st: ZahlplanRateStatus) {
  if (st === 'bezahlt') {
    return (
      <MockBadge kind="aktiv">
        <MockIcon ctx="btn" n="check" size={10} /> Bezahlt
      </MockBadge>
    )
  }
  if (st === 'gestellt') {
    return (
      <MockBadge kind="warten">
        <MockIcon ctx="btn" n="mail-forward" size={10} /> Gestellt
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="fertig">
      <MockIcon ctx="btn" n="file-pencil" size={10} /> Geplant
    </MockBadge>
  )
}

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  bezahlt: 'Bezahlt',
  ueberfaellig: 'Überfällig',
  storniert: 'Storniert',
}

export function AuftragZahlungsplanSection({
  auftragId,
  zahlungsplanRaw,
  gesamtNetto,
  rechnungen,
  onCreateInvoice,
  onRefresh,
  autoOpenEditor = false,
  onAutoOpenEditorConsumed,
}: {
  auftragId: string
  zahlungsplanRaw: unknown
  gesamtNetto: number
  rechnungen: RechnungAuswahlZeile[]
  onCreateInvoice: (opts?: RechnungErstellenOpts) => void
  onRefresh?: () => void
  /** Nach Angebot-Korrektur: Editor für Abschlagsplan / Schluss öffnen */
  autoOpenEditor?: boolean
  onAutoOpenEditorConsumed?: () => void
}) {
  const router = useRouter()
  const initial = useMemo(
    () => parseZahlungsplan(zahlungsplanRaw) ?? emptyZahlungsplan(),
    [zahlungsplanRaw]
  )
  const [plan, setPlan] = useState<Zahlungsplan>(initial)
  const [editorOpen, setEditorOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [vorschau, setVorschau] = useState<RechnungAuswahlZeile | null>(null)

  useEffect(() => {
    setPlan(initial)
  }, [initial])

  useEffect(() => {
    if (!autoOpenEditor) return
    setEditorOpen(true)
  }, [autoOpenEditor])

  function closeEditor() {
    setEditorOpen(false)
    if (autoOpenEditor) onAutoOpenEditorConsumed?.()
  }

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

  const kontext = useMemo(() => berechneZahlungsplan(plan, gesamtNetto), [plan, gesamtNetto])
  const totalBrutto = kontext.gesamtBrutto

  const { bezahltBrutto, gestelltBrutto } = useMemo(() => {
    let bezahlt = 0
    let gestellt = 0
    for (const z of kontext.zeilen) {
      const st = zahlplanRateStatus(z.id, abschlagLinks)
      const r = rechnungFuerAbschlagZeile(z.id, abschlagLinks)
      const betrag = Number(r?.brutto ?? z.brutto) || 0
      if (st === 'bezahlt') bezahlt += betrag
      else if (st === 'gestellt') gestellt += betrag
    }
    return { bezahltBrutto: bezahlt, gestelltBrutto: gestellt }
  }, [kontext.zeilen, abschlagLinks])

  const pct = totalBrutto > 0 ? Math.round((bezahltBrutto / totalBrutto) * 100) : 0
  const hasPlan = plan.zeilen.length > 0
  const naechsteOffeneZeile = useMemo(
    () =>
      kontext.zeilen.find((z) => zahlplanRateStatus(z.id, abschlagLinks) === 'geplant') ?? null,
    [kontext.zeilen, abschlagLinks]
  )
  const frozenIds = useMemo(
    () => plan.zeilen.filter((z) => zahlplanZeileIstEingefroren(z.id, abschlagLinks)).map((z) => z.id),
    [plan.zeilen, abschlagLinks]
  )
  const planLoeschGate = zahlplanDarfGeloeschtWerden(plan, abschlagLinks)

  function rechnungFuerZeile(zeileId: string): RechnungAuswahlZeile | null {
    const link = rechnungFuerAbschlagZeile(zeileId, abschlagLinks)
    if (!link?.id) return null
    return rechnungById.get(link.id) ?? null
  }

  /** Gestellte Rate weicht vom aktuellen Plan (nach Angebotskorrektur) ab. */
  const abweichendeGestellte = useMemo(() => {
    const out: Array<{
      zeileId: string
      titel: string
      planBrutto: number
      rechnungBrutto: number
      rechnungId: string
    }> = []
    for (const z of kontext.zeilen) {
      const st = zahlplanRateStatus(z.id, abschlagLinks)
      if (st !== 'gestellt') continue
      const link = rechnungFuerAbschlagZeile(z.id, abschlagLinks)
      if (!link?.id) continue
      const r = rechnungById.get(link.id)
      if (!r) continue
      const planBrutto = Number(z.brutto) || 0
      const rechnungBrutto = Number(r.brutto ?? 0) || 0
      if (Math.abs(planBrutto - rechnungBrutto) < 0.5) continue
      out.push({
        zeileId: z.id,
        titel: z.titel,
        planBrutto,
        rechnungBrutto,
        rechnungId: r.id,
      })
    }
    return out
  }, [kontext.zeilen, abschlagLinks, rechnungById])

  function speichern(next: Zahlungsplan) {
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
      closeEditor()
      toast.success('Abschlagsplan gespeichert')
      onRefresh?.()
      router.refresh()
    })
  }

  function loeschenPlan() {
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
      toast.success('Abschlagsplan gelöscht')
      onRefresh?.()
      router.refresh()
    })
  }

  /** Falsche gestellte Rate freigeben und neue Rechnung aus aktuellem Plan öffnen. */
  function stornierenUndNeuStellen(zeileId: string) {
    const r = rechnungFuerZeile(zeileId)
    if (!r?.id) {
      toast.error('Keine Rechnung zu dieser Rate gefunden.')
      return
    }
    const z = kontext.zeilen.find((x) => x.id === zeileId)
    const planBrutto = Number(z?.brutto) || 0
    const alt = Number(r.brutto ?? 0) || 0
    if (
      !window.confirm(
        `Gestellte Rechnung (${formatEurBetrag(alt)}) stornieren und neue Rechnung` +
          (planBrutto > 0 ? ` über ${formatEurBetrag(planBrutto)}` : '') +
          ' aus dem aktuellen Plan anlegen?'
      )
    ) {
      return
    }
    startTransition(async () => {
      const res = await storniereRechnungOhneErsatz(r.id)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Alte Rechnung storniert — jetzt Betrag aus dem korrigierten Plan')
      onRefresh?.()
      router.refresh()
      onCreateInvoice({ zeileId })
    })
  }

  function rowMenu(zeileId: string, st: ZahlplanRateStatus): EntityMenuItem[] {
    const items: EntityMenuItem[] = []
    const r = rechnungFuerZeile(zeileId)

    if (st === 'geplant') {
      items.push({
        icon: 'file-invoice',
        label: 'Rechnung erstellen',
        onClick: () => onCreateInvoice({ zeileId }),
      })
    }

    if (st === 'gestellt' && r?.id) {
      items.push({
        icon: 'history',
        label: 'Stornieren & neu stellen',
        onClick: () => stornierenUndNeuStellen(zeileId),
      })
    }

    if (r?.id) {
      items.push({
        icon: 'eye',
        label: 'Vorschau',
        onClick: () => setVorschau(r),
      })
      items.push({
        icon: 'external-link',
        label: 'Zur Rechnung',
        onClick: () => router.push(`/rechnungen/${r.id}`),
      })
    }

    if (st === 'gestellt' && r?.id) {
      items.push({
        icon: 'check',
        label: 'Als bezahlt markieren',
        onClick: () => {
          startTransition(async () => {
            const res = await updateRechnungStatus(r.id, 'bezahlt')
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success('Als bezahlt markiert')
            onRefresh?.()
            router.refresh()
          })
        },
      })
    }

    if (st === 'bezahlt' && r?.id) {
      items.push({
        icon: 'history',
        label: 'Zahlung zurücksetzen',
        onClick: () => {
          startTransition(async () => {
            const res = await updateRechnungStatus(r.id, 'gesendet')
            if (!res.ok) {
              toast.error(res.message)
              return
            }
            toast.success('Zahlung zurückgesetzt')
            onRefresh?.()
            router.refresh()
          })
        },
      })
    }

    return items
  }

  /** Nur ohne Abschlagsplan: offene Vollrechnungen weiterhin listen. */
  const rechnungenOhnePlanUi =
    !hasPlan && rechnungen.length > 0 ? (
      <MockCard title="Rechnungen" icon="file-invoice">
        <div className="zahlplan-table-wrap" style={{ marginTop: 0 }}>
          {rechnungen.map((r) => (
            <div key={r.id} className="list-row zahlplan-row zahlplan-row--simple">
              <div className="zahlplan-row__label">
                <Link href={`/rechnungen/${r.id}`} className="text-bw-link">
                  {r.rechnungsnummer?.trim() || 'Rechnung'}
                </Link>
                <span className="zahlplan-row__pct">
                  {' '}
                  · {STATUS_LABEL[String(r.status)] ?? r.status}
                </span>
              </div>
              <div className="zahlplan-row__betrag">
                {formatEurBetrag(Number(r.brutto ?? 0))}
              </div>
              <div className="zahlplan-row__faellig">
                {r.faellig_am ? formatDatum(String(r.faellig_am).slice(0, 10)) : '—'}
              </div>
              <div>
                <MockBtn sm kind="ghost" icon="eye" onClick={() => setVorschau(r)}>
                  Vorschau
                </MockBtn>
              </div>
              <div />
            </div>
          ))}
        </div>
      </MockCard>
    ) : null

  const vorschauModal = (
    <MockModal
      open={Boolean(vorschau)}
      onClose={() => setVorschau(null)}
      icon="file-invoice"
      title={
        vorschau?.rechnungsnummer?.trim()
          ? `Rechnung ${vorschau.rechnungsnummer.trim()}`
          : 'Rechnungsvorschau'
      }
      sub={
        vorschau
          ? `${STATUS_LABEL[String(vorschau.status)] ?? vorschau.status} · ${formatEurBetrag(Number(vorschau.brutto ?? 0))}`
          : undefined
      }
      footer={
        vorschau ? (
          <>
            <MockBtn type="button" kind="ghost" onClick={() => setVorschau(null)}>
              Schließen
            </MockBtn>
            <MockBtn
              type="button"
              kind="primary"
              icon="external-link"
              onClick={() => {
                const id = vorschau.id
                setVorschau(null)
                router.push(`/rechnungen/${id}`)
              }}
            >
              Zur Rechnung
            </MockBtn>
          </>
        ) : null
      }
    >
      {vorschau ? (
        <RechnungWizardPdfPreview rechnungId={vorschau.id} />
      ) : null}
    </MockModal>
  )

  if (gesamtNetto <= 0) {
    return (
      <WerkzeugPanel
        title="Zahlung & Rechnung"
        icon="calculator"
        purpose="Zuerst Auftragspositionen mit Betrag anlegen, dann Rechnung oder Abschläge erstellen."
      >
        <div className="zahlplan-empty">
          <MockIcon ctx="empty" n="calculator" size={26} />
          <div className="zahlplan-empty__title">Noch keine Auftragssumme</div>
        </div>
      </WerkzeugPanel>
    )
  }

  if (!hasPlan) {
    return (
      <>
        <WerkzeugPanel
          title="Zahlung & Rechnung"
          icon="calculator"
          purpose={`Eine Vollrechnung über ${formatEurBetrag(gesamtNetto)} netto — oder die Summe in Abschläge aufteilen.`}
          actions={
            <div className="zahlplan-head-actions">
              <MockBtn kind="primary" icon="file-invoice" onClick={() => onCreateInvoice({ voll: true })}>
                Rechnung erstellen
              </MockBtn>
              <MockBtn kind="ghost" icon="plus" onClick={() => setEditorOpen(true)}>
                Abschlagsplan
              </MockBtn>
            </div>
          }
        >
          <div className="zahlplan-empty" style={{ paddingTop: 4 }}>
            <div className="zahlplan-empty__text" style={{ margin: 0 }}>
              Primäraktion: eine Rechnung stellen. Abschlagsplan, wenn du in Raten abrechnest.
            </div>
          </div>
        </WerkzeugPanel>
        {rechnungenOhnePlanUi}
        <AbschlagsplanEditorModal
          open={editorOpen}
          onClose={closeEditor}
          gesamtNetto={gesamtNetto}
          initial={null}
          onSave={speichern}
          saving={pending}
        />
        {vorschauModal}
      </>
    )
  }

  return (
    <>
      <WerkzeugPanel
        title="Abschlagsplan"
        icon="calculator"
        purpose={
          abweichendeGestellte.length
            ? 'Gestellte Schlussrechnung weicht von der neuen Auftragssumme ab — stornieren und neu stellen.'
            : 'Ratenliste — nächste offene Rate stellen oder den Plan anpassen.'
        }
        framed
        actions={
          <div className="zahlplan-head-actions">
            {abweichendeGestellte[0] ? (
              <MockBtn
                sm
                kind="primary"
                icon="history"
                disabled={pending}
                onClick={() => stornierenUndNeuStellen(abweichendeGestellte[0]!.zeileId)}
              >
                Schluss neu stellen
              </MockBtn>
            ) : naechsteOffeneZeile ? (
              <MockBtn
                sm
                kind="primary"
                icon="file-invoice"
                onClick={() => onCreateInvoice({ zeileId: naechsteOffeneZeile.id })}
              >
                Nächste Rechnung
              </MockBtn>
            ) : null}
            <MockBtn sm kind="ghost" icon="pencil" onClick={() => setEditorOpen(true)}>
              Plan anpassen
            </MockBtn>
            <MockBtn sm kind="ghost" icon="file-invoice" onClick={() => onCreateInvoice({ voll: true })}>
              Vollrechnung
            </MockBtn>
            <MockEntityRowMenu
              title="Plan-Aktionen"
              items={[
                ...(planLoeschGate.ok
                  ? [
                      {
                        label: 'Plan löschen',
                        icon: 'trash',
                        danger: true as const,
                        onClick: () => loeschenPlan(),
                      },
                    ]
                  : [
                      {
                        label: 'Löschen gesperrt',
                        icon: 'lock',
                        onClick: () => toast.error(planLoeschGate.message),
                      },
                    ]),
              ]}
            />
          </div>
        }
      >
        {abweichendeGestellte.length > 0 ? (
          <div
            role="status"
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface-2, #f4f5f4)',
              fontSize: 13,
              lineHeight: 1.45,
              color: 'var(--text-2)',
            }}
          >
            <b style={{ color: 'var(--text)' }}>Auftragssumme geändert — gestellte Rechnung passt nicht mehr.</b>
            <div style={{ marginTop: 4 }}>
              {abweichendeGestellte.map((a) => (
                <div key={a.zeileId}>
                  „{a.titel}“: gestellt {formatEurBetrag(a.rechnungBrutto)} · Plan jetzt{' '}
                  {formatEurBetrag(a.planBrutto)}. Plan speichern allein ändert die Rechnung nicht — zuerst
                  stornieren, dann neu stellen.
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="zahlplan-summary">
          <span className="zahlplan-summary__left">
            Bezahlt {formatEurBetrag(bezahltBrutto)}
            {gestelltBrutto > 0 ? ` · offen gestellt ${formatEurBetrag(gestelltBrutto)}` : ''}
          </span>
          <b className="zahlplan-summary__right">
            {formatEurBetrag(bezahltBrutto)} / {formatEurBetrag(totalBrutto)}
          </b>
        </div>
        <div className="zahlplan-bar" aria-hidden>
          <div className="zahlplan-bar__fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="zahlplan-table-wrap">
          <div className="list-row head zahlplan-row zahlplan-row--plan">
            <div>Bezeichnung</div>
            <div style={{ textAlign: 'right' }}>Betrag</div>
            <div>Fällig</div>
            <div>Status</div>
            <div>Rechnung</div>
            <div />
          </div>
          {kontext.zeilen.map((z) => {
            const st = zahlplanRateStatus(z.id, abschlagLinks)
            const r = rechnungFuerZeile(z.id)
            const planBrutto = Number(z.brutto) || 0
            const rechnungBrutto = r ? Number(r.brutto ?? 0) || 0 : 0
            const abweichung =
              st === 'gestellt' && r != null && Math.abs(planBrutto - rechnungBrutto) >= 0.5
            const betrag = st === 'geplant' || !r ? planBrutto : rechnungBrutto
            const pctLabel =
              z.typ === 'prozent'
                ? z.wert
                : gesamtNetto > 0
                  ? Math.round((z.netto / gesamtNetto) * 100)
                  : null
            const faellig =
              z.faellig_am?.slice(0, 10) ||
              (typeof r?.faellig_am === 'string' ? r.faellig_am.slice(0, 10) : null)
            const menu = rowMenu(z.id, st)
            return (
              <div key={z.id} className="list-row zahlplan-row zahlplan-row--plan">
                <div className="zahlplan-row__label">
                  {z.titel}
                  {pctLabel != null ? (
                    <span className="zahlplan-row__pct"> · {pctLabel}%</span>
                  ) : null}
                  {abweichung ? (
                    <div className="zahlplan-row__pct" style={{ display: 'block', marginTop: 2 }}>
                      Plan jetzt {formatEurBetrag(planBrutto)} — Rechnung veraltet
                    </div>
                  ) : null}
                </div>
                <div className="zahlplan-row__betrag">{formatEurBetrag(betrag)}</div>
                <div className="zahlplan-row__faellig">{faellig ? formatDatum(faellig) : '—'}</div>
                <div>{rateBadge(st)}</div>
                <div className="zahlplan-row__vorschau">
                  {abweichung ? (
                    <MockBtn
                      sm
                      kind="primary"
                      disabled={pending}
                      onClick={() => stornierenUndNeuStellen(z.id)}
                    >
                      Neu stellen
                    </MockBtn>
                  ) : r ? (
                    <MockBtn sm kind="ghost" icon="eye" onClick={() => setVorschau(r)}>
                      Vorschau
                    </MockBtn>
                  ) : st === 'geplant' ? (
                    <MockBtn
                      sm
                      kind="ghost"
                      icon="file-invoice"
                      onClick={() => onCreateInvoice({ zeileId: z.id })}
                    >
                      Erstellen
                    </MockBtn>
                  ) : (
                    <span className="zahlplan-row__pct">—</span>
                  )}
                </div>
                <div className="zahlplan-row__menu">
                  {menu.length ? <MockEntityRowMenu items={menu} /> : null}
                </div>
              </div>
            )
          })}
        </div>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: 12,
            color: 'var(--text-3)',
            lineHeight: 1.45,
          }}
        >
          Abschläge erscheinen als Pauschalzeile (Planbetrag). Die volle Leistungsaufstellung
          gehört in den Leistungsnachweis bzw. die Schlussrechnung — pro Rate unter ⋮
          „Rechnung erstellen“ bzw. „Zur Rechnung“.
        </p>
      </WerkzeugPanel>

      <AbschlagsplanEditorModal
        open={editorOpen}
        onClose={closeEditor}
        gesamtNetto={gesamtNetto}
        initial={plan}
        onSave={speichern}
        saving={pending}
        frozenIds={frozenIds}
      />
      {vorschauModal}
    </>
  )
}
