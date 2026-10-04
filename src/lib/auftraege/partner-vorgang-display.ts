import type { AuftragPosition } from '@/lib/types'

export type HandwerkerAntwortVariant = 'angenommen' | 'abgelehnt' | 'offen' | 'nicht_gesendet'

export type HandwerkerAntwortAnzeige = {
  label: string
  variant: HandwerkerAntwortVariant
}

const PENDING = new Set(['angefragt', 'zugewiesen', 'ausstehend', 'offen', 'warten', ''])

/** Partner-Antwort auf die Anfrage (akzeptiert / abgelehnt / noch offen). */
export function handwerkerAntwortAnzeige(
  pos: Pick<AuftragPosition, 'handwerker_id' | 'handwerker_status'>
): HandwerkerAntwortAnzeige | null {
  if (!pos.handwerker_id) return null

  const st = (pos.handwerker_status ?? '').toLowerCase()

  // bestaetigt = Partner hat zugesagt / arbeitet schon (Regie-Nachtrag, Start vor Ort)
  if (
    st === 'akzeptiert' ||
    st === 'angenommen' ||
    st === 'bestaetigt' ||
    st === 'erledigt'
  ) {
    return { label: 'Angenommen', variant: 'angenommen' }
  }
  if (st === 'abgelehnt') {
    return { label: 'Abgelehnt', variant: 'abgelehnt' }
  }
  if (st === 'zugewiesen' || st === '') {
    return { label: 'Nicht gesendet', variant: 'nicht_gesendet' }
  }
  if (st === 'angefragt') {
    return { label: 'Angefragt', variant: 'offen' }
  }
  if (PENDING.has(st)) {
    return { label: 'Angefragt', variant: 'offen' }
  }

  return { label: 'Angefragt', variant: 'offen' }
}
