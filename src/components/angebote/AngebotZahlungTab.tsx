'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import {
  parseZahlungsbedingungenKey,
  type AngebotWizardZahlungsbedingung,
} from '@/lib/angebote/angebot-wizard-types'
import { zahlfristSegFromAngebotMeta } from '@/lib/angebote/angebot-zahlfrist'
import {
  parseZahlungsplan,
  zahlungsplanLabelFuerAngebot,
  type Zahlungsplan,
} from '@/lib/rechnungen/zahlungsplan'
import type { AngebotDetail } from '@/lib/types'

function zahlungszielKurz(key: AngebotWizardZahlungsbedingung, zahlfristDatum?: string): string {
  const { seg, datum } = zahlfristSegFromAngebotMeta({
    zahlungsbedingungen: key,
    zahlfrist_datum: zahlfristDatum,
  })
  if (seg === 'datum') {
    try {
      return `bis ${new Date(`${datum}T12:00:00`).toLocaleDateString('de-DE')}`
    } catch {
      return `bis ${datum}`
    }
  }
  return `${seg} Tage`
}

function abschlaegeLabel(plan: Zahlungsplan | null): string {
  if (!plan?.zeilen.length) return 'Vorschlag 30 / 40 / 30 %'
  const pct = plan.zeilen
    .filter((z) => z.typ === 'prozent')
    .map((z) => z.wert)
  if (pct.length >= 2) return `Vorschlag ${pct.join(' / ')} %`
  const full = zahlungsplanLabelFuerAngebot(plan)
  return full || 'Vorschlag 30 / 40 / 30 %'
}

/**
 * Angebot · Zahlung — Mock „Zahlungsbedingungen“ (Props, kein Plan-Editor).
 */
export function AngebotZahlungTab({ detail }: { detail: AngebotDetail }) {
  const zKey = parseZahlungsbedingungenKey(detail.zahlungsbedingungen, detail.kunden?.typ)
  const plan = parseZahlungsplan(detail.zahlungsplan)

  return (
    <MockCard title="Zahlungsbedingungen" icon="calculator">
      <div className="props">
        <div className="prop">
          <span className="prop-l">Zahlungsziel</span>
          <span className="prop-v">{zahlungszielKurz(zKey)}</span>
        </div>
        <div className="prop">
          <span className="prop-l">Abschläge</span>
          <span className="prop-v">{abschlaegeLabel(plan)}</span>
        </div>
        <div className="prop">
          <span className="prop-l">Zahlplan</span>
          <span className="prop-v">entsteht mit dem Auftrag</span>
        </div>
      </div>
    </MockCard>
  )
}
