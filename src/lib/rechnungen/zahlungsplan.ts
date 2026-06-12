import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import type { RechnungBerechnung } from '@/lib/rechnung-berechnung'
import type { AngebotPosition } from '@/lib/types'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

function neueZahlungsplanId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export type ZahlungsplanAbschlagTyp = 'prozent' | 'betrag' | 'rest'

export type ZahlungsplanZeile = {
  id: string
  titel: string
  typ: ZahlungsplanAbschlagTyp
  /** Prozent (0–100) oder Festbetrag netto; bei rest ignoriert */
  wert: number
  pdf_einleitung_vorlage?: string | null
  mail_einleitung_vorlage?: string | null
  mail_betreff_vorlage?: string | null
}

export type Zahlungsplan = {
  modus: 'standard' | 'abschlagsplan'
  zeilen: ZahlungsplanZeile[]
}

export type RechnungArt = 'voll' | 'abschlag' | 'schluss'

export type ZahlungsplanZeileBerechnet = ZahlungsplanZeile & {
  index: number
  netto: number
  brutto: number
  istSchluss: boolean
}

export type AuftragAbrechnungKontext = {
  gesamtNetto: number
  gesamtBrutto: number
  zeilen: ZahlungsplanZeileBerechnet[]
}

export type RechnungAbschlagLink = {
  id: string
  rechnung_art?: string | null
  abschlag_index?: number | null
  zahlungsplan_abschlag_id?: string | null
  status?: string | null
  brutto?: number | null
}

export function emptyZahlungsplan(): Zahlungsplan {
  return { modus: 'standard', zeilen: [] }
}

export function neueZahlungsplanZeile(partial?: Partial<ZahlungsplanZeile>): ZahlungsplanZeile {
  return {
    id: neueZahlungsplanId(),
    titel: partial?.titel?.trim() || 'Abschlag',
    typ: partial?.typ ?? 'prozent',
    wert: partial?.wert ?? 50,
    pdf_einleitung_vorlage: partial?.pdf_einleitung_vorlage ?? null,
    mail_einleitung_vorlage: partial?.mail_einleitung_vorlage ?? null,
    mail_betreff_vorlage: partial?.mail_betreff_vorlage ?? null,
  }
}

export function parseZahlungsplan(raw: unknown): Zahlungsplan | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Zahlungsplan
  if (!Array.isArray(o.zeilen)) return null
  const zeilen = o.zeilen
    .filter((z) => z && typeof z === 'object')
    .map((z) => ({
      id: String(z.id || neueZahlungsplanId()),
      titel: String(z.titel ?? 'Abschlag').trim() || 'Abschlag',
      typ: (['prozent', 'betrag', 'rest'].includes(String(z.typ))
        ? z.typ
        : 'prozent') as ZahlungsplanAbschlagTyp,
      wert: Number(z.wert) || 0,
      pdf_einleitung_vorlage: z.pdf_einleitung_vorlage?.trim() || null,
      mail_einleitung_vorlage: z.mail_einleitung_vorlage?.trim() || null,
      mail_betreff_vorlage: z.mail_betreff_vorlage?.trim() || null,
    }))
  if (!zeilen.length) return null
  return {
    modus: o.modus === 'abschlagsplan' ? 'abschlagsplan' : 'abschlagsplan',
    zeilen,
  }
}

export function zahlungsplanAusAnzahlung50(gesamtNetto: number): Zahlungsplan {
  const half = Math.round(gesamtNetto * 50) / 100
  return {
    modus: 'abschlagsplan',
    zeilen: [
      { ...neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 50 }), id: neueZahlungsplanId() },
      {
        ...neueZahlungsplanZeile({ titel: 'Schlussrechnung', typ: 'rest', wert: 0 }),
        id: neueZahlungsplanId(),
      },
    ],
  }
}

export function zahlungsplanVorlage50_50(): Zahlungsplan {
  return {
    modus: 'abschlagsplan',
    zeilen: [
      neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 50 }),
      neueZahlungsplanZeile({ titel: 'Schlussrechnung', typ: 'rest', wert: 0 }),
    ],
  }
}

export function zahlungsplanVorlage30_70(): Zahlungsplan {
  return {
    modus: 'abschlagsplan',
    zeilen: [
      neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 30 }),
      neueZahlungsplanZeile({ titel: 'Schlussrechnung', typ: 'rest', wert: 0 }),
    ],
  }
}

export function zahlungsplanVorlage3x(): Zahlungsplan {
  return {
    modus: 'abschlagsplan',
    zeilen: [
      neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 30 }),
      neueZahlungsplanZeile({ titel: 'Zwischenzahlung', typ: 'prozent', wert: 40 }),
      neueZahlungsplanZeile({ titel: 'Schlussrechnung', typ: 'rest', wert: 0 }),
    ],
  }
}

export function auftragSummenAusPositionen(
  positionen: AngebotPosition[],
  mwstSatz = 19
): { netto: number; brutto: number } {
  const s = summenAusPositionen(positionen, mwstSatz)
  return { netto: s.nettoMin, brutto: s.bruttoMin }
}

export function berechneZahlungsplan(
  plan: Zahlungsplan,
  gesamtNetto: number,
  mwstSatz = 19
): AuftragAbrechnungKontext {
  const ratio = gesamtNetto > 0 ? mwstSatz / 100 : 0
  const gesamtBrutto = gesamtNetto * (1 + ratio)
  let verteiltNetto = 0
  const restIdx = plan.zeilen.findIndex((z) => z.typ === 'rest')
  const zeilen: ZahlungsplanZeileBerechnet[] = []

  plan.zeilen.forEach((z, i) => {
    const index = i + 1
    const istSchluss = z.typ === 'rest' || (restIdx === -1 && i === plan.zeilen.length - 1)
    let netto = 0
    if (z.typ === 'rest' || (restIdx === -1 && i === plan.zeilen.length - 1)) {
      netto = Math.max(0, Math.round((gesamtNetto - verteiltNetto) * 100) / 100)
    } else if (z.typ === 'prozent') {
      netto = Math.round(gesamtNetto * (Math.max(0, z.wert) / 100) * 100) / 100
      verteiltNetto += netto
    } else {
      netto = Math.max(0, Math.round(z.wert * 100) / 100)
      verteiltNetto += netto
    }
    const brutto = Math.round(netto * (1 + ratio) * 100) / 100
    zeilen.push({ ...z, index, netto, brutto, istSchluss })
  })

  return { gesamtNetto, gesamtBrutto, zeilen }
}

export function rechnungArtFuerZeile(zeile: ZahlungsplanZeileBerechnet): RechnungArt {
  return zeile.istSchluss ? 'schluss' : 'abschlag'
}

export function istAbschlagPauschalPosition(p: AngebotPosition): boolean {
  const slug = (p.gewerk_slug ?? '').toLowerCase()
  const leistung = (p.leistung ?? '').toLowerCase()
  return slug === 'abschlag' || leistung.startsWith('abschlag ') || leistung.startsWith('schlussrechnung')
}

/** Alte Entwürfe hatten nur eine Abschlag-Pauschalposition — Auftragspositionen wiederherstellen. */
export function rechnungPositionenMitAuftrag(
  gespeichert: AngebotPosition[],
  auftragPositionen: AngebotPosition[]
): AngebotPosition[] {
  const norm = normalizeAngebotPositionen(gespeichert)
  const auftrag = normalizeAngebotPositionen(auftragPositionen)
  if (!auftrag.length) return norm
  if (norm.length === 0) return auftrag
  if (norm.length === 1 && istAbschlagPauschalPosition(norm[0]!)) return auftrag
  if (norm.every(istAbschlagPauschalPosition)) return auftrag
  return norm
}

export function abschlagBereitsAbgerechnet(
  zeileId: string,
  rechnungen: RechnungAbschlagLink[],
  ausserRechnungId?: string | null
): boolean {
  return rechnungen.some(
    (r) =>
      r.id !== ausserRechnungId &&
      r.zahlungsplan_abschlag_id === zeileId &&
      r.status !== 'storniert' &&
      (r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss')
  )
}

export function berechneBereitsGestellt(
  rechnungen: RechnungAbschlagLink[]
): { nettoGeschaetzt: number; brutto: number } {
  let brutto = 0
  for (const r of rechnungen) {
    if (r.status === 'storniert') continue
    if (r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss') {
      brutto += Number(r.brutto ?? 0)
    }
  }
  return { nettoGeschaetzt: 0, brutto }
}

export function naechsteOffeneAbschlagZeile(
  plan: Zahlungsplan,
  kontext: AuftragAbrechnungKontext,
  rechnungen: RechnungAbschlagLink[]
): ZahlungsplanZeileBerechnet | null {
  for (const z of kontext.zeilen) {
    if (!abschlagBereitsAbgerechnet(z.id, rechnungen)) return z
  }
  return null
}

export function buildAbschlagPauschalPosition(input: {
  zeile: ZahlungsplanZeileBerechnet
  gesamtNetto: number
  auftragsReferenz: string
  projektTitel: string
  bereitsGestelltBrutto: number
}): AngebotPosition {
  const { zeile, gesamtNetto, auftragsReferenz, projektTitel, bereitsGestelltBrutto } = input
  const artLabel = zeile.istSchluss ? 'Schlussrechnung' : `Abschlag ${zeile.index}`
  const leistung = `${artLabel} — ${zeile.titel}`
  const prozentTeil =
    zeile.typ === 'prozent'
      ? `${zeile.wert} % von ${formatEur(gesamtNetto)} netto`
      : `${formatEur(zeile.netto)} netto`
  const beschreibung = zeile.istSchluss
    ? `${projektTitel || auftragsReferenz}${
        bereitsGestelltBrutto > 0
          ? ` · bereits abgerechnet ${formatEur(bereitsGestelltBrutto)} brutto`
          : ''
      }`
    : `${prozentTeil}, ${auftragsReferenz}`

  return {
    id: neueZahlungsplanId(),
    gewerk_id: '',
    gewerk_slug: 'abschlag',
    gewerk_name: 'Abschlag',
    leistung,
    beschreibung,
    menge: 1,
    einheit: 'Pauschale',
    lohn_netto: zeile.netto,
    material_netto: 0,
    gesamt_min: zeile.netto,
    gesamt_max: zeile.netto,
    preis_typ: 'fix',
  }
}

export function standardRechnungZahlungstext(zahlungszielTage: number): string {
  const tage = Math.max(1, zahlungszielTage)
  return `Zahlbar innerhalb von ${tage} Tagen nach Rechnungserhalt ohne Abzug.`
}

export function abschlagZahlungstextFuerRechnung(
  plan: Zahlungsplan,
  gesamtNetto: number,
  zahlungszielTage: number,
  aktuelleZeile?: ZahlungsplanZeileBerechnet | null
): string {
  const kontext = berechneZahlungsplan(plan, gesamtNetto)
  const zeilenText = kontext.zeilen.map((z) => {
    const label = z.istSchluss ? z.titel : `Abschlag ${z.index} (${z.titel})`
    if (z.typ === 'prozent') {
      return `${label}: ${z.wert} % — ${formatEur(z.netto)} netto / ${formatEur(z.brutto)} brutto`
    }
    if (z.typ === 'rest') {
      return `${label}: Restbetrag — ${formatEur(z.netto)} netto / ${formatEur(z.brutto)} brutto`
    }
    return `${label}: ${formatEur(z.netto)} netto / ${formatEur(z.brutto)} brutto`
  })

  const fälligIntro = aktuelleZeile
    ? aktuelleZeile.istSchluss
      ? `Mit dieser Rechnung wird der Restbetrag in Höhe von ${formatEur(aktuelleZeile.brutto)} brutto fällig.\n\n`
      : `Mit dieser Rechnung wird Abschlag ${aktuelleZeile.index} in Höhe von ${formatEur(aktuelleZeile.brutto)} brutto fällig.\n\n`
    : ''

  const planBlock = `Die Auftragssumme ist in folgende Abschläge zu zahlen:\n${zeilenText.join('\n')}`
  const zahlungsziel = `\n\n${standardRechnungZahlungstext(zahlungszielTage)}`
  return fälligIntro + planBlock + zahlungsziel
}

/** Listen-/Zahlungsbetrag in rechnungen: Abschlag = Ratenbetrag, Schluss = volle Summe. */
export function rechnungBerechnungFuerListe(
  voll: RechnungBerechnung,
  zeile: ZahlungsplanZeileBerechnet | null,
  rechnungArt: 'voll' | 'abschlag' | 'schluss'
): RechnungBerechnung {
  if (rechnungArt !== 'abschlag' || !zeile) return voll
  const ratio = voll.netto > 0 ? zeile.netto / voll.netto : 0
  const mwst_betrag = Math.round((zeile.brutto - zeile.netto) * 100) / 100
  return {
    ...voll,
    netto: zeile.netto,
    brutto: zeile.brutto,
    mwst_betrag,
    lohn_netto: Math.round(voll.lohn_netto * ratio * 100) / 100,
    material_netto: Math.round(voll.material_netto * ratio * 100) / 100,
    mwst_aufschluesselung:
      voll.mwst_aufschluesselung.length && ratio > 0
        ? voll.mwst_aufschluesselung.map((z) => ({
            satz: z.satz,
            netto: Math.round(z.netto * ratio * 100) / 100,
            mwst: Math.round(z.mwst * ratio * 100) / 100,
          }))
        : voll.mwst_aufschluesselung,
  }
}

function formatEur(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function zahlungsplanLabelFuerAngebot(plan: Zahlungsplan | null): string {
  if (!plan?.zeilen.length) return ''
  return plan.zeilen
    .map((z) => {
      if (z.typ === 'rest') return `${z.titel}: Restbetrag`
      if (z.typ === 'prozent') return `${z.titel}: ${z.wert} %`
      return `${z.titel}: ${formatEur(z.wert)} netto`
    })
    .join(' · ')
}

export function resolveAnredeKey(anrede?: AngebotMailAnrede | null): AngebotMailAnrede {
  return anrede === 'du' ? 'du' : 'sie'
}
