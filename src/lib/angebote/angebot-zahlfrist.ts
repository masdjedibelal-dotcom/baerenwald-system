import type { AngebotWizardMeta, AngebotWizardZahlungsbedingung } from '@/lib/angebote/angebot-wizard-types'
import {
  type ZahlfristSeg,
  plusDaysIso,
  zahlfristAnzeigeText,
} from '@/lib/zahlfrist'

/** Segment aus persistierten Zahlungsbedingungen (Mock-Zahlfrist). */
export function zahlfristSegFromAngebotMeta(meta: {
  zahlungsbedingungen: AngebotWizardZahlungsbedingung
  zahlfrist_datum?: string
}): { seg: ZahlfristSeg; datum: string } {
  const datum = meta.zahlfrist_datum?.trim() || plusDaysIso(14)
  switch (meta.zahlungsbedingungen) {
    case '7_tage':
      return { seg: '7', datum }
    case '14_tage':
      return { seg: '14', datum }
    case '30_tage':
      return { seg: '30', datum }
    case 'individuell':
      return { seg: 'datum', datum }
    case 'sofort_netto':
      return { seg: '7', datum }
    default:
      return { seg: '14', datum }
  }
}

export function angebotMetaPatchFromZahlfrist(
  seg: ZahlfristSeg,
  datumYmd: string
): Pick<AngebotWizardMeta, 'zahlungsbedingungen' | 'zahlfrist_datum'> {
  if (seg === 'datum') {
    return {
      zahlungsbedingungen: 'individuell',
      zahlfrist_datum: datumYmd.trim() || plusDaysIso(14),
    }
  }
  const key = `${seg}_tage` as AngebotWizardZahlungsbedingung
  return { zahlungsbedingungen: key, zahlfrist_datum: undefined }
}

export function angebotZahlfristText(meta: {
  zahlungsbedingungen: AngebotWizardZahlungsbedingung
  zahlfrist_datum?: string
}): string {
  const { seg, datum } = zahlfristSegFromAngebotMeta(meta)
  return zahlfristAnzeigeText(seg, datum)
}
