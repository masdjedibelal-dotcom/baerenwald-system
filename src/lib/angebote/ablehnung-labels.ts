/** Werte in DB-Spalte angebot_handwerker.ablehnung_grund */
export const HANDWERKER_ABLEHNUNG_GRUND_VALUES = [
  'keine_kapazitaet',
  'zu_kurzfristig',
  'ausserhalb_einsatzgebiet',
  'gewerk_passt_nicht',
  'sonstiges',
] as const

export type HandwerkerAblehnungGrund = (typeof HANDWERKER_ABLEHNUNG_GRUND_VALUES)[number]

export const HANDWERKER_ABLEHNUNG_GRUND_LABELS: Record<HandwerkerAblehnungGrund, string> = {
  keine_kapazitaet: 'Keine Kapazität',
  zu_kurzfristig: 'Zu kurzfristig',
  ausserhalb_einsatzgebiet: 'Außerhalb Einsatzgebiet',
  gewerk_passt_nicht: 'Gewerk passt nicht',
  sonstiges: 'Sonstiges',
}

export function isHandwerkerAblehnungGrund(v: string): v is HandwerkerAblehnungGrund {
  return (HANDWERKER_ABLEHNUNG_GRUND_VALUES as readonly string[]).includes(v)
}

export const KUNDE_ABLEHNUNG_GRUND_VALUES = [
  'zu_teuer',
  'konkurrenz',
  'kein_interesse',
  'sonstiges',
  // Legacy-Werte (bestehende Datensätze)
  'anderes_angebot',
  'projekt_verschoben',
  'kein_feedback',
  'qualitaetszweifel',
] as const

export type KundeAblehnungGrund = (typeof KUNDE_ABLEHNUNG_GRUND_VALUES)[number]

export const KUNDE_ABLEHNUNG_GRUND_LABELS: Record<KundeAblehnungGrund, string> = {
  zu_teuer: 'Zu teuer',
  konkurrenz: 'Konkurrenz gewählt',
  kein_interesse: 'Kein Interesse mehr',
  sonstiges: 'Sonstiges',
  anderes_angebot: 'Anderes Angebot günstiger',
  projekt_verschoben: 'Projekt verschoben',
  kein_feedback: 'Kein Feedback erhalten',
  qualitaetszweifel: 'Qualitätszweifel',
}

/** Optionen für Ablehnungs-Modal (neue Angebots-Detailseite) */
export const KUNDE_ABLEHNUNG_GRUND_OPTIONS = [
  'zu_teuer',
  'konkurrenz',
  'kein_interesse',
  'sonstiges',
] as const satisfies readonly KundeAblehnungGrund[]

export function isKundeAblehnungGrund(v: string): v is KundeAblehnungGrund {
  return (KUNDE_ABLEHNUNG_GRUND_VALUES as readonly string[]).includes(v)
}

export function labelHandwerkerAblehnung(raw: string | null | undefined): string {
  if (!raw) return '—'
  return isHandwerkerAblehnungGrund(raw)
    ? HANDWERKER_ABLEHNUNG_GRUND_LABELS[raw]
    : raw
}

export function labelKundeAblehnung(raw: string | null | undefined): string {
  if (!raw) return '—'
  return isKundeAblehnungGrund(raw) ? KUNDE_ABLEHNUNG_GRUND_LABELS[raw] : raw
}
