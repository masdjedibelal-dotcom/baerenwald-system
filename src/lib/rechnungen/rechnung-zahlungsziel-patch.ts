import { normalizeFaelligAmYmd } from '@/lib/dates/werktag'
import { tageSeitFaelligkeitRechnung } from '@/lib/rechnungen/mahnverlauf'
import {
  faelligAmFromZahlfrist,
  patchZahlungsbedingungenMitZahlfrist,
  type ZahlfristSeg,
} from '@/lib/zahlfrist'

export function berechneRechnungZahlungszielUpdate(input: {
  zahlfrist: ZahlfristSeg
  zahlfristDatum: string
  rechnungsdatum: string
  bisherigeZahlungsbedingungen?: string | null
}): { faellig_am: string; zahlungsbedingungen: string } {
  const basisDatum = input.rechnungsdatum.trim().slice(0, 10) || new Date().toISOString().slice(0, 10)
  const faelligRaw = faelligAmFromZahlfrist(
    input.zahlfrist,
    input.zahlfristDatum,
    new Date(`${basisDatum}T12:00:00`)
  )
  const faellig_am = normalizeFaelligAmYmd(faelligRaw) ?? faelligRaw
  const zahlungsbedingungen = patchZahlungsbedingungenMitZahlfrist(
    input.bisherigeZahlungsbedingungen,
    input.zahlfrist,
    input.zahlfrist === 'datum' ? input.zahlfristDatum : faellig_am
  )
  return { faellig_am, zahlungsbedingungen }
}

/** Mahn-Timestamps zurücksetzen, wenn neue Fälligkeit noch nicht überfällig ist. */
export function mahnungFelderBeiFaelligkeitAenderung(
  neueFaelligAm: string | null,
  alteFaelligAm: string | null | undefined
): Partial<{
  erinnerung_7_sent_at: null
  erinnerung_21_sent_at: null
  intern_warnung_30_at: null
}> {
  const neu = normalizeFaelligAmYmd(neueFaelligAm)
  const alt = normalizeFaelligAmYmd(alteFaelligAm)
  if (!neu || neu === alt) return {}
  if (tageSeitFaelligkeitRechnung(neu) <= 0) {
    return {
      erinnerung_7_sent_at: null,
      erinnerung_21_sent_at: null,
      intern_warnung_30_at: null,
    }
  }
  return {}
}

export function rechnungZahlungszielIstBearbeitbar(input: {
  status?: string | null
  beleg_typ?: string | null
  richtung?: string | null
}): boolean {
  const st = String(input.status ?? '').toLowerCase()
  if (st !== 'entwurf' && st !== 'gesendet' && st !== 'versendet') return false
  if (String(input.beleg_typ ?? 'rechnung') === 'gutschrift') return false
  if (String(input.richtung ?? '') === 'eingehend') return false
  return true
}
