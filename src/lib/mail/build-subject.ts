/**
 * F5 Betreff-Schema für Transaktionsmails.
 * Auth-Mails (OTP, Passwort, Bestätigung) nutzen diese Helfer nicht.
 */

function cleanPart(s: string | null | undefined, fallback = ''): string {
  return (s ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[·|]\s*/g, ', ')
    .trim() || fallback
}

/**
 * Standard: `[Objekt/Adresse] – [Ereignis]`
 * Mit Belegnummer: `… – [Ereignis] · AG-2026-041`
 */
export function buildSubject(opts: {
  /** Objektname oder Adresse (Kurzform). */
  objekt?: string | null
  /** Ereignis-Label, z. B. „Angebot bereit“, „Rechnung“. */
  ereignis: string
  /** Angebots-/Rechnungsnummer o. Ä. — wird ans Ende gehängt. */
  nummer?: string | null
  /** Fallback wenn kein Objekt (default „Vorgang“). */
  objektFallback?: string
}): string {
  const objekt = cleanPart(opts.objekt, opts.objektFallback ?? 'Vorgang')
  const ereignis = cleanPart(opts.ereignis, 'Update')
  const nummer = cleanPart(opts.nummer)
  const base = `${objekt} – ${ereignis}`
  return nummer ? `${base} · ${nummer}` : base
}

/**
 * Partner: `[Gewerk, Ort] – [Ereignis]`
 * Ort optional; Gewerk fehlt → „Partner“.
 */
export function buildPartnerSubject(opts: {
  gewerk?: string | null
  ort?: string | null
  /** Fertige linke Seite, z. B. „Maler, München“ — überschreibt gewerk/ort. */
  gewerkOrt?: string | null
  ereignis: string
}): string {
  const left =
    cleanPart(opts.gewerkOrt) ||
    [cleanPart(opts.gewerk), cleanPart(opts.ort)].filter(Boolean).join(', ') ||
    'Partner'
  const ereignis = cleanPart(opts.ereignis, 'Update')
  return `${left} – ${ereignis}`
}

/** Intern: Präfix „Intern · “ + Standard-Schema. */
export function buildInternSubject(opts: {
  objekt?: string | null
  ereignis: string
  nummer?: string | null
}): string {
  return `Intern · ${buildSubject({ ...opts, objektFallback: 'Hinweis' })}`
}
