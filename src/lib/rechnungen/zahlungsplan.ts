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
  /**
   * Geplantes Fälligkeitsdatum der Rate (ISO `YYYY-MM-DD`).
   * Optional — ältere Pläne ohne Feld bleiben gültig; Anzeige dann „—“ bzw. Rechnungs-Fälligkeit.
   */
  faellig_am?: string | null
  /** Auftragspositionen, die dieser Abschlagsrechnung zugeordnet sind (Schluss = Rest automatisch) */
  position_ids?: string[]
  pdf_einleitung_vorlage?: string | null
  mail_einleitung_vorlage?: string | null
  mail_betreff_vorlage?: string | null
}

/** Mock-Zahlplan-Rate: Geplant / Gestellt / Bezahlt */
export type ZahlplanRateStatus = 'geplant' | 'gestellt' | 'bezahlt'

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
  netto?: number | null
  mwst_satz?: number | null
  mwst_betrag?: number | null
  rechnungsnummer?: string | null
  faellig_am?: string | null
  beleg_typ?: string | null
}

export function emptyZahlungsplan(): Zahlungsplan {
  return { modus: 'standard', zeilen: [] }
}

export function neueZahlungsplanZeile(partial?: Partial<ZahlungsplanZeile>): ZahlungsplanZeile {
  return {
    id: partial?.id?.trim() || neueZahlungsplanId(),
    titel: partial?.titel?.trim() || 'Abschlag',
    typ: partial?.typ ?? 'prozent',
    wert: partial?.wert ?? 50,
    faellig_am: partial?.faellig_am?.trim() || null,
    position_ids: partial?.position_ids?.length ? [...partial.position_ids] : [],
    pdf_einleitung_vorlage: partial?.pdf_einleitung_vorlage ?? null,
    mail_einleitung_vorlage: partial?.mail_einleitung_vorlage ?? null,
    mail_betreff_vorlage: partial?.mail_betreff_vorlage ?? null,
  }
}

function plusDaysIso(days: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
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
      faellig_am:
        typeof z.faellig_am === 'string' && /^\d{4}-\d{2}-\d{2}/.test(z.faellig_am.trim())
          ? z.faellig_am.trim().slice(0, 10)
          : null,
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
      neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 50, faellig_am: plusDaysIso(14) }),
      neueZahlungsplanZeile({
        titel: 'Schlussrechnung',
        typ: 'prozent',
        wert: 50,
        faellig_am: plusDaysIso(60),
      }),
    ],
  }
}

/** Mock-Label „Anzahlung 30% + Rest“ */
export function zahlungsplanVorlage30_70(): Zahlungsplan {
  return {
    modus: 'abschlagsplan',
    zeilen: [
      neueZahlungsplanZeile({ titel: 'Anzahlung', typ: 'prozent', wert: 30, faellig_am: plusDaysIso(7) }),
      neueZahlungsplanZeile({
        titel: 'Schlussrechnung',
        typ: 'prozent',
        wert: 70,
        faellig_am: plusDaysIso(60),
      }),
    ],
  }
}

/** Mock-Vorlage „30 / 40 / 30“ */
export function zahlungsplanVorlage30_40_30(): Zahlungsplan {
  return {
    modus: 'abschlagsplan',
    zeilen: [
      neueZahlungsplanZeile({ titel: '1. Abschlag', typ: 'prozent', wert: 30, faellig_am: plusDaysIso(14) }),
      neueZahlungsplanZeile({ titel: '2. Abschlag', typ: 'prozent', wert: 40, faellig_am: plusDaysIso(45) }),
      neueZahlungsplanZeile({
        titel: 'Schlussrechnung',
        typ: 'prozent',
        wert: 30,
        faellig_am: plusDaysIso(75),
      }),
    ],
  }
}

/** @deprecated Alias — nutze zahlungsplanVorlage30_40_30 */
export function zahlungsplanVorlage3x(): Zahlungsplan {
  return zahlungsplanVorlage30_40_30()
}

export function rechnungFuerAbschlagZeile(
  zeileId: string,
  rechnungen: RechnungAbschlagLink[]
): RechnungAbschlagLink | null {
  return (
    rechnungen.find(
      (r) => r.zahlungsplan_abschlag_id === zeileId && r.status !== 'storniert'
    ) ?? null
  )
}

/** Alle Belege zu einer Planzeile (inkl. Storno/Gutschrift) — für Anzahl in der Liste. */
export function rechnungenZuAbschlagZeile<
  T extends {
    id?: string
    zahlungsplan_abschlag_id?: string | null
    bezug_rechnung_id?: string | null
  },
>(zeileId: string, rechnungen: T[]): T[] {
  const direct = rechnungen.filter((r) => String(r.zahlungsplan_abschlag_id ?? '') === zeileId)
  if (direct.length === 0) return []
  const parentIds = new Set(
    direct.map((r) => String(r.id ?? '')).filter(Boolean)
  )
  const viaBezug = rechnungen.filter((r) => {
    const bezug = String(r.bezug_rechnung_id ?? '')
    return Boolean(bezug) && parentIds.has(bezug)
  })
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of [...direct, ...viaBezug]) {
    const id = String(r.id ?? '')
    if (id && seen.has(id)) continue
    if (id) seen.add(id)
    out.push(r)
  }
  return out
}

/** Letzte stornierte Rechnung zu einer Planzeile (Rate wieder „geplant“). */
export function stornierteRechnungFuerAbschlagZeile(
  zeileId: string,
  rechnungen: RechnungAbschlagLink[]
): RechnungAbschlagLink | null {
  let latest: RechnungAbschlagLink | null = null
  for (const r of rechnungen) {
    if (r.zahlungsplan_abschlag_id === zeileId && String(r.status) === 'storniert') {
      latest = r
    }
  }
  return latest
}

export function zahlplanRateStatus(
  zeileId: string,
  rechnungen: RechnungAbschlagLink[]
): ZahlplanRateStatus {
  const r = rechnungFuerAbschlagZeile(zeileId, rechnungen)
  if (!r) return 'geplant'
  const st = String(r.status)
  if (st === 'entwurf') return 'geplant'
  if (st === 'bezahlt') return 'bezahlt'
  return 'gestellt'
}

/** Gestellte/bezahlte Raten → Ist-Brutto für Rest-Berechnung der Schlussrate.
 * Schlussrechnungen und Entwürfe fließen nicht ein (Brutto oft = volle Leistungssumme). */
export function zahlplanAbgerechnetAusLinks(
  rechnungen: RechnungAbschlagLink[]
): Array<{ zeileId: string; brutto: number }> {
  const out: Array<{ zeileId: string; brutto: number }> = []
  for (const r of rechnungen) {
    if (String(r.status) === 'storniert' || String(r.status) === 'entwurf') continue
    if (String(r.beleg_typ ?? '') === 'gutschrift') continue
    if (String(r.rechnung_art ?? '') === 'schluss') continue
    const id = r.zahlungsplan_abschlag_id?.trim()
    if (!id) continue
    const b = Number(r.brutto)
    if (!Number.isFinite(b) || b <= 0) continue
    out.push({ zeileId: id, brutto: b })
  }
  return out
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
  mwstSatz = 19,
  /**
   * Bereits gestellte/bezahlte Raten (Ist-Betrag der Rechnung).
   * Ohne das würde die Schlussrate nach theoretischem %-Anteil der *neuen* Summe
   * gerechnet — falsch, wenn ein Abschlag schon zu einem anderen Gesamt gestellt wurde.
   */
  abgerechnet?: Array<{ zeileId: string; brutto: number }> | null
): AuftragAbrechnungKontext {
  const ratio = gesamtNetto > 0 ? mwstSatz / 100 : 0
  const gesamtBrutto = Math.round(gesamtNetto * (1 + ratio) * 100) / 100
  const abById = new Map<string, number>()
  for (const a of abgerechnet ?? []) {
    const id = a.zeileId?.trim()
    if (!id) continue
    const b = Number(a.brutto)
    if (Number.isFinite(b) && b > 0) abById.set(id, b)
  }

  let verteiltNetto = 0
  const restIdx = plan.zeilen.findIndex((z) => z.typ === 'rest')
  const zeilen: ZahlungsplanZeileBerechnet[] = []

  plan.zeilen.forEach((z, i) => {
    const index = i + 1
    const istSchluss = z.typ === 'rest' || (restIdx === -1 && i === plan.zeilen.length - 1)
    const billedBrutto = abById.get(z.id)
    let netto = 0
    let brutto = 0

    if (billedBrutto != null && !istSchluss) {
      // Ist-Rechnung gilt für Abschläge — nicht neu aus % der aktuellen Auftragssumme ableiten.
      // Schlussrate: immer echter Rest (DB-Brutto der Schlussrechnung ist oft die volle Leistungssumme).
      brutto = Math.round(billedBrutto * 100) / 100
      netto =
        ratio > 0
          ? Math.round((brutto / (1 + ratio)) * 100) / 100
          : brutto
      verteiltNetto += netto
    } else if (istSchluss) {
      // Offene Schluss-/letzte Rate = echter Rest nach bereits abgerechneten Raten
      netto = Math.max(0, Math.round((gesamtNetto - verteiltNetto) * 100) / 100)
      brutto = Math.round(netto * (1 + ratio) * 100) / 100
    } else if (z.typ === 'prozent') {
      netto = Math.round(gesamtNetto * (Math.max(0, z.wert) / 100) * 100) / 100
      verteiltNetto += netto
      brutto = Math.round(netto * (1 + ratio) * 100) / 100
    } else {
      netto = Math.max(0, Math.round(z.wert * 100) / 100)
      verteiltNetto += netto
      brutto = Math.round(netto * (1 + ratio) * 100) / 100
    }

    zeilen.push({ ...z, index, netto, brutto, istSchluss })
  })

  return { gesamtNetto, gesamtBrutto, zeilen }
}

/**
 * Prüft, ob Abschläge die Auftragssumme (VK netto) überschreiten können.
 * Typisch: mehrere %- oder Betragszeilen ohne Deckel (z. B. 60 %+60 %+Rest → 120 %).
 */
export function validateZahlungsplanGegenGesamt(
  plan: Zahlungsplan,
  gesamtNetto: number
): { ok: true } | { ok: false; message: string } {
  if (!plan.zeilen.length) {
    return { ok: false, message: 'Mindestens eine Abschlagszeile erforderlich.' }
  }

  const restIdx = plan.zeilen.findIndex((z) => z.typ === 'rest')
  let verteiltNetto = 0
  let verteiltProzent = 0

  for (let i = 0; i < plan.zeilen.length; i++) {
    const z = plan.zeilen[i]!
    const istRestZeile = z.typ === 'rest' || (restIdx === -1 && i === plan.zeilen.length - 1)
    if (istRestZeile) continue

    if (z.typ === 'prozent') {
      const p = Math.max(0, Number(z.wert) || 0)
      verteiltProzent += p
      verteiltNetto += Math.round(gesamtNetto * (p / 100) * 100) / 100
    } else {
      verteiltNetto += Math.max(0, Math.round((Number(z.wert) || 0) * 100) / 100)
    }
  }

  if (verteiltProzent > 100.05) {
    return {
      ok: false,
      message: `Die Abschläge addieren sich auf ${round1(verteiltProzent)} % — mehr als 100 % der Auftragssumme (VK).`,
    }
  }

  if (gesamtNetto > 0 && verteiltNetto > gesamtNetto + 0.02) {
    return {
      ok: false,
      message: `Die Abschläge (${formatEur(verteiltNetto)} netto) übersteigen die Auftragssumme (${formatEur(gesamtNetto)} netto).`,
    }
  }

  // Alle Zeilen als Prozent (Auftrag-Modal): Summe der Anteile muss 100 % sein
  const alleProzent = plan.zeilen.every((z) => z.typ === 'prozent')
  if (alleProzent && restIdx === -1) {
    const sumPct = plan.zeilen.reduce((s, z) => s + Math.max(0, Number(z.wert) || 0), 0)
    if (Math.abs(sumPct - 100) > 0.05) {
      return {
        ok: false,
        message: `Summe der Anteile ist ${round1(sumPct)} % — muss genau 100 % sein.`,
      }
    }
  }

  return { ok: true }
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString('de-DE')
}

/**
 * Schlussrechnung: alle Auftragsleistungen (Übersicht).
 * Abzüge erscheinen nicht als Positionszeile — im PDF als Summenblock
 * (Netto → MwSt → Brutto → bereits gezahlt → Restsumme).
 */
export function positionenFuerAbschlagRechnung(input: {
  zeile: ZahlungsplanZeileBerechnet
  allePositionen: AngebotPosition[]
  plan: Zahlungsplan
  gesamtNetto: number
  auftragsReferenz: string
  projektTitel: string
  bereitsGestelltBrutto: number
  /** @deprecated Abzüge laufen über den Summenblock, nicht als Position. */
  vorherigeAbschlaege?: RechnungAbschlagLink[] | null
  ausserRechnungId?: string | null
}): AngebotPosition[] {
  if (input.zeile.istSchluss) {
    return buildSchlussrechnungPositionen({
      allePositionen: input.allePositionen,
    })
  }

  const assigned = positionenFuerZahlungsplanZeile(
    input.zeile,
    input.allePositionen,
    input.plan
  )
  if (assigned.length > 0) return assigned
  return [
    buildAbschlagPauschalPosition({
      zeile: input.zeile,
      gesamtNetto: input.gesamtNetto,
      auftragsReferenz: input.auftragsReferenz,
      projektTitel: input.projektTitel,
      bereitsGestelltBrutto: input.bereitsGestelltBrutto,
    }),
  ]
}

/** Netto-Abzug aus einer bereits gestellten Abschlagsrechnung. */
export function abschlagAbzugNetto(r: RechnungAbschlagLink): number {
  const netto = Number(r.netto)
  if (Number.isFinite(netto) && Math.abs(netto) > 0.0001) {
    return Math.round(Math.abs(netto) * 100) / 100
  }
  const brutto = Number(r.brutto)
  if (!Number.isFinite(brutto) || Math.abs(brutto) < 0.0001) return 0
  return Math.round(Math.abs(brutto) * 100) / 100
}

/** MwSt.-Satz der Abzugszeile = Satz der Original-Abschlagsrechnung. */
export function abschlagAbzugMwstSatz(r: RechnungAbschlagLink): number | undefined {
  const s = Number(r.mwst_satz)
  if (s === 0 || s === 7 || s === 19) return s
  const mwst = Number(r.mwst_betrag)
  if (Number.isFinite(mwst) && Math.abs(mwst) < 0.01) return 0
  const netto = Number(r.netto)
  const brutto = Number(r.brutto)
  if (
    Number.isFinite(netto) &&
    Number.isFinite(brutto) &&
    Math.abs(netto) > 0.0001 &&
    Math.abs(brutto - netto) < 0.02
  ) {
    return 0
  }
  return undefined
}

export type SchlussAbrechnungZeile = {
  label: string
  brutto: number
  netto: number
  mwst_betrag: number
}

export type SchlussAbrechnung = {
  /** Summe aller Leistungen (vor Abzug) */
  netto: number
  mwst_prozent: number
  mwst_betrag: number
  brutto: number
  bereits_gezahlt: SchlussAbrechnungZeile[]
  bereits_gezahlt_brutto: number
  /** Noch zu zahlen */
  rest_netto: number
  rest_mwst: number
  rest_brutto: number
}

function roundGeld(n: number): number {
  return Math.round(n * 100) / 100
}

/** Klartext-Abrechnung Schluss: Leistungen → bereits gezahlt → Rest. */
export function berechneSchlussAbrechnung(
  leistungen: AngebotPosition[],
  vorherigeAbschlaege: RechnungAbschlagLink[],
  opts?: {
    reverseCharge13b?: boolean
    kleinunternehmer?: boolean
    defaultMwstSatz?: number
    ausserRechnungId?: string | null
    ausserZeileId?: string | null
  }
): SchlussAbrechnung {
  const nurLeistungen = normalizeAngebotPositionen(leistungen).filter((p) => {
    if (istAbschlagPauschalPosition(p)) return false
    if ((p.gewerk_slug ?? '').toLowerCase() === 'abschlag_abzug') return false
    if ((p.leistung ?? '').toLowerCase().startsWith('abzüglich')) return false
    return true
  })
  const voll = berechneRechnung(nurLeistungen, {
    kleinunternehmer: opts?.kleinunternehmer ?? false,
    reverseCharge13b: opts?.reverseCharge13b ?? false,
    defaultMwstSatz: opts?.defaultMwstSatz ?? 19,
  })

  const bereits_gezahlt: SchlussAbrechnungZeile[] = []
  const gesehen = new Set<string>()
  for (const r of vorherigeAbschlaege) {
    if (r.id === opts?.ausserRechnungId) continue
    if (r.status === 'storniert') continue
    if (r.rechnung_art !== 'abschlag' && r.rechnung_art !== 'schluss') continue
    if (
      opts?.ausserZeileId &&
      r.zahlungsplan_abschlag_id &&
      r.zahlungsplan_abschlag_id === opts.ausserZeileId
    ) {
      continue
    }
    if (gesehen.has(r.id)) continue
    gesehen.add(r.id)
    const netto = abschlagAbzugNetto(r)
    const bruttoRaw = Number(r.brutto)
    const brutto =
      Number.isFinite(bruttoRaw) && Math.abs(bruttoRaw) > 0.0001
        ? roundGeld(Math.abs(bruttoRaw))
        : netto
    if (brutto <= 0 && netto <= 0) continue
    const mwstRaw = Number(r.mwst_betrag)
    const mwst_betrag =
      Number.isFinite(mwstRaw) && Math.abs(mwstRaw) > 0.0001
        ? roundGeld(Math.abs(mwstRaw))
        : roundGeld(Math.max(0, brutto - netto))
    const idx = r.abschlag_index && r.abschlag_index > 0 ? r.abschlag_index : bereits_gezahlt.length + 1
    const nr = r.rechnungsnummer?.trim()
    bereits_gezahlt.push({
      label: `Abschlag ${idx}${nr ? ` (${nr})` : ''}`,
      brutto: brutto || netto,
      netto,
      mwst_betrag,
    })
  }

  const bereits_gezahlt_brutto = roundGeld(
    bereits_gezahlt.reduce((s, z) => s + z.brutto, 0)
  )
  const bereitsNetto = roundGeld(bereits_gezahlt.reduce((s, z) => s + z.netto, 0))
  const bereitsMwst = roundGeld(bereits_gezahlt.reduce((s, z) => s + z.mwst_betrag, 0))

  const rest_netto = roundGeld(Math.max(0, voll.netto - bereitsNetto))
  const rest_mwst = roundGeld(Math.max(0, voll.mwst_betrag - bereitsMwst))
  const rest_brutto = roundGeld(Math.max(0, voll.brutto - bereits_gezahlt_brutto))

  return {
    netto: voll.netto,
    mwst_prozent: voll.mwst_satz || opts?.defaultMwstSatz || 19,
    mwst_betrag: voll.mwst_betrag,
    brutto: voll.brutto,
    bereits_gezahlt,
    bereits_gezahlt_brutto,
    rest_netto,
    rest_mwst,
    rest_brutto,
  }
}

/** Schlussrechnung = nur Leistungsübersicht (keine Abzugszeilen). */
export function buildSchlussrechnungPositionen(input: {
  allePositionen: AngebotPosition[]
  vorherigeAbschlaege?: RechnungAbschlagLink[]
  ausserRechnungId?: string | null
  ausserZeileId?: string | null
  auftragsReferenz?: string
}): AngebotPosition[] {
  return normalizeAngebotPositionen(input.allePositionen).filter((p) => {
    if (istAbschlagPauschalPosition(p)) return false
    if ((p.gewerk_slug ?? '').toLowerCase() === 'abschlag_abzug') return false
    if ((p.leistung ?? '').toLowerCase().startsWith('abzüglich')) return false
    if (p.gewerk_slug === '__freitext__' && p.lohn_netto === 0 && p.material_netto === 0) {
      return false
    }
    return true
  })
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

/** Alte Entwürfe hatten nur eine Abschlag-Pauschalposition — Auftragspositionen wiederherstellen.
 * Bei echten Abschlag-/Schluss-Belegen die Pauschalposition behalten (Ratenbetrag). */
export function rechnungPositionenMitAuftrag(
  gespeichert: AngebotPosition[],
  auftragPositionen: AngebotPosition[],
  opts?: { keepAbschlagPauschal?: boolean }
): AngebotPosition[] {
  const norm = normalizeAngebotPositionen(gespeichert)
  const auftrag = normalizeAngebotPositionen(auftragPositionen)
  if (!auftrag.length) return norm
  if (norm.length === 0) return auftrag
  if (opts?.keepAbschlagPauschal) return norm

  const nurPauschal =
    (norm.length === 1 && istAbschlagPauschalPosition(norm[0]!)) ||
    (norm.length > 0 && norm.every(istAbschlagPauschalPosition))
  if (nurPauschal) {
    // Ratenbetrag ≠ Auftragssumme → bewusst Abschlag/Schluss, nicht aufblasen
    const pauschalNetto = auftragSummenAusPositionen(norm).netto
    const auftragNetto = auftragSummenAusPositionen(auftrag).netto
    if (Math.abs(pauschalNetto - auftragNetto) > 0.05) return norm
    return auftrag
  }
  return norm
}

/** Gestellt/bezahlt — Entwürfe zählen nicht als abgerechnet (einzeln senden). */
export function istRechnungGestelltOderBezahlt(status: string | null | undefined): boolean {
  const st = String(status ?? '')
    .trim()
    .toLowerCase()
  return st === 'gesendet' || st === 'versendet' || st === 'bezahlt'
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
      istRechnungGestelltOderBezahlt(r.status) &&
      (r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss')
  )
}

export function berechneBereitsGestellt(
  rechnungen: RechnungAbschlagLink[]
): { nettoGeschaetzt: number; brutto: number } {
  let brutto = 0
  for (const r of rechnungen) {
    if (!istRechnungGestelltOderBezahlt(r.status)) continue
    if (r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss') {
      brutto += Number(r.brutto ?? 0)
    }
  }
  return { nettoGeschaetzt: 0, brutto }
}

/** Gestellte Abschlag-/Schluss-/Vollrechnung (Entwürfe zählen nicht gegen VK). */
function istGestellteAbrechnungRelevant(r: RechnungAbschlagLink): boolean {
  if (!istRechnungGestelltOderBezahlt(r.status)) return false
  const art = String(r.rechnung_art ?? '')
    .trim()
    .toLowerCase()
  if (!art) return true
  return art === 'abschlag' || art === 'schluss' || art === 'voll'
}

export function summeGestellteRechnungenBrutto(
  bestehende: RechnungAbschlagLink[],
  ausserRechnungId?: string | null
): number {
  let sum = 0
  for (const r of bestehende) {
    if (ausserRechnungId && r.id === ausserRechnungId) continue
    if (!istGestellteAbrechnungRelevant(r)) continue
    const b = Number(r.brutto ?? 0)
    if (Number.isFinite(b) && b > 0) sum += b
  }
  return Math.round(sum * 100) / 100
}

/**
 * Hard-Gate: Σ bereits gestellter RE-Brutto + neue Rechnung darf VK-Brutto
 * (gesamtNetto × (1+MwSt)) nicht um mehr als 0,50 € überschreiten.
 */
export function validateGestellteRechnungenGegenVk(input: {
  bestehende: RechnungAbschlagLink[]
  gesamtNetto: number
  neueNetto: number
  ausserRechnungId?: string | null
  mwstSatz?: number
}): { ok: true } | { ok: false; message: string } {
  const mwst = input.mwstSatz ?? 19
  const ratio = 1 + mwst / 100
  const vkBrutto = Math.round(Math.max(0, input.gesamtNetto) * ratio * 100) / 100
  const bereits = summeGestellteRechnungenBrutto(input.bestehende, input.ausserRechnungId)
  const neueBrutto =
    Math.round(Math.max(0, input.neueNetto) * ratio * 100) / 100
  const sum = Math.round((bereits + neueBrutto) * 100) / 100
  if (sum > vkBrutto + 0.5) {
    return {
      ok: false,
      message: `Die Summe der Rechnungen (${formatEur(sum)} brutto) übersteigt die Auftragssumme (${formatEur(vkBrutto)} brutto). Bitte Beträge prüfen oder eine Rechnung stornieren.`,
    }
  }
  return { ok: true }
}

/**
 * Abgeschlossener Auftrag, Zahlung noch nicht vollständig (#5).
 */
export function auftragHatZahlungOffen(input: {
  auftragStatus: string | null | undefined
  rechnungen: RechnungAbschlagLink[]
  gesamtNetto: number
  mwstSatz?: number
}): boolean {
  if (String(input.auftragStatus ?? '').toLowerCase() !== 'abgeschlossen') return false
  const mwst = input.mwstSatz ?? 19
  const vkBrutto =
    Math.round(Math.max(0, input.gesamtNetto) * (1 + mwst / 100) * 100) / 100
  const aktiv = input.rechnungen.filter(
    (r) => String(r.status ?? '').toLowerCase() !== 'storniert'
  )
  if (aktiv.length === 0) return true
  const unpaid = aktiv.some((r) => String(r.status ?? '').toLowerCase() !== 'bezahlt')
  if (unpaid) return true
  const bezahltBrutto = aktiv
    .filter((r) => String(r.status ?? '').toLowerCase() === 'bezahlt')
    .reduce((s, r) => s + (Number(r.brutto) || 0), 0)
  return bezahltBrutto < vkBrutto - 0.5
}

/**
 * Soft-Warning für UI: bereits gestellte/bezahlte RE-Brutto vs. VK-Brutto
 * (ohne neue Rechnung).
 */
export function softWarnGestellteRechnungenGegenVk(input: {
  bestehende: RechnungAbschlagLink[]
  gesamtNetto: number
  mwstSatz?: number
  ausserRechnungId?: string | null
  toleranzEur?: number
}):
  | { warn: false }
  | { warn: true; message: string; gestelltBrutto: number; vkBrutto: number } {
  const mwst = input.mwstSatz ?? 19
  const toleranz = input.toleranzEur ?? 0.5
  const vkBrutto =
    Math.round(Math.max(0, input.gesamtNetto) * (1 + mwst / 100) * 100) / 100
  const gestelltBrutto = summeGestellteRechnungenBrutto(
    input.bestehende,
    input.ausserRechnungId
  )
  if (gestelltBrutto <= vkBrutto + toleranz) return { warn: false }
  return {
    warn: true,
    gestelltBrutto,
    vkBrutto,
    message: `Bereits gestellte Rechnungen (${formatEur(gestelltBrutto)} brutto) übersteigen die Auftragssumme (${formatEur(vkBrutto)} brutto).`,
  }
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

/**
 * Nächste Rate zum Versenden: erste nicht gestellte/bezahlte Zeile,
 * inkl. vorhandenem Entwurf (wenn beim Plan-Anlegen alle RE erzeugt wurden).
 */
export function naechsteAbschlagZumVersenden(
  kontext: AuftragAbrechnungKontext,
  rechnungen: RechnungAbschlagLink[]
): { zeile: ZahlungsplanZeileBerechnet; rechnungId: string | null } | null {
  for (const z of kontext.zeilen) {
    if (abschlagBereitsAbgerechnet(z.id, rechnungen)) continue
    const draft = rechnungen.find(
      (r) =>
        r.zahlungsplan_abschlag_id === z.id &&
        String(r.status ?? '') === 'entwurf' &&
        String(r.beleg_typ ?? '') !== 'gutschrift' &&
        (r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss')
    )
    return { zeile: z, rechnungId: draft?.id ?? null }
  }
  return null
}

/** Aktiver Abschlagsplan (mind. eine Zeile). */
export function hatAktivenAbschlagsplan(plan: Zahlungsplan | null | undefined): boolean {
  return Boolean(plan?.zeilen?.length)
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
    zeile.typ === 'prozent' && !zeile.istSchluss
      ? `${zeile.wert} % von ${formatEur(gesamtNetto)} netto`
      : `${formatEur(zeile.netto)} netto`
  const beschreibung = zeile.istSchluss
    ? `${projektTitel || auftragsReferenz}${
        bereitsGestelltBrutto > 0
          ? ` · bereits abgerechnet ${formatEur(bereitsGestelltBrutto)} brutto`
          : ''
      } · Rest ${formatEur(zeile.netto)} netto`
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
