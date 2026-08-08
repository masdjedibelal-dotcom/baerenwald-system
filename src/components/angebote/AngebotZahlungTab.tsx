'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import {
  parseZahlungsbedingungenKey,
  type AngebotWizardZahlungsbedingung,
} from '@/lib/angebote/angebot-wizard-types'
import { zahlfristSegFromAngebotMeta } from '@/lib/angebote/angebot-zahlfrist'
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

/** Angebot · Zahlung — nur Zahlungsziel (kein Plan-Vorschlag). */
export function AngebotZahlungTab({ detail }: { detail: AngebotDetail }) {
  const zKey = parseZahlungsbedingungenKey(detail.zahlungsbedingungen, detail.kunden?.typ)

  return (
    <MockCard title="Zahlungsbedingungen" icon="calculator">
      <div className="props">
        <div className="prop">
          <span className="prop-l">Zahlungsziel</span>
          <span className="prop-v">{zahlungszielKurz(zKey)}</span>
        </div>
      </div>
    </MockCard>
  )
}
