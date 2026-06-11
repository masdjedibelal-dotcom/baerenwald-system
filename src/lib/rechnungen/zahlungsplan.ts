import { randomUUID } from 'crypto'
import { summenAusPositionen } from '@/lib/angebot-positionen'
import type { AngebotPosition } from '@/lib/types'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

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
    id: randomUUID(),
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
      id: String(z.id || randomUUID()),
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
      { ...neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 50 }), id: randomUUID() },
      {
        ...neueZahlungsplanZeile({ titel: 'Schlussrechnung', typ: 'rest', wert: 0 }),
        id: randomUUID(),
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

export function abschlagBereitsAbgerechnet(
  zeileId: string,
  rechnungen: RechnungAbschlagLink[]
): boolean {
  return rechnungen.some(
    (r) =>
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
  const beschreibung = zeile.istSchluss
    ? `${artLabel} — ${zeile.titel} (Rest aus ${projektTitel || auftragsReferenz})`
    : `${artLabel} — ${zeile.titel} (${zeile.typ === 'prozent' ? `${zeile.wert} %` : formatEur(zeile.netto)} von ${formatEur(gesamtNetto)} netto, ${auftragsReferenz})`

  void bereitsGestelltBrutto

  return {
    id: randomUUID(),
    gewerk_id: '',
    gewerk_slug: '__freitext__',
    gewerk_name: 'Abschlag',
    leistung: 'abschlag',
    beschreibung,
    menge: 1,
    einheit: 'psch.',
    lohn_netto: zeile.netto,
    material_netto: 0,
    gesamt_min: zeile.netto,
    gesamt_max: zeile.netto,
    preis_typ: 'fix',
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
