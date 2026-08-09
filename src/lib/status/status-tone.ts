/**
 * Spec §11 — vier Töne, feste Bedeutung.
 * Mapping-Layer: DB-/UI-Status → Tone (keine Enum-Migration).
 */

export type StatusTone = 'grau' | 'blau' | 'gruen' | 'rot'

export type StatusEntry = {
  label: string
  tone: StatusTone
}

/** Spec: unbekannte Status müssen Fallback bekommen. */
export const STATUSES: Record<string, StatusEntry> = {
  // Anfrage (Lead DB)
  neu: { label: 'Neu', tone: 'blau' },
  kontaktiert: { label: 'Kontaktiert', tone: 'blau' },
  termin: { label: 'Termin', tone: 'blau' },
  angebot: { label: 'Angebot', tone: 'blau' },
  auftrag: { label: 'Auftrag', tone: 'gruen' },
  abgeschlossen: { label: 'Abgeschlossen', tone: 'gruen' },
  abgebrochen: { label: 'Verloren', tone: 'rot' },
  verloren: { label: 'Verloren', tone: 'rot' },
  qualifiziert: { label: 'Qualifiziert', tone: 'blau' },

  // Angebot (status_einfach + DB)
  entwurf: { label: 'Entwurf', tone: 'grau' },
  gesendet: { label: 'Gesendet', tone: 'blau' },
  gesendet_kunde: { label: 'An Kunde gesendet', tone: 'blau' },
  gesendet_handwerker: { label: 'An Partner gesendet', tone: 'blau' },
  handwerker_akzeptiert: { label: 'Partner akzeptiert', tone: 'blau' },
  angenommen: { label: 'Angenommen', tone: 'gruen' },
  kunde_akzeptiert: { label: 'Angenommen', tone: 'gruen' },
  abgelehnt: { label: 'Abgelehnt', tone: 'rot' },
  abgelaufen: { label: 'Abgelaufen', tone: 'rot' },
  ersetzt: { label: 'Ersetzt', tone: 'grau' },
  ueberarbeitet: { label: 'Überarbeitet', tone: 'grau' },

  // Auftrag
  offen: { label: 'Geplant', tone: 'grau' },
  geplant: { label: 'Geplant', tone: 'grau' },
  in_arbeit: { label: 'Aktiv', tone: 'blau' },
  aktiv: { label: 'Aktiv', tone: 'blau' },
  abnahme: { label: 'Abnahme', tone: 'blau' },
  fertig: { label: 'Fertig', tone: 'gruen' },
  erledigt: { label: 'Erledigt', tone: 'gruen' },
  abgenommen: { label: 'Abgenommen', tone: 'gruen' },
  storniert: { label: 'Storniert', tone: 'rot' },

  // Rechnung
  versendet: { label: 'Versendet', tone: 'blau' },
  bezahlt: { label: 'Bezahlt', tone: 'gruen' },
  ueberfaellig: { label: 'Überfällig', tone: 'rot' },
  reklamiert: { label: 'Reklamiert', tone: 'rot' },
  gutschrift: { label: 'Gutschrift', tone: 'grau' },

  // Generisch
  signiert: { label: 'Signiert', tone: 'gruen' },
  in_arbeit_alt: { label: 'In Arbeit', tone: 'blau' },
}

export const STATUS_TONE: Record<string, StatusTone> = Object.fromEntries(
  Object.entries(STATUSES).map(([k, v]) => [k, v.tone])
) as Record<string, StatusTone>

/** Spec-Fallback: STATUSES[x] || { label: x, kind/tone: neu→blau } */
export function resolveStatus(status: string | null | undefined): StatusEntry {
  const raw = String(status ?? '').trim()
  if (!raw) return { label: '—', tone: 'grau' }
  const key = raw.toLowerCase()
  return STATUSES[key] || { label: raw, tone: 'blau' }
}

export function statusTone(status: string | null | undefined): StatusTone {
  return resolveStatus(status).tone
}

/** Map Spec-Tone → bestehendes MockBadge-kind */
export function toneToMockBadgeKind(tone: StatusTone): string {
  switch (tone) {
    case 'grau':
      return 'plain'
    case 'blau':
      return 'aktiv'
    case 'gruen':
      return 'fertig'
    case 'rot':
      return 'storniert'
    default:
      return 'neu'
  }
}
