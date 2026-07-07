import { splitNettoStueck, type KostenartZeile } from '@/lib/angebot-kosten-split'
import { defaultAngebotRechtshinweise } from '@/lib/angebote/angebot-rechtshinweise'
import { mailAnredeFromKundeTyp } from '@/lib/mail/anrede'
import {
  defaultAngebotEinleitungText,
  defaultAngebotSchlussText,
} from '@/lib/templates/angebot-mail'
import { GEWERK_SLUG_ANFAHRT } from '@/lib/anfahrt-angebot'
import {
  defaultFirmenEinstellungen,
  type FirmenEinstellungen,
} from '@/lib/einstellungen-keys'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'
import type { Zahlungsplan } from '@/lib/rechnungen/zahlungsplan'
import type { AngebotPosition, AngebotStatus } from '@/lib/types'
import { neuePositionsId } from '@/lib/angebot-positionen'
import {
  bereicheFuerAnzeige,
} from '@/lib/lead-gewerbe-storage'

export type AngebotDokumentTyp = 'einfach' | 'projekt'

/** Bereiche, für die standardmäßig das Projekt-Layout empfohlen wird. */
export const IMMER_PROJEKT_BEREICHE = ['bad', 'dach', 'trockenbau', 'fassade'] as const

export function initialDokumentTypFromLead(
  bereicheRaw: unknown,
  situation: string | null | undefined
): AngebotDokumentTyp {
  const bereiche = bereicheFuerAnzeige(bereicheRaw, situation)
  if (bereiche.length >= 2) return 'projekt'
  const immer = IMMER_PROJEKT_BEREICHE as readonly string[]
  if (bereiche.some((b) => immer.includes(b))) return 'projekt'
  return 'einfach'
}

export function leadHatProjektEmpfehlung(bereicheRaw: unknown, situation: string | null | undefined): boolean {
  const bereiche = bereicheFuerAnzeige(bereicheRaw, situation)
  if (bereiche.length >= 2) return true
  const immer = IMMER_PROJEKT_BEREICHE as readonly string[]
  return bereiche.some((b) => immer.includes(b))
}

/** Persistierte Varianten (Spalte varianten) — Positionen B nur bei Zwei-Varianten-Angeboten. */
export type AngebotVariantenPersistJson = {
  a: { name: string; positionen?: AngebotPosition[] | null }
  b: { name: string; positionen?: AngebotPosition[] | null }
}

export type WizardPosition = {
  id: string
  gewerk_id: string
  gewerk_name: string
  gewerk_slug: string
  leistung: string
  beschreibung: string
  menge: number
  einheit: string
  /** Zeilen-Gesamt netto Festpreis (min und max sind gleich gehalten für Alt-Daten-/Export-Pfad) */
  preis_min: number
  preis_max: number
  preisliste_id?: string | null
  /** Keine Preisliste — frei erfasst */
  frei?: boolean
}

/** Mittel aus Min/Max (z. B. Preislisten-Rahmen → ein Festpreis im Wizard). */
export function festpreisMitteAusRange(a: number, b: number): number {
  const x = Number(a) || 0
  const y = Number(b) || 0
  if (x <= 0 && y <= 0) return 0
  return x === y ? x : Math.round((x + y) / 2)
}

/** Ältere Zustände mit echtem Von–Bis zu einem Festpreis zusammenführen. */
export function wizardPositionenAlsFestpreis(rows: WizardPosition[]): WizardPosition[] {
  return rows.map((p) => {
    const fest = festpreisMitteAusRange(p.preis_min, p.preis_max)
    return { ...p, preis_min: fest, preis_max: fest }
  })
}

/** Keys persistiert z. B. in angebote.zahlungsbedingungen */
export type AngebotWizardZahlungsbedingung =
  | 'sofort_netto'
  | '14_tage'
  | '30_tage'
  | 'anzahlung_50'
  | 'abschlagsplan'
  | 'individuell'

export const ZAHLUNGSBEDINGUNGEN_LABELS: Record<AngebotWizardZahlungsbedingung, string> = {
  sofort_netto: 'Zahlbar sofort, rein netto.',
  '14_tage': 'Zahlbar innerhalb von 14 Tagen nach Rechnungsstellung.',
  '30_tage': 'Zahlbar innerhalb von 30 Tagen nach Rechnungsstellung.',
  anzahlung_50:
    '50 % Anzahlung bei Auftragserteilung, 50 % nach Fertigstellung innerhalb von 7 Tagen.',
  abschlagsplan: 'Abschlagsplan (individuelle Teilzahlungen)',
  individuell: 'Gemäß individueller Vereinbarung.',
}

const ZAHLUNG_LEGACY_MAP: Record<string, AngebotWizardZahlungsbedingung> = {
  sofort: 'sofort_netto',
}

export function parseZahlungsbedingungenKey(
  raw: string | null | undefined,
  kundeTyp?: string | null
): AngebotWizardZahlungsbedingung {
  const k = String(raw ?? '').trim()
  if (k in ZAHLUNGSBEDINGUNGEN_LABELS) return k as AngebotWizardZahlungsbedingung
  if (ZAHLUNG_LEGACY_MAP[k]) return ZAHLUNG_LEGACY_MAP[k]
  return defaultAngebotZahlungsbedingungen(kundeTyp)
}

export function angebotWizardZahlungLabel(key: AngebotWizardZahlungsbedingung): string {
  return ZAHLUNGSBEDINGUNGEN_LABELS[key] ?? ZAHLUNGSBEDINGUNGEN_LABELS['30_tage']
}

/** Kundentyp für Wizard: Stammdatensatz vor Lead-Feld (z. B. kundentyp „gewerbe“). */
export function resolveAngebotKundeTyp(
  kundenTyp?: string | null,
  leadKundentyp?: string | null
): string | null {
  const k = kundenTyp?.trim()
  if (k) return k
  const l = (leadKundentyp ?? '').trim().toLowerCase()
  if (l === 'gewerbe') return 'gewerbe'
  if (l === 'hausverwaltung' || l === 'verwaltung') return 'hausverwaltung'
  if (l === 'privat') return 'privat'
  return leadKundentyp?.trim() || null
}

/** Privat (und unbekannt) → 14 Tage; Gewerbe/Hausverwaltung → 30 Tage. */
export function istPrivatKundeTyp(typ?: string | null): boolean {
  const t = (typ ?? 'privat').trim().toLowerCase()
  return t === 'privat' || t === '' || t === 'sonstiges'
}

export function defaultAngebotZahlungsbedingungen(
  kundeTyp?: string | null | undefined
): AngebotWizardZahlungsbedingung {
  return istPrivatKundeTyp(kundeTyp) ? '14_tage' : '30_tage'
}

/** Vorbefüllung beim Weiterbearbeiten eines Entwurfs im Wizard. */
export type AngebotWizardBootstrap = {
  /** `null` = neuer Entwurf (z. B. Kopie), noch keine Angebots-ID. */
  angebotId: string | null
  angebotsnr: string | null
  positionen: AngebotPosition[]
  meta: AngebotWizardMeta
  dokumentTyp: AngebotDokumentTyp
  projektbeschreibung: string | null
  projektFotos: AngebotProjektFoto[]
  /** Aus DB übernommen (Projekt mit Varianten) — wird beim Speichern mitgeschrieben. */
  varianten?: AngebotVariantenPersistJson | null
  wichtige_hinweise?: string | null
  /** Angebot wurde bereits an den Kunden versendet (Korrektur-Mail/Vorschau). */
  bereitsGesendet?: boolean
  /** Korrektur aus laufendem Auftrag — kein erneutes Annehmen, Auftrag wird mitgespeichert. */
  auftragKorrektur?: { auftragId: string }
  zahlungsplan?: Zahlungsplan | null
}

/** Für Kopien: angehängte Nummer „(2)“, „(3)“, … am Angebotstitel. */
export function angebotTitelFuerKopie(titel: string): string {
  const t = titel.trim()
  if (!t) return 'Angebot (2)'
  const m = t.match(/^(.+?)\s*\((\d+)\)\s*$/)
  if (m) {
    const base = m[1].trim()
    const n = parseInt(m[2], 10)
    if (!Number.isFinite(n) || n < 1) return `${t} (2)`
    return `${base} (${n + 1})`
  }
  return `${t} (2)`
}

export type AngebotWizardMeta = {
  titel: string
  gueltig_bis: string
  einleitung: string
  schluss: string
  /** Kurzbeschreibung Leistungen (Zeile unter Angebotskopf / PDF). */
  leistungsumfang: string
  hinweise: string
  zahlungsbedingungen: AngebotWizardZahlungsbedingung
  /** Legacy in wizard_meta — Standard du, keine eigene DB-Spalte */
  anrede?: 'du' | 'sie'
  /** Anfahrtskosten-Pauschale als Position */
  mit_anfahrt?: boolean
  /** Rechtliche Hinweis-Blöcke im Angebots-PDF */
  hinweis_35a?: boolean
  hinweis_19?: boolean
  hinweis_13b?: boolean
  /** Verwaltungsobjekt (Gewerbe/Hausverwaltung) — PDF „Durchführung in“ */
  kunde_objekt_id?: string | null
}

export function plusDaysYmd(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Anzeige eines Betrags (Gesamt/Position) — kein Von-bis. */
export function formatEurRange(min: number, max: number): string {
  const f = (n: number) =>
    n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const total = max > 0 ? max : min > 0 ? min : 0
  return f(total)
}

export function summeWizardPositionen(positions: WizardPosition[]) {
  const preis_min = positions.reduce((s, p) => s + Number(p.preis_min || 0), 0)
  const preis_max = positions.reduce((s, p) => s + Number(p.preis_max || 0), 0)
  return { preis_min, preis_max }
}

export function wizardPositionsToAngebot(
  rows: WizardPosition[],
  firm: FirmenEinstellungen = defaultFirmenEinstellungen()
): AngebotPosition[] {
  return rows
    .filter((r) => r.leistung.trim())
    .map((row) => {
      const m = Math.max(Number(row.menge) || 1, 0.01)
      const lineMin = Number(row.preis_min) || 0
      const lineMax = Number(row.preis_max) || lineMin
      const midLine = lineMin > 0 && lineMax > 0 ? (lineMin + lineMax) / 2 : Math.max(lineMin, lineMax)
      const stueck = Math.round((midLine / m) * 100) / 100
      const kostenart: KostenartZeile =
        row.gewerk_slug === GEWERK_SLUG_ANFAHRT ? 'anfahrt' : 'leistung'
      const { lohn_netto, material_netto } = splitNettoStueck(stueck, {
        firm,
        leistung: row.leistung,
        kostenart,
      })
      return {
        id: row.id || neuePositionsId(),
        gewerk_id: row.gewerk_id || '',
        gewerk_name: row.gewerk_name || 'Freie Leistung',
        gewerk_slug: row.gewerk_slug || 'frei',
        leistung: row.leistung.trim(),
        beschreibung: (() => {
          const b = (row.beschreibung || '').trim()
          const l = row.leistung.trim()
          return b && b !== l ? b : ''
        })(),
        lohn_netto,
        material_netto,
        gesamt_min: lineMin,
        gesamt_max: lineMax,
        menge: m,
        einheit: row.einheit || 'Stk.',
        preis_typ: lineMin === lineMax ? 'fix' : 'range',
      }
    })
}

export function metaToNotizen(meta: AngebotWizardMeta, intern = ''): string {
  return JSON.stringify({ wizard_meta: meta, intern: intern.trim() })
}

/** Vollständiges wizard_meta aus notizen mit Fallback auf Spaltenwerte. */
export function parseAngebotWizardMetaFromNotizen(
  notizen: string | null | undefined,
  fallback: AngebotWizardMeta,
  spalten?: {
    einleitung?: string | null
    leistungsumfang?: string | null
    gueltig_bis?: string | null
    zahlungsbedingungen?: string | null
    hinweise?: string | null
  },
  kundeTyp?: string | null
): AngebotWizardMeta {
  let wm: Partial<AngebotWizardMeta> | null = null
  try {
    const j = JSON.parse(notizen ?? '{}') as { wizard_meta?: Partial<AngebotWizardMeta> }
    wm = j.wizard_meta ?? null
  } catch {
    wm = null
  }

  const zahlungRaw = wm?.zahlungsbedingungen ?? spalten?.zahlungsbedingungen
  const zahlungsbedingungen =
    typeof zahlungRaw === 'string' && zahlungRaw in ZAHLUNGSBEDINGUNGEN_LABELS
      ? (zahlungRaw as AngebotWizardZahlungsbedingung)
      : parseZahlungsbedingungenKey(
          typeof zahlungRaw === 'string' ? zahlungRaw : spalten?.zahlungsbedingungen,
          kundeTyp
        )

  const anredeRaw = wm?.anrede
  const anrede: 'du' | 'sie' | undefined =
    anredeRaw === 'sie' ? 'sie' : anredeRaw === 'du' ? 'du' : fallback.anrede

  return {
    ...fallback,
    titel: wm?.titel?.trim() || fallback.titel,
    gueltig_bis:
      wm?.gueltig_bis?.trim() || spalten?.gueltig_bis?.trim() || fallback.gueltig_bis,
    einleitung:
      wm?.einleitung?.trim() || spalten?.einleitung?.trim() || fallback.einleitung,
    schluss: wm?.schluss?.trim() || fallback.schluss,
    leistungsumfang:
      wm?.leistungsumfang?.trim() ||
      spalten?.leistungsumfang?.trim() ||
      fallback.leistungsumfang,
    hinweise: wm?.hinweise?.trim() || spalten?.hinweise?.trim() || fallback.hinweise,
    zahlungsbedingungen,
    anrede,
    mit_anfahrt: wm?.mit_anfahrt ?? fallback.mit_anfahrt,
    hinweis_35a: wm?.hinweis_35a ?? fallback.hinweis_35a,
    hinweis_19: wm?.hinweis_19 ?? fallback.hinweis_19,
    hinweis_13b: wm?.hinweis_13b ?? fallback.hinweis_13b,
  }
}

export function defaultWizardMeta(
  kundenName: string,
  projektLabel: string,
  leistungsumfangAusLead = '',
  anrede?: 'du' | 'sie',
  kundeTyp?: string | null,
  firm?: FirmenEinstellungen
): AngebotWizardMeta {
  const effAnrede = anrede ?? mailAnredeFromKundeTyp(kundeTyp)
  const leistungsumfang = leistungsumfangAusLead.trim() || projektLabel
  const recht = defaultAngebotRechtshinweise(kundeTyp, firm ?? defaultFirmenEinstellungen())
  return {
    titel: `Angebot ${projektLabel} — ${kundenName}`,
    gueltig_bis: plusDaysYmd(30),
    einleitung: defaultAngebotEinleitungText(effAnrede, leistungsumfang),
    schluss: defaultAngebotSchlussText(effAnrede),
    leistungsumfang: leistungsumfangAusLead,
    hinweise: '',
    zahlungsbedingungen: defaultAngebotZahlungsbedingungen(kundeTyp),
    anrede: effAnrede,
    ...recht,
  }
}

/** Fließtext unter „Projekt-Beschreibung“ im PDF (Wizard Schritt 1). */
export function defaultProjektBeschreibungText(projektTitel: string): string {
  const t = projektTitel.trim() || 'Ihr Projekt'
  return (
    `Geplant ist die Umsetzung von „${t}“ gemäß Fotodokumentation und Aufmaß.\n\n` +
    'Die handwerkliche Ausführung erfolgt durch geprüfte Fach- und Subunternehmen. ' +
    'Bärenwald München übernimmt Projektkoordination, Ablaufplanung und Qualitätskontrolle.'
  )
}

/** Noch Standard- oder leerer Beschreibungstext — bei Titel-Wechsel mit neuem Standard überschreiben. */
export function isDefaultProjektBeschreibung(text: string, projektTitel: string): boolean {
  const t = text.trim()
  if (!t) return true
  const variants = new Set<string>()
  const titel = projektTitel.trim()
  variants.add(defaultProjektBeschreibungText(titel))
  variants.add(defaultProjektBeschreibungText(''))
  variants.add(defaultProjektBeschreibungText('Ihr Projekt'))
  if (titel !== projektTitel) {
    variants.add(defaultProjektBeschreibungText(projektTitel))
  }
  return variants.has(t)
}

/** Standard „Wichtige Hinweise“ für Projekt-Angebote (editierbar im Wizard). */
export const STANDARD_WICHTIGE_HINWEISE_PROJEKT =
  'Handwerkliche Leistungen erfolgen ausschließlich durch externe Fach- und Subunternehmen. ' +
  'Bärenwald München übernimmt Projektsteuerung, Koordination und Qualitätskontrolle. ' +
  'Endgültige Preise können sich nach exaktem Aufmaß anpassen.'

/** Status, in denen das Angebot im Wizard geladen und gespeichert werden darf (auch nach Versand). */
const ANGEBOT_WIZARD_BEARBEITBAR: readonly AngebotStatus[] = [
  'entwurf',
  'gesendet_handwerker',
  'handwerker_akzeptiert',
  'gesendet_kunde',
  'kunde_akzeptiert',
]

export function angebotDarfImWizardBearbeitetWerden(status: string): boolean {
  return (ANGEBOT_WIZARD_BEARBEITBAR as readonly string[]).includes(status)
}
