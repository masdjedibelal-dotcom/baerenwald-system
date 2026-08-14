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
  /** Kurz für Banner */
  ergebnisLabel?: string | null
  leistungenOk?: number
  leistungenGesamt?: number
  maengelTitel?: string[]
  unterzeichnerHw?: string | null
  unterzeichnerKunde?: string | null
  ort?: string | null
}

/**
 * Nur Partner, die eine Teilabnahme eingereicht/signiert haben.
 * Bloße Zuweisung oder Nacharbeit ohne neue Abnahme zählen nicht — kein zweites Freigabe-Gate.
 */
export function abnahmeRelevanteZeilen(
  zeilen: AbnahmeHwFreigabeZeile[]
): AbnahmeHwFreigabeZeile[] {
  return zeilen.filter(
    (z) =>
      Boolean(z.protokollId?.trim()) ||
      Boolean(z.abnahmeSigniertAm?.trim()) ||
      z.freigabeStatus != null
  )
}

/** Alle eingereichten Teilabnahmen sind freigegeben. */
export function alleZugewiesenenHwFreigegeben(zeilen: AbnahmeHwFreigabeZeile[]): boolean {
  const relevant = abnahmeRelevanteZeilen(zeilen)
  if (!relevant.length) return true
  return relevant.every((z) => z.freigabeStatus === 'freigegeben')
}

export function kannGesamtabnahmeErzeugen(zeilen: AbnahmeHwFreigabeZeile[]): {
  ok: boolean
  message?: string
} {
  const relevant = abnahmeRelevanteZeilen(zeilen)
  if (!relevant.length) {
    return { ok: true }
  }
  if (!relevant.every((z) => z.freigabeStatus === 'freigegeben')) {
    const offen = relevant.filter((z) => z.freigabeStatus !== 'freigegeben')
    return {
      ok: false,
      message: `Zuerst eingereichte Teilabnahmen freigeben (${offen.length} offen) — oder über „Auftrag abschließen“ das Protokoll prüfen und speichern.`,
    }
  }
  return { ok: true }
}

/** HW hat Abnahme eingereicht → CRM-Abschluss zeigt Vorschau statt manueller Checkliste. */
export function hatHwAbnahmeZurAbschlussVorschau(
  zeilen: AbnahmeHwFreigabeZeile[]
): boolean {
  return abnahmeRelevanteZeilen(zeilen).some(
    (z) =>
      Boolean(z.protokollId) &&
      (z.freigabeStatus === 'zur_freigabe' || z.freigabeStatus === 'freigegeben')
  )
}
