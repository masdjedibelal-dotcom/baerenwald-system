import {
  splitNettoStueck,
  type KostenVerteilung,
  type KostenartZeile,
} from '@/lib/angebot-kosten-split'
import { GEWERK_SLUG_ANFAHRT } from '@/lib/anfahrt-angebot'
import { neuePositionsId, positionVkNettoStueck } from '@/lib/angebot-positionen'
import { defaultFirmenEinstellungen, type FirmenEinstellungen } from '@/lib/einstellungen-keys'
import { resolvePositionBeschreibungExport } from '@/lib/gewerke-ausfuehrung'
import { withResolvedGewerkMeta } from '@/lib/angebote/resolve-position-gewerk'
import type { AngebotPosition, Gewerk } from '@/lib/types'
import type { WizardPosition } from '@/lib/angebote/angebot-wizard-types'

export const ZEILE_SLUG_FREITEXT = '__freitext__'
export const ZEILE_SLUG_GESAMTRABATT = '__gesamtrabatt__'

/** Interner Marker für Gewerk-Beschreibung (nur Wizard-Editor, nicht in Positions-Listen). */
export const GEWERK_BESCHREIBUNG_TITEL = '__gewerk_beschreibung__'

export function istGewerkBeschreibungLeistungName(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === GEWERK_BESCHREIBUNG_TITEL
}

/** Gewerk-Label für Freitext-Positionen im Angebot (PDF, Detail, E-Mail). */
export const GEWERK_NAME_ALLGEMEIN = 'Allgemein'

/** Legacy „Freitext“ und leer → „Allgemein“ in Angebots-Ansichten. */
export function angebotGewerkNameAnzeige(name?: string | null): string {
  const n = name?.trim()
  if (!n || n === 'Freitext') return GEWERK_NAME_ALLGEMEIN
  return n
}

export type MwstSatzOption = 0 | 7 | 19

export type DokumentArtikelZeile = {
  id: string
  typ: 'artikel'
  bezeichnung: string
  menge: number
  einheit: string
  /** Einzelpreis netto */
  vkNetto: number
  rabattProzent: number
  mwstSatz: MwstSatzOption
  /** Nur Anzeige / Angebot-Wizard */
  gewerkName?: string
  gewerk_id?: string
  gewerk_slug?: string
  /** Gruppierung im Gewerk-Wizard (eindeutig pro Abschnitt, auch bei gleichem gewerk_id) */
  gewerk_block_key?: string
  preisliste_id?: string | null
  /** Katalog-Variante */
  variante_id?: string | null
  /** katalog | frei */
  position_quelle?: 'katalog' | 'frei' | string | null
  /** Zusatztext unter Leistung (z. B. Fachbetrieb-Hinweis) */
  positionBeschreibung?: string
  /** Kundennotiz / Regie-Meta aus Auftrag (CRM) */
  notizExtern?: string
  /** Regieschein als sichtbare Anlage/Chip auf Rechnung */
  regieSchein?: boolean
  /** Fachbetrieb-Hinweis im PDF (Standard aus Gewerk-Einstellungen) */
  fachbetriebHinweisAnzeigen?: boolean
  /** Steuerliche Aufteilung + Anfahrt */
  kostenart?: KostenartZeile
  /** Arbeits- vs. Materialkosten (100 % in eine Kategorie) */
  kostenverteilung?: KostenVerteilung
}

export type DokumentFreitextZeile = {
  id: string
  typ: 'freitext'
  titel: string
  text: string
  /** Gewerk-Abschnitt im Wizard (wie bei Artikel-Zeilen) */
  gewerk_block_key?: string
}

/** Nachlass-Art: Prozent / fester Abzug / Ziel-Gesamtbetrag (Netto oder Brutto). */
export type GesamtrabattModus = 'prozent' | 'betrag' | 'ziel_netto' | 'ziel_brutto'

export type DokumentGesamtrabattZeile = {
  id: string
  typ: 'gesamtrabatt'
  bezeichnung: string
  modus: GesamtrabattModus
  /** Prozent, Abzugsbetrag netto, oder Ziel-Gesamtbetrag (je nach modus) */
  wert: number
  gewerk_block_key?: string
}

export function parseGesamtrabattModus(raw: string | null | undefined): GesamtrabattModus {
  const m = String(raw ?? '')
    .trim()
    .toLowerCase()
  if (m === 'betrag') return 'betrag'
  if (m === 'ziel_netto' || m === 'zielnetto') return 'ziel_netto'
  if (m === 'ziel_brutto' || m === 'zielbrutto') return 'ziel_brutto'
  return 'prozent'
}

export function isGesamtrabattZielModus(
  modus: string | null | undefined
): modus is 'ziel_netto' | 'ziel_brutto' {
  return modus === 'ziel_netto' || modus === 'ziel_brutto'
}

/** Abzug (positiv, netto) aus Modus + Wert. */
export function gesamtrabattAbzugFromModus(
  modus: GesamtrabattModus,
  wert: number,
  artikelNetto: number,
  artikelBrutto?: number
): number {
  const netto = Math.max(0, artikelNetto)
  if (modus === 'prozent') {
    const p = Math.max(0, Math.min(100, wert))
    if (p <= 0 || netto <= 0) return 0
    return Math.round(netto * (p / 100) * 100) / 100
  }
  if (modus === 'betrag') {
    if (wert <= 0 || netto <= 0) return 0
    return Math.round(Math.min(netto, Math.max(0, wert)) * 100) / 100
  }
  if (modus === 'ziel_netto') {
    const ziel = Math.max(0, wert)
    return Math.round(Math.max(0, netto - ziel) * 100) / 100
  }
  // ziel_brutto → proportionaler Netto-Abzug (auch bei gemischter USt)
  const brutto =
    artikelBrutto != null && Number.isFinite(artikelBrutto) && artikelBrutto > 0
      ? artikelBrutto
      : Math.round(netto * 1.19 * 100) / 100
  if (brutto <= 0 || netto <= 0) return 0
  const ziel = Math.max(0, wert)
  if (ziel >= brutto) return 0
  const zielNetto = (ziel / brutto) * netto
  return Math.round(Math.max(0, netto - zielNetto) * 100) / 100
}

export type DokumentZeile = DokumentArtikelZeile | DokumentFreitextZeile | DokumentGesamtrabattZeile

export function neueArtikelZeile(partial?: Partial<DokumentArtikelZeile>): DokumentArtikelZeile {
  return {
    id: neuePositionsId(),
    typ: 'artikel',
    bezeichnung: '',
    menge: 1,
    einheit: 'Stk.',
    vkNetto: 0,
    rabattProzent: 0,
    mwstSatz: 19,
    kostenverteilung: 'allgemein',
    ...partial,
  }
}

export function inferKostenverteilungFromPosition(p: {
  lohn_netto: number
  material_netto: number
  gewerk_slug?: string
}): KostenVerteilung {
  if (p.gewerk_slug === GEWERK_SLUG_ANFAHRT) return 'lohn'
  const l = Math.abs(Number(p.lohn_netto) || 0)
  const m = Math.abs(Number(p.material_netto) || 0)
  if (m <= 0 && l > 0) return 'lohn'
  if (l <= 0 && m > 0) return 'material'
  if (l > 0 && m > 0) return 'allgemein'
  return 'allgemein'
}

export function neueFreitextZeile(
  partial?: Partial<Omit<DokumentFreitextZeile, 'id' | 'typ'>>
): DokumentFreitextZeile {
  return { id: neuePositionsId(), typ: 'freitext', titel: '', text: '', ...partial }
}

export function neueGesamtrabattZeile(
  partial?: Partial<Omit<DokumentGesamtrabattZeile, 'id' | 'typ'>>
): DokumentGesamtrabattZeile {
  return {
    id: neuePositionsId(),
    typ: 'gesamtrabatt',
    bezeichnung: 'Gesamtrabatt',
    modus: 'prozent',
    wert: 0,
    ...partial,
  }
}

export function istFreitextPosition(p: AngebotPosition): boolean {
  return (p.gewerk_slug ?? '') === ZEILE_SLUG_FREITEXT
}

export function istGewerkBeschreibungPosition(p: AngebotPosition): boolean {
  return istFreitextPosition(p) && istGewerkBeschreibungLeistungName(p.leistung)
}

export function istGesamtrabattPosition(p: AngebotPosition): boolean {
  return (p.gewerk_slug ?? '') === ZEILE_SLUG_GESAMTRABATT
}

export function istPreisPosition(p: AngebotPosition): boolean {
  return !istFreitextPosition(p) && !istGesamtrabattPosition(p)
}

/** Meta aus gespeicherter Nachlass-Position (`beschreibung` = `prozent:10` / `betrag:200` / `ziel_netto:500`). */
export function parseGesamtrabattMetaFromPosition(p: AngebotPosition): {
  modus: GesamtrabattModus
  wert: number
  bezeichnung: string
} {
  const besch = (p.beschreibung ?? '').trim()
  const colon = besch.indexOf(':')
  const modusRaw = colon >= 0 ? besch.slice(0, colon).trim() : ''
  const wertRaw = colon >= 0 ? besch.slice(colon + 1).trim() : ''
  const modus = parseGesamtrabattModus(modusRaw)
  let wert = Math.abs(Number(String(wertRaw).replace(',', '.')))
  if (!Number.isFinite(wert) || (wert <= 0 && !isGesamtrabattZielModus(modus))) {
    wert =
      Math.abs(Number(p.gesamt_min) || 0) ||
      Math.abs(Number(p.lohn_netto) || 0) ||
      Math.abs(Number(p.vk_netto) || 0)
  }
  return {
    modus,
    wert: Number.isFinite(wert) ? wert : 0,
    bezeichnung: (p.leistung || p.leistung_name || 'Nachlass').trim() || 'Nachlass',
  }
}

/** Nachlass-Abzug (positiv) aus Angebots-Positionen — auch wenn Beträge beim Laden auf 0 gesetzt wurden. */
export function gesamtrabattAbzugAusAngebotPositionen(
  positionen: AngebotPosition[],
  artikelNetto: number,
  /** Dokument-USt für Ziel-Brutto (Fallback 19). */
  mwstSatz = 19
): number {
  const r = positionen.find(istGesamtrabattPosition)
  if (!r) return 0
  const { modus, wert } = parseGesamtrabattMetaFromPosition(r)
  const artikelBrutto =
    modus === 'ziel_brutto'
      ? Math.round(Math.max(0, artikelNetto) * (1 + Math.max(0, mwstSatz) / 100) * 100) / 100
      : undefined
  return gesamtrabattAbzugFromModus(modus, wert, artikelNetto, artikelBrutto)
}

export function artikelZeilenNetto(z: DokumentArtikelZeile): number {
  const m = Math.max(z.menge, 0.0001)
  const bruttoZeile = z.vkNetto * m
  const rabatt = Math.max(0, Math.min(100, z.rabattProzent))
  return Math.round(bruttoZeile * (1 - rabatt / 100) * 100) / 100
}

export function summeArtikelNetto(zeilen: DokumentZeile[]): number {
  return zeilen
    .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
    .reduce((s, z) => s + artikelZeilenNetto(z), 0)
}

/** Brutto der Artikelzeilen (je Zeile mit eigenem MwSt-Satz). */
export function summeArtikelBrutto(zeilen: DokumentZeile[]): number {
  return (
    Math.round(
      zeilen
        .filter((z): z is DokumentArtikelZeile => z.typ === 'artikel')
        .reduce((s, z) => {
          const netto = artikelZeilenNetto(z)
          const f = (Number(z.mwstSatz) || 19) / 100
          return s + netto * (1 + f)
        }, 0) * 100
    ) / 100
  )
}

export function gesamtrabattBetrag(zeilen: DokumentZeile[], artikelNetto: number): number {
  const r = zeilen.find((z): z is DokumentGesamtrabattZeile => z.typ === 'gesamtrabatt')
  if (!r) return 0
  const artikelBrutto = r.modus === 'ziel_brutto' ? summeArtikelBrutto(zeilen) : undefined
  return gesamtrabattAbzugFromModus(r.modus, r.wert, artikelNetto, artikelBrutto)
}

export function getGesamtrabattZeile(zeilen: DokumentZeile[]): DokumentGesamtrabattZeile | null {
  return zeilen.find((z): z is DokumentGesamtrabattZeile => z.typ === 'gesamtrabatt') ?? null
}

/** Positionen ohne dokumentweiten Gesamtrabatt (für Gewerk-Blöcke / Positionsliste). */
export function zeilenOhneGesamtrabatt(zeilen: DokumentZeile[]): DokumentZeile[] {
  return zeilen.filter((z) => z.typ !== 'gesamtrabatt')
}

/** Gesamtrabatt immer am Ende, ohne Gewerk-Zuordnung. */
export function mitDokumentGesamtrabatt(
  positionen: DokumentZeile[],
  gesamtrabatt?: DokumentGesamtrabattZeile | null
): DokumentZeile[] {
  const rabatt =
    gesamtrabatt !== undefined
      ? gesamtrabatt
      : getGesamtrabattZeile(positionen)
  const ohne = zeilenOhneGesamtrabatt(positionen)
  if (!rabatt) return ohne
  const clean = { ...rabatt }
  delete (clean as DokumentGesamtrabattZeile & { gewerk_block_key?: string }).gewerk_block_key
  return [...ohne, clean]
}

export function setGesamtrabattInZeilen(
  zeilen: DokumentZeile[],
  patch: Partial<DokumentGesamtrabattZeile> | null
): DokumentZeile[] {
  if (patch === null) return zeilenOhneGesamtrabatt(zeilen)
  const existing = getGesamtrabattZeile(zeilen)
  const next: DokumentGesamtrabattZeile = existing
    ? { ...existing, ...patch }
    : { ...neueGesamtrabattZeile(), ...patch }
  return mitDokumentGesamtrabatt(zeilen, next)
}

export function dokumentZeilenToAngebotPositionen(
  zeilen: DokumentZeile[],
  firm: FirmenEinstellungen = defaultFirmenEinstellungen(),
  gewerke: Gewerk[] = []
): AngebotPosition[] {
  const out: AngebotPosition[] = []
  for (const z of zeilen) {
    if (z.typ === 'artikel') {
      const m = Math.max(z.menge, 0.0001)
      const netto = artikelZeilenNetto(z)
      const stueck =
        z.vkNetto > 0
          ? Math.round(z.vkNetto * 100) / 100
          : Math.round((netto / m) * 100) / 100
      const kostenart: KostenartZeile =
        z.kostenart ?? (z.gewerk_slug === GEWERK_SLUG_ANFAHRT ? 'anfahrt' : 'leistung')
      const kostenverteilung: KostenVerteilung =
        kostenart === 'anfahrt' ? 'lohn' : z.kostenverteilung ?? 'allgemein'
      const { lohn_netto, material_netto } = splitNettoStueck(stueck, {
        firm,
        leistung: z.bezeichnung,
        kostenart,
        kostenverteilung,
      })
      const isRegie = Boolean(z.regieSchein)
      const gewerkFields = withResolvedGewerkMeta(
        {
          gewerk_id: z.gewerk_id ?? '',
          gewerk_slug: z.gewerk_slug,
          gewerk_name: z.gewerkName ?? 'Allgemein',
        },
        gewerke
      )
      out.push({
        id: z.id,
        gewerk_id: gewerkFields.gewerk_id,
        gewerk_name: gewerkFields.gewerk_name,
        gewerk_slug: gewerkFields.gewerk_slug,
        gewerk_block_key: z.gewerk_block_key?.trim() || undefined,
        leistung: z.bezeichnung.trim() || 'Position',
        beschreibung: resolvePositionBeschreibungExport(
          {
            leistung: z.bezeichnung.trim() || 'Position',
            positionBeschreibung: z.positionBeschreibung,
            fachbetriebHinweisAnzeigen: z.fachbetriebHinweisAnzeigen,
            gewerk_id: z.gewerk_id,
          },
          gewerke
        ),
        lohn_netto,
        material_netto,
        gesamt_min: netto,
        gesamt_max: netto,
        menge: m,
        einheit: z.einheit || 'Stk.',
        preis_typ: 'fix',
        mwst_satz: z.mwstSatz as number,
        vk_netto: stueck,
        kostenart,
        verguetung: isRegie ? 'aufwand' : 'festpreis',
        ...(isRegie
          ? {
              geschaetzt_std: m,
              stundensatz: stueck,
              notiz_extern: z.notizExtern?.trim() || 'nach Aufwand',
            }
          : z.notizExtern?.trim()
            ? { notiz_extern: z.notizExtern.trim() }
            : {}),
        ...(kostenart !== 'anfahrt' ? { kostenverteilung } : {}),
        ...(z.preisliste_id ? { leistung_id: z.preisliste_id } : {}),
        ...(z.fachbetriebHinweisAnzeigen !== undefined
          ? { ist_fachbetrieb: z.fachbetriebHinweisAnzeigen !== false }
          : {}),
      })
    } else if (z.typ === 'freitext') {
      out.push({
        id: z.id,
        gewerk_id: '',
        gewerk_slug: ZEILE_SLUG_FREITEXT,
        gewerk_name: GEWERK_NAME_ALLGEMEIN,
        gewerk_block_key: z.gewerk_block_key?.trim() || undefined,
        leistung: z.titel.trim() || '',
        beschreibung: z.text.trim(),
        lohn_netto: 0,
        material_netto: 0,
        gesamt_min: 0,
        gesamt_max: 0,
        menge: 1,
        einheit: 'Stk.',
        preis_typ: 'fix',
      })
    } else if (z.typ === 'gesamtrabatt') {
      const artikelNetto = summeArtikelNetto(zeilen)
      const abzug = gesamtrabattBetrag(zeilen, artikelNetto)
      out.push({
        id: z.id,
        gewerk_id: '',
        gewerk_slug: ZEILE_SLUG_GESAMTRABATT,
        gewerk_name: 'Gesamtrabatt',
        gewerk_block_key: z.gewerk_block_key?.trim() || undefined,
        leistung: z.bezeichnung.trim() || 'Gesamtrabatt',
        beschreibung: `${z.modus}:${z.wert}`,
        lohn_netto: abzug > 0 ? -abzug : 0,
        material_netto: 0,
        gesamt_min: abzug > 0 ? -abzug : 0,
        gesamt_max: abzug > 0 ? -abzug : 0,
        menge: 1,
        einheit: 'Stk.',
        preis_typ: 'fix',
      })
    }
  }
  return out
}

export function angebotPositionenToDokumentZeilen(
  positionen: AngebotPosition[],
  gewerke: Gewerk[] = []
): DokumentZeile[] {
  const out: DokumentZeile[] = []
  for (const p of positionen) {
    const slug = p.gewerk_slug ?? ''
    if (slug === ZEILE_SLUG_FREITEXT) {
      out.push({
        id: p.id,
        typ: 'freitext',
        titel: p.leistung ?? '',
        text: p.beschreibung ?? '',
        gewerk_block_key: p.gewerk_block_key?.trim() || undefined,
      })
      continue
    }
    if (slug === ZEILE_SLUG_GESAMTRABATT) {
      const meta = parseGesamtrabattMetaFromPosition(p)
      out.push({
        id: p.id,
        typ: 'gesamtrabatt',
        bezeichnung: meta.bezeichnung || p.leistung || 'Gesamtrabatt',
        modus: meta.modus,
        wert: meta.wert,
        gewerk_block_key: p.gewerk_block_key?.trim() || undefined,
      })
      continue
    }
    const m = Math.max(p.menge || 1, 0.0001)
    const vk = positionVkNettoStueck(p)
    const mwst = p.mwst_satz
    const leistung = (p.leistung || '').trim()
    const besch = resolvePositionBeschreibungExport(
      {
        leistung: leistung || 'Position',
        beschreibung: p.beschreibung,
        ist_fachbetrieb: p.ist_fachbetrieb,
        gewerk_id: p.gewerk_id,
      },
      gewerke
    ).trim()
    const kostenart: KostenartZeile =
      p.kostenart === 'anfahrt' || p.gewerk_slug === GEWERK_SLUG_ANFAHRT ? 'anfahrt' : 'leistung'
    const notizExtern = p.notiz_extern?.trim() || undefined
    const regieSchein =
      String(p.verguetung ?? '').toLowerCase() === 'aufwand' ||
      Boolean(
        notizExtern &&
          (/regieschein/i.test(notizExtern) || /nach aufwand/i.test(notizExtern))
      )
    out.push({
      id: p.id,
      typ: 'artikel',
      bezeichnung: leistung || besch || 'Position',
      positionBeschreibung: besch && besch !== leistung ? besch : undefined,
      notizExtern: regieSchein ? notizExtern || 'nach Aufwand' : notizExtern,
      regieSchein,
      menge: m,
      einheit: p.einheit || 'Stk.',
      vkNetto: Math.round(vk * 100) / 100,
      rabattProzent: 0,
      mwstSatz: mwst === 0 || mwst === 7 ? mwst : 19,
      gewerkName: p.gewerk_name,
      gewerk_id: p.gewerk_id,
      gewerk_slug: p.gewerk_slug,
      gewerk_block_key: p.gewerk_block_key?.trim() || undefined,
      kostenart,
      kostenverteilung:
        p.kostenverteilung === 'lohn' ||
        p.kostenverteilung === 'material' ||
        p.kostenverteilung === 'allgemein'
          ? p.kostenverteilung
          : inferKostenverteilungFromPosition(p),
      ...(p.leistung_id ? { preisliste_id: p.leistung_id } : {}),
      fachbetriebHinweisAnzeigen:
        p.ist_fachbetrieb === false ? false : p.ist_fachbetrieb === true ? true : undefined,
    })
  }
  return out
}

export function wizardPositionToDokumentZeile(p: WizardPosition): DokumentArtikelZeile {
  const m = Math.max(p.menge || 1, 0.0001)
  const line = Number(p.preis_min) || 0
  const leistung = (p.leistung || '').trim()
  const hinweis = (p.beschreibung || '').trim()
  return {
    id: p.id,
    typ: 'artikel',
    bezeichnung: leistung || hinweis || 'Position',
    positionBeschreibung: hinweis && hinweis !== leistung ? hinweis : undefined,
    menge: m,
    einheit: p.einheit || 'Stk.',
    vkNetto: Math.round((line / m) * 100) / 100,
    rabattProzent: 0,
    mwstSatz: 19,
    gewerkName: p.gewerk_name,
    gewerk_id: p.gewerk_id,
    gewerk_slug: p.gewerk_slug,
    preisliste_id: p.preisliste_id,
    kostenverteilung: 'allgemein',
  }
}

export function dokumentArtikelToWizardPosition(z: DokumentArtikelZeile): WizardPosition {
  const netto = artikelZeilenNetto(z)
  const leistung = z.bezeichnung.trim() || 'Position'
  const hinweis = z.positionBeschreibung?.trim() ?? ''
  return {
    id: z.id,
    gewerk_id: z.gewerk_id ?? '',
    gewerk_name: z.gewerkName ?? 'Freie Leistung',
    gewerk_slug: z.gewerk_slug ?? 'frei',
    leistung,
    beschreibung: hinweis || leistung,
    menge: z.menge,
    einheit: z.einheit,
    preis_min: netto,
    preis_max: netto,
    preisliste_id: z.preisliste_id,
  }
}

export function formatEurBetrag(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  return `${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}
