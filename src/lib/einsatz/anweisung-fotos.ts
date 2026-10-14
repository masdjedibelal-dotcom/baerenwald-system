/**
 * Fotos zur Einsatz-Anweisung: öffentliche Bild-URLs im Bucket „protokolle“ unter <auftrag>/einsatz/.
 * Mail, WhatsApp und Portal zeigen sie direkt (wie Tagebuch-Fotos).
 */
export const EINSATZ_FOTOS_MAX = 10

export function anweisungFotos(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.map((u) => String(u ?? '').trim()).filter((u) => /^https:\/\//i.test(u)) : []
}

/** Nur Fotos, die das CRM für diesen Auftrag hochgeladen hat (keine fremden Links). */
export function istEinsatzFotoUrl(url: string, auftragId: string): boolean {
  return url.includes(`/storage/v1/object/public/protokolle/${auftragId}/einsatz/`)
}
