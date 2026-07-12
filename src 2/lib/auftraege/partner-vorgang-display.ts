import type { AuftragPosition } from '@/lib/types'

export type PartnerVorgangChipVariant = 'entfernt' | 'geaendert' | 'neu' | 'gesendet'

export type HandwerkerAntwortVariant = 'angenommen' | 'abgelehnt' | 'offen' | 'nicht_gesendet'

export type HandwerkerAntwortAnzeige = {
  label: string
  variant: HandwerkerAntwortVariant
}

export type PartnerVorgangAnzeige = {
  label: string
  variant: PartnerVorgangChipVariant
}

const PENDING = new Set(['angefragt', 'zugewiesen', 'ausstehend', 'offen', 'warten', ''])

/** CRM-Hinweis: Was der Partner im Tab „Vorgänge“ noch bestätigen muss. */
export function partnerVorgangAnzeige(
  pos: Pick<AuftragPosition, 'aenderung_typ' | 'handwerker_status' | 'handwerker_id'>
): PartnerVorgangAnzeige | null {
  if (!pos.handwerker_id) return null

  const typ = (pos.aenderung_typ ?? '').toLowerCase()
  const st = (pos.handwerker_status ?? '').toLowerCase()
  const pending = PENDING.has(st)

  if (typ === 'entfernt' && pending) {
    return { label: 'Entfernt — wartet auf Partner', variant: 'entfernt' }
  }
  if (typ === 'geaendert' && pending) {
    return { label: 'Geändert — wartet auf Partner', variant: 'geaendert' }
  }
  if (typ === 'neu' && (st === 'zugewiesen' || st === '')) {
    return { label: 'Noch nicht gesendet', variant: 'neu' }
  }
  if (typ === 'neu' && st === 'angefragt') {
    return { label: 'Neu — wartet auf Partner', variant: 'gesendet' }
  }
  return null
}

/** Partner-Antwort auf die Anfrage (akzeptiert / abgelehnt / noch offen). */
export function handwerkerAntwortAnzeige(
  pos: Pick<AuftragPosition, 'handwerker_id' | 'handwerker_status'>
): HandwerkerAntwortAnzeige | null {
  if (!pos.handwerker_id) return null

  const st = (pos.handwerker_status ?? '').toLowerCase()

  if (st === 'akzeptiert') {
    return { label: 'Angenommen', variant: 'angenommen' }
  }
  if (st === 'abgelehnt') {
    return { label: 'Abgelehnt', variant: 'abgelehnt' }
  }
  if (st === 'zugewiesen' || st === '') {
    return { label: 'Nicht gesendet', variant: 'nicht_gesendet' }
  }
  if (PENDING.has(st)) {
    return { label: 'Offen', variant: 'offen' }
  }

  return { label: 'Offen', variant: 'offen' }
}

export function istPartnerEntfernungAusstehend(
  pos: Pick<AuftragPosition, 'aenderung_typ' | 'handwerker_status'>
): boolean {
  return (
    (pos.aenderung_typ ?? '').toLowerCase() === 'entfernt' &&
    PENDING.has((pos.handwerker_status ?? '').toLowerCase())
  )
}
