'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import type { EntityMenuItem } from '@/lib/entity-menu'
import { formatDatum } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

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
  rechnungen: RechnungAbschlagLink[]
  /** Öffnet den echten Rechnungs-Flow (Auswahl/Wizard). */
  onCreateInvoice: () => void
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

  const kontext = useMemo(() => berechneZahlungsplan(plan, gesamtNetto), [plan, gesamtNetto])
  const totalBrutto = kontext.gesamtBrutto

  const { bezahltBrutto, gestelltBrutto } = useMemo(() => {
    let bezahlt = 0
    let gestellt = 0
    for (const z of kontext.zeilen) {
      const st = zahlplanRateStatus(z.id, rechnungen)
      const r = rechnungFuerAbschlagZeile(z.id, rechnungen)
      const betrag = Number(r?.brutto ?? z.brutto) || 0
      if (st === 'bezahlt') bezahlt += betrag
      else if (st === 'gestellt') gestellt += betrag
    }
    return { bezahltBrutto: bezahlt, gestelltBrutto: gestellt }
  }, [kontext.zeilen, rechnungen])

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
    const r = rechnungFuerAbschlagZeile(zeileId, rechnungen)

    if (st === 'geplant') {
      items.push({
        icon: 'file-invoice',
        label: 'Rechnung erstellen',
        onClick: () => onCreateInvoice(),
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
      // „Nochmal versenden“ → OFFENE-PUNKTE (kein verdrahteter Resend von hier)
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

  if (gesamtNetto <= 0) {
    return (
      <MockCard title="Zahlplan" icon="calculator">
        <div className="zahlplan-empty">
          <MockIcon ctx="empty" n="calculator" size={26} />
          <div className="zahlplan-empty__title">Noch kein Abschlagsplan</div>
          <div className="zahlplan-empty__text">
            Zuerst Auftragspositionen mit Betrag anlegen, dann die Auftragssumme in Abschläge aufteilen.
          </div>
        </div>
      </MockCard>
    )
  }

  if (!hasPlan) {
    return (
      <>
        <MockCard title="Zahlplan" icon="calculator">
          <div className="zahlplan-empty">
            <MockIcon ctx="empty" n="calculator" size={26} />
            <div className="zahlplan-empty__title">Noch kein Abschlagsplan</div>
            <div className="zahlplan-empty__text">
              Teile die Auftragssumme von <b>{formatEurBetrag(gesamtNetto)}</b> netto in Abschläge auf — z. B. 30 %
              bei Beginn, 40 % nach Rohbau, 30 % zur Schlussrechnung.
            </div>
            <MockBtn kind="primary" icon="plus" onClick={() => setEditorOpen(true)}>
              Abschlagsplan erstellen
            </MockBtn>
          </div>
        </MockCard>
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
        title="Zahlplan"
        icon="calculator"
        actions={
          <>
            <MockBtn sm kind="ghost" icon="pencil" onClick={() => setEditorOpen(true)}>
              Plan bearbeiten
            </MockBtn>
            <MockBtn
              sm
              kind="primary"
              icon="file-invoice"
              onClick={() => {
                const next = kontext.zeilen.find((z) => zahlplanRateStatus(z.id, rechnungen) === 'geplant')
                if (next) onCreateInvoice()
                else onCreateInvoice()
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
            const st = zahlplanRateStatus(z.id, rechnungen)
            const r = rechnungFuerAbschlagZeile(z.id, rechnungen)
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
      </MockCard>

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
