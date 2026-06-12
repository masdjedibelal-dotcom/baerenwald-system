'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { ZahlungsplanEditor } from '@/components/rechnungen/ZahlungsplanEditor'
import { saveAuftragZahlungsplan } from '@/app/(dashboard)/auftraege/zahlungsplan-actions'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  abschlagBereitsAbgerechnet,
  berechneZahlungsplan,
  emptyZahlungsplan,
  parseZahlungsplan,
  zahlungsplanVorlage50_50,
  type RechnungAbschlagLink,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import { toast } from '@/components/ui/app-toast'

export function AuftragZahlungsplanSection({
  auftragId,
  zahlungsplanRaw,
  gesamtNetto,
  rechnungen,
}: {
  auftragId: string
  zahlungsplanRaw: unknown
  gesamtNetto: number
  rechnungen: RechnungAbschlagLink[]
}) {
  const initial = useMemo(
    () => parseZahlungsplan(zahlungsplanRaw) ?? emptyZahlungsplan(),
    [zahlungsplanRaw]
  )
  const [plan, setPlan] = useState<Zahlungsplan>(
    initial.zeilen.length ? initial : zahlungsplanVorlage50_50()
  )
  const [pending, startTransition] = useTransition()

  const kontext = useMemo(() => berechneZahlungsplan(plan, gesamtNetto), [plan, gesamtNetto])

  function speichern() {
    if (!plan.zeilen.length) {
      toast.error('Mindestens eine Abschlagszeile erforderlich.')
      return
    }
    startTransition(async () => {
      const res = await saveAuftragZahlungsplan(auftragId, plan)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Zahlungsplan gespeichert')
    })
  }

  if (gesamtNetto <= 0) {
    return (
      <Card title="Zahlungsplan">
        <p className="text-sm text-bw-text-muted">
          Zuerst Auftragspositionen mit Betrag anlegen, dann Abschlagsplan definieren.
        </p>
      </Card>
    )
  }

  return (
    <Card
      title="Zahlungsplan"
      action={
        <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={speichern}>
          {pending ? 'Speichere…' : 'Speichern'}
        </button>
      }
    >
      <p className="mb-3 text-sm text-bw-text-muted">
        Abschlagsrechnungen orientieren sich an diesem Plan. Bereits gestellte Abschläge sind markiert.
      </p>
      <ZahlungsplanEditor plan={plan} onChange={setPlan} gesamtNetto={gesamtNetto} showVorlagen />
      <ul className="mt-4 space-y-1.5 border-t border-bw-border pt-3 text-sm">
        {kontext.zeilen.map((z) => {
          const erledigt = abschlagBereitsAbgerechnet(z.id, rechnungen)
          return (
            <li key={z.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className={erledigt ? 'text-bw-text-muted line-through' : 'text-bw-text'}>
                {z.istSchluss ? 'Schluss' : `Abschlag ${z.index}`} — {z.titel}
              </span>
              <span className="flex items-center gap-2 tabular-nums">
                {formatEurBetrag(z.brutto)} brutto
                <span
                  className={
                    erledigt
                      ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-900'
                      : 'rounded-full bg-bw-surface px-2 py-0.5 text-[11px] font-medium text-bw-text-muted'
                  }
                >
                  {erledigt ? 'abgerechnet' : 'offen'}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
