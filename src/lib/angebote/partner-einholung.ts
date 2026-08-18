import type { AngebotHandwerkerRow } from '@/lib/types'

export function istKundenAngebot(row: {
  ist_partner_einholung?: boolean | null
} | null | undefined): boolean {
  return row?.ist_partner_einholung !== true
}

export function filterKundenAngebote<T extends { ist_partner_einholung?: boolean | null }>(
  rows: T[] | null | undefined
): T[] {
  return (rows ?? []).filter(istKundenAngebot)
}

export function istPartnerLvZuweisung(row: {
  ohne_lv?: boolean | null
} | null | undefined): boolean {
  return row?.ohne_lv === true
}

export function partnerLvZuweisungen<T extends { ohne_lv?: boolean | null }>(
  rows: T[] | null | undefined
): T[] {
  return (rows ?? []).filter(istPartnerLvZuweisung)
}

export function ohnePartnerLvZuweisungen<T extends { ohne_lv?: boolean | null }>(
  rows: T[] | null | undefined
): T[] {
  return (rows ?? []).filter((r) => !istPartnerLvZuweisung(r))
}

export function darfPartnerLvAnfrageLoeschen(z: Pick<
  AngebotHandwerkerRow,
  'status' | 'hw_status' | 'hw_eingereicht_at'
>): boolean {
  const hwSt = String(z.hw_status ?? '').toLowerCase()
  if (z.hw_eingereicht_at?.trim() || hwSt === 'eingereicht' || hwSt === 'bestaetigt' || hwSt === 'uebernommen') {
    return false
  }
  const st = String(z.status ?? '').toLowerCase()
  if (st === 'akzeptiert' && hwSt && hwSt !== 'offen') return false
  return true
}
