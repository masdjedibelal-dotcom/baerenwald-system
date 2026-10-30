/** Pläne: Fälligkeit, Vorlagen, Bezeichnungen — ohne Server-Abhängigkeiten (auch im Browser nutzbar). */

export type PlanArt = 'reinigung' | 'kontrolle' | 'wartung' | 'pruefung' | 'winterdienst' | 'garten' | 'sonstiges'
export type IntervallEinheit = 'tag' | 'woche' | 'monat' | 'jahr'
export type PlanZustaendig = 'team' | 'teo'
export type ChecklistenPunkt = { id: string; text: string }

export const PLAN_ART_LABEL: Record<PlanArt, string> = {
  reinigung: 'Reinigung',
  kontrolle: 'Kontrolle',
  wartung: 'Wartung',
  pruefung: 'Prüfung',
  winterdienst: 'Winterdienst',
  garten: 'Garten',
  sonstiges: 'Sonstiges',
}

export function intervallText(einheit: IntervallEinheit, anzahl: number): string {
  if (anzahl === 1) return { tag: 'Täglich', woche: 'Wöchentlich', monat: 'Monatlich', jahr: 'Jährlich' }[einheit]
  const plural = { tag: 'Tage', woche: 'Wochen', monat: 'Monate', jahr: 'Jahre' }[einheit]
  return `Alle ${anzahl} ${plural}`
}

/** Nächste Fälligkeit nach `von` (ISO-Datum JJJJ-MM-TT). */
export function naechsteFaelligkeit(von: string, einheit: IntervallEinheit, anzahl: number): string {
  const d = new Date(`${von}T12:00:00Z`)
  if (einheit === 'tag') d.setUTCDate(d.getUTCDate() + anzahl)
  else if (einheit === 'woche') d.setUTCDate(d.getUTCDate() + 7 * anzahl)
  else if (einheit === 'monat') d.setUTCMonth(d.getUTCMonth() + anzahl)
  else d.setUTCFullYear(d.getUTCFullYear() + anzahl)
  return d.toISOString().slice(0, 10)
}

/** Heutiges Datum in Berlin (YYYY-MM-DD) — nicht UTC, sonst kippt der Tag nach Mitternacht. */
export function heute(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date())
}

export type PlanStand = 'ueberfaellig' | 'faellig' | 'geplant'

export function planStand(naechste: string, h = heute()): PlanStand {
  if (naechste < h) return 'ueberfaellig'
  if (naechste === h) return 'faellig'
  return 'geplant'
}

export const PLAN_STAND: Record<PlanStand, { label: string; badge: string }> = {
  ueberfaellig: { label: 'Überfällig', badge: 'storniert' },
  faellig: { label: 'Heute fällig', badge: 'warten' },
  geplant: { label: 'Geplant', badge: 'plain' },
}

export type PlanVorlage = {
  id: string
  titel: string
  art: PlanArt
  einheit: IntervallEinheit
  anzahl: number
  zustaendig: PlanZustaendig
  mieter: boolean
  punkte: string[]
}

/** Vorlagen — gesetzliche/übliche Prüfungen sind TEO-Aufgaben (werden bei Fälligkeit beauftragt). */
export const PLAN_VORLAGEN: PlanVorlage[] = [
  {
    id: 'treppenhaus',
    titel: 'Treppenhaus reinigen',
    art: 'reinigung',
    einheit: 'woche',
    anzahl: 1,
    zustaendig: 'team',
    mieter: true,
    punkte: ['Treppen und Podeste gewischt', 'Geländer abgewischt', 'Fenster und Glas im Treppenhaus', 'Briefkastenanlage', 'Eingangsbereich'],
  },
  {
    id: 'muell',
    titel: 'Mülltonnen raus und rein',
    art: 'sonstiges',
    einheit: 'woche',
    anzahl: 1,
    zustaendig: 'team',
    mieter: false,
    punkte: ['Tonnen am Abholtag rausgestellt', 'Tonnen zurückgestellt', 'Tonnenplatz sauber'],
  },
  {
    id: 'rundgang',
    titel: 'Hausmeister-Rundgang',
    art: 'kontrolle',
    einheit: 'monat',
    anzahl: 1,
    zustaendig: 'team',
    mieter: false,
    punkte: ['Beleuchtung Treppenhaus und Keller', 'Türen und Schließanlage', 'Keller und Technikräume', 'Außenanlage und Wege', 'Keine Feuchte- oder Schadstellen'],
  },
  {
    id: 'winterdienst',
    titel: 'Winterdienst',
    art: 'winterdienst',
    einheit: 'tag',
    anzahl: 1,
    zustaendig: 'team',
    mieter: true,
    punkte: ['Wege geräumt', 'Gestreut'],
  },
  {
    id: 'garten',
    titel: 'Gartenpflege',
    art: 'garten',
    einheit: 'monat',
    anzahl: 1,
    zustaendig: 'team',
    mieter: false,
    punkte: ['Rasen gemäht', 'Beete und Hecken', 'Laub entfernt'],
  },
  { id: 'heizung', titel: 'Heizungswartung', art: 'wartung', einheit: 'jahr', anzahl: 1, zustaendig: 'teo', mieter: false, punkte: [] },
  { id: 'rauchmelder', titel: 'Rauchwarnmelder prüfen', art: 'pruefung', einheit: 'jahr', anzahl: 1, zustaendig: 'teo', mieter: false, punkte: [] },
  { id: 'dachrinne', titel: 'Dachrinnen reinigen', art: 'wartung', einheit: 'jahr', anzahl: 1, zustaendig: 'teo', mieter: false, punkte: [] },
  { id: 'spielplatz', titel: 'Spielplatz-Hauptinspektion', art: 'pruefung', einheit: 'jahr', anzahl: 1, zustaendig: 'teo', mieter: false, punkte: [] },
  { id: 'feuerloescher', titel: 'Feuerlöscher prüfen', art: 'pruefung', einheit: 'jahr', anzahl: 2, zustaendig: 'teo', mieter: false, punkte: [] },
  { id: 'aufzug', titel: 'Aufzug Hauptprüfung', art: 'pruefung', einheit: 'jahr', anzahl: 2, zustaendig: 'teo', mieter: false, punkte: [] },
  { id: 'trinkwasser', titel: 'Trinkwasser auf Legionellen prüfen', art: 'pruefung', einheit: 'jahr', anzahl: 3, zustaendig: 'teo', mieter: false, punkte: [] },
]

export function punkteAus(texte: string[]): ChecklistenPunkt[] {
  return texte
    .map((t) => t.trim())
    .filter(Boolean)
    .map((text, i) => ({ id: `p${i + 1}`, text }))
}
