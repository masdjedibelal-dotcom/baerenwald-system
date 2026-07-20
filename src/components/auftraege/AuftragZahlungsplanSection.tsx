'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { AbschlagsplanEditorModal } from '@/components/auftraege/AbschlagsplanEditorModal'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { updateRechnungStatus } from '@/app/(dashboard)/rechnungen/actions'
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
}: {
  auftragId: string
  zahlungsplanRaw: unknown
  gesamtNetto: number
  rechnungen: RechnungAuswahlZeile[]
  onCreateInvoice: (opts?: RechnungErstellenOpts) => void
  onRefresh?: () => void
}) {
  const router = useRouter()
  const initial = useMemo(
    () => parseZahlungsplan(zahlungsplanRaw) ?? emptyZahlungsplan(),
    [zahlungsplanRaw]
  )
  const [plan, setPlan] = useState<Zahlungsplan>(initial)
  const [editorOpen, setEditorOpen] = useState(false)
  const [pending, startTransition] = useTransition()

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
      setEditorOpen(false)
      toast.success('Zahlungsplan gespeichert')
      onRefresh?.()
      router.refresh()
    })
  }

  function rowMenu(zeileId: string, st: ZahlplanRateStatus): EntityMenuItem[] {
    const items: EntityMenuItem[] = []
    const r = rechnungFuerAbschlagZeile(zeileId, abschlagLinks)

    if (st === 'geplant') {
      items.push({
        icon: 'file-invoice',
        label: 'Rechnung erstellen',
        onClick: () => onCreateInvoice({ zeileId }),
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

  const rechnungenListeUi =
    rechnungen.length > 0 ? (
      <MockCard title="Rechnungen" icon="file-invoice">
        <div className="zahlplan-table-wrap" style={{ marginTop: 0 }}>
          {rechnungen.map((r) => (
            <div key={r.id} className="list-row zahlplan-row">
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
              <div />
              <div />
            </div>
          ))}
        </div>
      </MockCard>
    ) : null

  const rechnungenBlock = rechnungenListeUi ? (
    <div style={{ marginTop: 14 }}>{rechnungenListeUi}</div>
  ) : null

  if (gesamtNetto <= 0) {
    return (
      <MockCard title="Zahlung & Rechnung" icon="calculator">
        <div className="zahlplan-empty">
          <MockIcon ctx="empty" n="calculator" size={26} />
          <div className="zahlplan-empty__title">Noch keine Auftragssumme</div>
          <div className="zahlplan-empty__text">
            Zuerst Auftragspositionen mit Betrag anlegen, dann Rechnung oder Abschläge erstellen.
          </div>
        </div>
      </MockCard>
    )
  }

  if (!hasPlan) {
    return (
      <>
        <MockCard title="Zahlung & Rechnung" icon="calculator">
          <div className="zahlplan-empty">
            <MockIcon ctx="empty" n="calculator" size={26} />
            <div className="zahlplan-empty__title">Rechnung oder Abschlagsplan</div>
            <div className="zahlplan-empty__text">
              Eine <b>Vollrechnung</b> über {formatEurBetrag(gesamtNetto)} netto — oder die Summe
              in Abschläge aufteilen (z. B. 30 / 40 / 30).
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              <MockBtn kind="primary" icon="file-invoice" onClick={() => onCreateInvoice({ voll: true })}>
                Rechnung erstellen
              </MockBtn>
              <MockBtn kind="ghost" icon="plus" onClick={() => setEditorOpen(true)}>
                Abschlagsplan anlegen
              </MockBtn>
            </div>
          </div>
        </MockCard>
        {rechnungenBlock}
        <AbschlagsplanEditorModal
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          gesamtNetto={gesamtNetto}
          initial={null}
          onSave={speichern}
          saving={pending}
        />
      </>
    )
  }

  return (
    <>
      <MockCard
        title="Abschlagsplan"
        icon="calculator"
        actions={
          <>
            <MockBtn sm kind="ghost" icon="pencil" onClick={() => setEditorOpen(true)}>
              Plan bearbeiten
            </MockBtn>
            <MockBtn sm kind="ghost" icon="file-invoice" onClick={() => onCreateInvoice({ voll: true })}>
              Vollrechnung
            </MockBtn>
            <MockBtn
              sm
              kind="primary"
              icon="file-invoice"
              onClick={() => {
                const next = kontext.zeilen.find(
                  (z) => zahlplanRateStatus(z.id, abschlagLinks) === 'geplant'
                )
                if (next) onCreateInvoice({ zeileId: next.id })
                else onCreateInvoice({ naechsterAbschlag: true })
              }}
            >
              Nächste Rechnung
            </MockBtn>
          </>
        }
      >
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
          <div className="list-row head zahlplan-row">
            <div>Bezeichnung</div>
            <div style={{ textAlign: 'right' }}>Betrag</div>
            <div>Fällig</div>
            <div>Status</div>
            <div />
          </div>
          {kontext.zeilen.map((z) => {
            const st = zahlplanRateStatus(z.id, abschlagLinks)
            const r = rechnungFuerAbschlagZeile(z.id, abschlagLinks)
            const betrag = Number(r?.brutto ?? z.brutto) || 0
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
              <div key={z.id} className="list-row zahlplan-row">
                <div className="zahlplan-row__label">
                  {z.titel}
                  {pctLabel != null ? (
                    <span className="zahlplan-row__pct"> · {pctLabel}%</span>
                  ) : null}
                </div>
                <div className="zahlplan-row__betrag">{formatEurBetrag(betrag)}</div>
                <div className="zahlplan-row__faellig">{faellig ? formatDatum(faellig) : '—'}</div>
                <div>{rateBadge(st)}</div>
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
          „Rechnung erstellen“.
        </p>
      </MockCard>

      {rechnungenBlock}

      <AbschlagsplanEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        gesamtNetto={gesamtNetto}
        initial={plan}
        onSave={speichern}
        saving={pending}
      />
    </>
  )
}
