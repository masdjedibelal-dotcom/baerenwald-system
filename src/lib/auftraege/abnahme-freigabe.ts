/** Teilabnahme / CRM-Freigabe / Gesamtabnahme — Gates & Labels. */

export type AbnahmeProtokollEbene = 'handwerker' | 'gesamt'

export type AbnahmeFreigabeStatus =
  | 'entwurf'
  | 'zur_freigabe'
  | 'freigegeben'
  | 'abgelehnt'

export const ABNAHME_FREIGABE_LABELS: Record<AbnahmeFreigabeStatus, string> = {
  entwurf: 'Entwurf',
  zur_freigabe: 'Zur Freigabe',
  freigegeben: 'Freigegeben',
  abgelehnt: 'Abgelehnt',
}

export function normalizeAbnahmeFreigabeStatus(raw: unknown): AbnahmeFreigabeStatus {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (s === 'zur_freigabe' || s === 'freigegeben' || s === 'abgelehnt') return s
  return 'entwurf'
}

export function normalizeAbnahmeEbene(raw: unknown): AbnahmeProtokollEbene {
  return String(raw ?? '')
    .trim()
    .toLowerCase() === 'handwerker'
    ? 'handwerker'
    : 'gesamt'
}

export type AbnahmeHwFreigabeZeile = {
  handwerkerId: string
  handwerkerName: string
  abnahmeSigniertAm: string | null
  protokollId: string | null
  freigabeStatus: AbnahmeFreigabeStatus | null
  abnahmeDatum: string | null
  pdfUrl: string | null
  maengelOffen: number
}

/** Alle zugewiesenen Partner haben ein freigegebenes Teilabnahme-Protokoll. */
export function alleZugewiesenenHwFreigegeben(zeilen: AbnahmeHwFreigabeZeile[]): boolean {
  if (!zeilen.length) return true
  return zeilen.every((z) => z.freigabeStatus === 'freigegeben')
}

export function kannGesamtabnahmeErzeugen(zeilen: AbnahmeHwFreigabeZeile[]): {
  ok: boolean
  message?: string
} {
  if (!zeilen.length) {
    return { ok: true }
  }
  if (!alleZugewiesenenHwFreigegeben(zeilen)) {
    const offen = zeilen.filter((z) => z.freigabeStatus !== 'freigegeben')
    return {
      ok: false,
      message: `Gesamtabnahme erst möglich, wenn alle zugewiesenen Partner freigegeben sind (${offen.length} offen).`,
    }
  }
  return { ok: true }
}
