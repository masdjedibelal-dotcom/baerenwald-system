import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { berechneRechnung, type RechnungBerechnung } from '@/lib/rechnung-berechnung'
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
  /** Auftragspositionen, die dieser Abschlagsrechnung zugeordnet sind (Schluss = Rest automatisch) */
  position_ids?: string[]
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
    position_ids: partial?.position_ids?.length ? [...partial.position_ids] : [],
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
      position_ids: Array.isArray(z.position_ids)
        ? z.position_ids.map((id) => String(id)).filter(Boolean)
        : [],
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

export function positionAnzeigeLabel(p: AngebotPosition): string {
  const name = (p.leistung_name || p.beschreibung || p.leistung || 'Position').trim()
  const gewerk = p.gewerk_name?.trim()
  return gewerk ? `${gewerk}: ${name}` : name
}

/** Positionen, die bereits anderen Abschlagszeilen zugeordnet sind. */
export function positionIdsBelegt(plan: Zahlungsplan, ausserZeileId?: string | null): Set<string> {
  const belegt = new Set<string>()
  for (const z of plan.zeilen) {
    if (z.typ === 'rest' || z.id === ausserZeileId) continue
    for (const id of z.position_ids ?? []) belegt.add(id)
  }
  return belegt
}

/** Leistungen pro Planzeile — Schlussrechnung erhält alle nicht zugeordneten Positionen. */
export function positionenFuerZahlungsplanZeile(
  zeile: ZahlungsplanZeile,
  allePositionen: AngebotPosition[],
  plan: Zahlungsplan
): AngebotPosition[] {
  const norm = normalizeAngebotPositionen(allePositionen).filter(
    (p) => p.gewerk_slug !== '__freitext__' || p.lohn_netto !== 0 || p.material_netto !== 0
  )
  if (zeile.typ === 'rest') {
    const belegt = positionIdsBelegt(plan)
    return norm.filter((p) => !belegt.has(p.id))
  }
  const ids = zeile.position_ids ?? []
  if (!ids.length) return []
  const idSet = new Set(ids)
  return norm.filter((p) => idSet.has(p.id))
}

export function rechnungDokumentBezeichnung(
  rechnungArt: RechnungArt | string | null | undefined,
  abschlagIndex?: number | null
): string {
  if (rechnungArt === 'schluss') return 'Schlussrechnung'
  if (rechnungArt === 'abschlag') {
    return abschlagIndex && abschlagIndex > 0 ? `Abschlagsrechnung ${abschlagIndex}` : 'Abschlagsrechnung'
  }
  return 'Rechnung'
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
      return `${label}: ${z.wert} % (Plan) — ${formatEur(z.netto)} netto / ${formatEur(z.brutto)} brutto`
    }
    if (z.typ === 'rest') {
      return `${label}: Restbetrag (Plan) — ${formatEur(z.netto)} netto / ${formatEur(z.brutto)} brutto`
    }
    return `${label} (Plan): ${formatEur(z.netto)} netto / ${formatEur(z.brutto)} brutto`
  })

  const planBlock = `Zahlungsplan (Info — Rechnungsbeträge ergeben sich aus den zugeordneten Leistungen):\n${zeilenText.join('\n')}`
  const zahlungsziel = `\n\n${standardRechnungZahlungstext(zahlungszielTage)}`
  if (!aktuelleZeile) return planBlock + zahlungsziel
  return planBlock + zahlungsziel
}

function leereRechnungBerechnung(voll: RechnungBerechnung): RechnungBerechnung {
  return {
    ...voll,
    netto: 0,
    brutto: 0,
    mwst_betrag: 0,
    lohn_netto: 0,
    material_netto: 0,
    mwst_aufschluesselung: [],
  }
}

/** Rechnungsbetrag = Summe der zugeordneten Leistungen. Plan-Prozente sind nur Info. */
export function rechnungBerechnungFuerAbschlagZeile(
  voll: RechnungBerechnung,
  _zeile: ZahlungsplanZeileBerechnet | null,
  rechnungArt: RechnungArt,
  positionen: AngebotPosition[],
  opts?: { reverseCharge13b?: boolean; kleinunternehmer?: boolean; defaultMwstSatz?: number }
): RechnungBerechnung {
  if (rechnungArt === 'voll') return voll
  if (positionen.length > 0) {
    return berechneRechnung(positionen, {
      kleinunternehmer: opts?.kleinunternehmer ?? false,
      reverseCharge13b: opts?.reverseCharge13b ?? false,
      defaultMwstSatz: opts?.defaultMwstSatz ?? 19,
    })
  }
  return leereRechnungBerechnung(voll)
}

/** @deprecated Plan-Prozent als Listenbetrag — nicht mehr für Abschlagsrechnungen genutzt. */
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
