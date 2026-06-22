import type { Angebot, AngebotPosition, AngebotStatus } from '@/lib/types'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import { kundeDisplayName, type KundeListenNamePick } from '@/lib/kunde-stammdaten'
import { BEREICH_LABELS } from '@/lib/utils'

export type AngebotStatusEinfach =
  | 'entwurf'
  | 'gesendet'
  | 'angenommen'
  | 'abgelehnt'
  | 'abgelaufen'
  | 'ersetzt'

export const ANGEBOT_EINFACH_LABELS: Record<AngebotStatusEinfach, string> = {
  entwurf: 'Entwurf',
  gesendet: 'Gesendet',
  angenommen: 'Angenommen',
  abgelehnt: 'Abgelehnt',
  abgelaufen: 'Abgelaufen',
  ersetzt: 'Ersetzt',
}

export function heuteYmd(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysYmd(fromYmd: string, days: number): string {
  const d = new Date(`${fromYmd}T12:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate?.trim()) return null
  const target = new Date(`${isoDate.slice(0, 10)}T23:59:59`)
  const now = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function isGueltigAbgelaufen(gueltigBis: string | null | undefined): boolean {
  const d = daysUntil(gueltigBis)
  return d != null && d < 0
}

export type AngebotStatusEinfachRow = {
  status: string
  status_einfach?: string | null
  gueltig_bis?: string | null
}

/** DB-Status oder Fallback aus legacy `status`. */
export function resolveStatusEinfach(row: AngebotStatusEinfachRow): AngebotStatusEinfach {
  const raw = row.status_einfach?.trim()
  if (
    raw === 'entwurf' ||
    raw === 'gesendet' ||
    raw === 'angenommen' ||
    raw === 'abgelehnt' ||
    raw === 'ersetzt'
  ) {
    if (raw === 'gesendet' && isGueltigAbgelaufen(row.gueltig_bis)) return 'abgelaufen'
    return raw
  }
  const s = row.status as AngebotStatus
  if (s === 'kunde_akzeptiert') return 'angenommen'
  if (s === 'abgelehnt') return 'abgelehnt'
  if (
    s === 'gesendet_kunde' ||
    s === 'gesendet_handwerker' ||
    s === 'handwerker_akzeptiert'
  ) {
    return isGueltigAbgelaufen(row.gueltig_bis) ? 'abgelaufen' : 'gesendet'
  }
  return 'entwurf'
}

export function matchesEinfachFilter(
  row: AngebotStatusEinfachRow,
  filter: '' | AngebotStatusEinfach
): boolean {
  if (!filter) return true
  const eff = resolveStatusEinfach(row)
  if (filter === 'abgelaufen') return eff === 'abgelaufen'
  if (filter === 'ersetzt') return eff === 'ersetzt'
  if (filter === 'gesendet') return eff === 'gesendet'
  return eff === filter
}

export type GueltigBisTone = 'normal' | 'warn' | 'danger'

export function gueltigBisTone(gueltigBis: string | null | undefined): GueltigBisTone {
  const d = daysUntil(gueltigBis)
  if (d == null) return 'normal'
  if (d < 0) return 'danger'
  if (d < 7) return 'danger'
  if (d < 14) return 'warn'
  return 'normal'
}

export function gueltigBisClass(tone: GueltigBisTone): string {
  if (tone === 'danger') return 'text-bw-danger font-medium'
  if (tone === 'warn') return 'text-amber-700 font-medium'
  return 'text-bw-text'
}

export function kundeNameAusAngebot(a: {
  kunden?: KundeListenNamePick | null
  leads?: { kontakt_name?: string | null } | null
}): string {
  if (a.kunden) {
    const display = kundeDisplayName(a.kunden)
    if (display !== '—') return display
  }
  return a.leads?.kontakt_name?.trim() || 'Ohne Kunde'
}

export function leistungAnzeige(a: {
  leistungsumfang?: string | null
  leads?: { bereiche?: string[] | null } | null
}): string {
  const lf = a.leistungsumfang?.trim()
  if (lf) return lf
  const bereiche = a.leads?.bereiche ?? []
  if (bereiche.length) {
    return bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  }
  return '—'
}

/** Ein Gesamtbetrag aus DB-Feldern (kein Von-bis). */
export function resolveAngebotGesamtbetrag(
  gesamt_fix: number | null | undefined,
  gesamt_min: number | null | undefined,
  gesamt_max: number | null | undefined
): number | null {
  if (gesamt_fix != null && gesamt_fix > 0) return gesamt_fix
  const min = Number(gesamt_min) || 0
  const max = Number(gesamt_max) || 0
  if (max > 0) return max
  if (min > 0) return min
  return null
}

export function betragAnzeige(
  gesamt_fix: number | null | undefined,
  gesamt_min: number | null | undefined,
  gesamt_max: number | null | undefined
): string {
  const total = resolveAngebotGesamtbetrag(gesamt_fix, gesamt_min, gesamt_max)
  if (total == null) return '—'
  return `${total.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function angebotSummenBrutto(positionen: AngebotPosition[], mwstSatz = 19) {
  const s = summenAusPositionen(positionen, mwstSatz)
  const netto =
    s.nettoMax > 0 ? s.nettoMax : s.nettoMin > 0 ? s.nettoMin : (s.nettoMin + s.nettoMax) / 2
  const mwst = Math.round(netto * (mwstSatz / 100) * 100) / 100
  const brutto = Math.round((netto + mwst) * 100) / 100
  return { netto, mwst, brutto, mwstSatz }
}

export function gesendetAmWert(a: Pick<Angebot, 'gesendet_am' | 'gesendet_kunde_at'>): string | null {
  return a.gesendet_am ?? a.gesendet_kunde_at ?? null
}

/** Spätestes Ereignis: Versand oder Verlängerung — danach +7 Tage Erinnerung. */
export function erinnerungReferenzAm(
  row: Pick<Angebot, 'gesendet_am' | 'gesendet_kunde_at' | 'verlaengert_am'>
): string | null {
  const gesendet = gesendetAmWert(row)
  const verl = row.verlaengert_am?.trim() || null
  if (verl && gesendet) {
    return new Date(verl).getTime() >= new Date(gesendet).getTime() ? verl : gesendet
  }
  return verl ?? gesendet
}

export function erinnerungGeplantAm(refIso: string | null | undefined): string | null {
  if (!refIso?.trim()) return null
  const d = new Date(refIso)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + 7)
  return d.toISOString()
}

/** @deprecated Nutze erinnerungGeplantAm(erinnerungReferenzAm(...)) */
export function nachfassGeplantAm(gesendetAm: string | null): string | null {
  return erinnerungGeplantAm(gesendetAm)
}
