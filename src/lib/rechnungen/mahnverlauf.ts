/**
 * Mahnstufen gehören immer zur Ursprungsrechnung (Timestamps + E-Mail-Log).
 * Es werden keine eigenen Rechnungsobjekte angelegt.
 *
 * Anker: späteres aus effektiver Fälligkeit und Versandtag (gesendet_at).
 * Nie zwei Zahlungserinnerungen an aufeinanderfolgenden Kalendertagen.
 */

import {
  tageSeitEffektiverFaelligkeit,
  tageZwischenYmd,
  ymdAusIsoInZezone,
  heuteYmdInZezone,
  effektivesFaelligAmYmd,
  parseYmdLocal,
  formatYmdLocal,
} from '@/lib/dates/werktag'

export type MahnverlaufStufeId = 'rechnung' | 'stufe1' | 'stufe2' | 'intern30'

export type MahnverlaufStufeState = 'done' | 'active' | 'open' | 'skipped'

export type MahnverlaufStufe = {
  id: MahnverlaufStufeId
  label: string
  sentAt: string | null
  state: MahnverlaufStufeState
  hint?: string
}

export type RechnungMahnKontext = {
  status: string
  beleg_typ?: string | null
  gesendet_at?: string | null
  erinnerung_7_sent_at?: string | null
  erinnerung_21_sent_at?: string | null
  intern_warnung_30_at?: string | null
  faellig_am?: string | null
  bezahlt_at?: string | null
}

export type RechnungListeMahnKontext = Pick<
  RechnungMahnKontext,
  'status' | 'erinnerung_7_sent_at' | 'erinnerung_21_sent_at'
>

/** Tage seit effektiver Fälligkeit (Sa/So → Montag). */
export function tageSeitFaelligkeitRechnung(faelligAm: string | null | undefined): number {
  return tageSeitEffektiverFaelligkeit(faelligAm)
}

/** Erste Erinnerung: erster Kalendertag nach Mahn-Anker (Fälligkeit ∪ Versand). */
export const MAHNUNG_STUFE1_AB_TAGE_UEBERFAELLIG = 1
/** Zweite Erinnerung: 7 Tage nach der ersten, falls weiter unbezahlt. */
export const MAHNUNG_STUFE2_TAGE_NACH_ERSTER = 7
/** Interne Warnung ab 30 Tagen über Anker. */
export const MAHNUNG_INTERN_TAGE_UEBERFAELLIG = 30
/**
 * Mindestabstand zwischen zwei Kunden-Zahlungserinnerungen (Kalendertage).
 * 2 = nie gestern + heute hintereinander.
 */
export const MAHNUNG_MIN_TAGE_ZWISCHEN_ERINNERUNGEN = 2

function maxYmd(a: string | null | undefined, b: string | null | undefined): string | null {
  const aa = a?.trim().slice(0, 10) || ''
  const bb = b?.trim().slice(0, 10) || ''
  if (!aa) return bb || null
  if (!bb) return aa || null
  return aa >= bb ? aa : bb
}

/**
 * Mahn-Anker = max(effektive Fälligkeit, Versandtag).
 * Verhindert Sofort-Mahnung, wenn faellig_am ≤ Versandtag (z. B. „zahlbar sofort“).
 */
export function mahnAnkerYmd(
  faelligAm: string | null | undefined,
  gesendetAt: string | null | undefined
): string | null {
  const faelligEff = effektivesFaelligAmYmd(faelligAm)
  const gesendetYmd = gesendetAt ? ymdAusIsoInZezone(gesendetAt) : null
  return maxYmd(faelligEff, gesendetYmd || null)
}

export function tageSeitMahnAnker(
  faelligAm: string | null | undefined,
  gesendetAt: string | null | undefined,
  heuteYmd: string = heuteYmdInZezone()
): number {
  const anker = mahnAnkerYmd(faelligAm, gesendetAt)
  if (!anker) return 0
  return tageZwischenYmd(anker, heuteYmd)
}

function tageSeitZeitpunkt(iso: string | null | undefined, heuteYmd: string = heuteYmdInZezone()): number {
  if (!iso) return 0
  const ymd = /^\d{4}-\d{2}-\d{2}$/.test(iso.trim()) ? iso.trim().slice(0, 10) : ymdAusIsoInZezone(iso)
  if (!ymd) return 0
  return tageZwischenYmd(ymd, heuteYmd)
}

/** Letzter Kalendertag einer Kunden-Erinnerung (Timestamps oder Mail-Log). */
export function letzteZahlungserinnerungYmd(input: {
  erinnerung_7_sent_at?: string | null
  erinnerung_21_sent_at?: string | null
  /** Letzte zahlungserinnerung aus email_log (YYYY-MM-DD oder ISO) */
  letzteErinnerungMailAt?: string | null
}): string | null {
  const candidates = [
    input.erinnerung_21_sent_at,
    input.erinnerung_7_sent_at,
    input.letzteErinnerungMailAt,
  ]
    .map((v) => {
      if (!v?.trim()) return null
      if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim().slice(0, 10)
      return ymdAusIsoInZezone(v) || null
    })
    .filter((x): x is string => Boolean(x))
  if (!candidates.length) return null
  return candidates.reduce((a, b) => (a >= b ? a : b))
}

export function inferZahlungserinnerungStufeFromBetreff(
  betreff: string | null | undefined
): 1 | 2 | null {
  const t = (betreff ?? '').trim().toLowerCase()
  if (!t) return null
  if (t.includes('2. zahlungserinnerung') || t.startsWith('2.')) return 2
  if (t.includes('zahlungserinnerung')) return 1
  return null
}

export type CronMahnungAktion = 'stufe1' | 'stufe2' | 'intern30'

export type CronMahnungRechnung = {
  faellig_am: string | null
  gesendet_at?: string | null
  erinnerung_7_sent_at: string | null
  erinnerung_21_sent_at: string | null
  intern_warnung_30_at: string | null
  /** Aus email_log — verhindert Doppelversand wenn Timestamp fehlt */
  letzteErinnerungMailAt?: string | null
  /** true wenn email_log bereits eine Stufe-1-Mail hat */
  hatStufe1Mail?: boolean
  /** true wenn email_log bereits eine Stufe-2-Mail hat */
  hatStufe2Mail?: boolean
}

/**
 * Eine Aktion pro Lauf — nie Stufe 1 und 2 am selben Tag, nie an aufeinanderfolgenden Tagen.
 * Anker = max(Fälligkeit, Versandtag).
 */
export function cronMahnungFuerRechnung(
  r: CronMahnungRechnung,
  heuteYmd: string = heuteYmdInZezone()
): CronMahnungAktion | null {
  if (!r.gesendet_at?.trim()) return null

  const tage = tageSeitMahnAnker(r.faellig_am, r.gesendet_at, heuteYmd)
  if (tage < MAHNUNG_STUFE1_AB_TAGE_UEBERFAELLIG) return null

  const stufe1Done = Boolean(r.erinnerung_7_sent_at) || Boolean(r.hatStufe1Mail)
  const stufe2Done = Boolean(r.erinnerung_21_sent_at) || Boolean(r.hatStufe2Mail)

  const letzteYmd = letzteZahlungserinnerungYmd({
    erinnerung_7_sent_at: r.erinnerung_7_sent_at,
    erinnerung_21_sent_at: r.erinnerung_21_sent_at,
    letzteErinnerungMailAt: r.letzteErinnerungMailAt,
  })
  if (letzteYmd != null) {
    const gap = tageZwischenYmd(letzteYmd, heuteYmd)
    if (gap < MAHNUNG_MIN_TAGE_ZWISCHEN_ERINNERUNGEN) return null
  }

  if (!stufe1Done) return 'stufe1'

  if (!stufe2Done) {
    const seitErster = r.erinnerung_7_sent_at
      ? tageSeitZeitpunkt(r.erinnerung_7_sent_at, heuteYmd)
      : r.letzteErinnerungMailAt
        ? tageSeitZeitpunkt(r.letzteErinnerungMailAt, heuteYmd)
        : 0
    if (seitErster >= MAHNUNG_STUFE2_TAGE_NACH_ERSTER) return 'stufe2'
    return null
  }

  if (!r.intern_warnung_30_at && tage >= MAHNUNG_INTERN_TAGE_UEBERFAELLIG) return 'intern30'
  return null
}

export function rechnungHatMahnverlauf(ctx: RechnungMahnKontext): boolean {
  if ((ctx.beleg_typ ?? 'rechnung') === 'gutschrift') return false
  return Boolean(
    ctx.erinnerung_7_sent_at ||
      ctx.erinnerung_21_sent_at ||
      ctx.intern_warnung_30_at
  )
}

export function aktuelleMahnstufeNummer(ctx: RechnungMahnKontext): 0 | 1 | 2 | 3 {
  if (ctx.intern_warnung_30_at) return 3
  if (ctx.erinnerung_21_sent_at) return 2
  if (ctx.erinnerung_7_sent_at) return 1
  return 0
}

export function mahnstufeListenLabel(ctx: RechnungListeMahnKontext): string | null {
  const st = (ctx.status ?? '').toLowerCase()
  if (st === 'bezahlt' || st === 'storniert') return null
  if (ctx.erinnerung_21_sent_at) return 'Mahnung 2'
  if (ctx.erinnerung_7_sent_at) return 'Mahnung 1'
  return null
}

export function mahnstufeStatusZusatz(ctx: RechnungListeMahnKontext): string | null {
  return mahnstufeListenLabel(ctx)
}

export function naechsteZahlungserinnerungStufe(
  ctx: RechnungMahnKontext
): 1 | 2 | null {
  const st = (ctx.status ?? '').toLowerCase()
  if (st !== 'gesendet') return null
  if ((ctx.beleg_typ ?? 'rechnung') === 'gutschrift') return null
  if (!ctx.gesendet_at?.trim()) return null
  if (tageSeitMahnAnker(ctx.faellig_am, ctx.gesendet_at) < MAHNUNG_STUFE1_AB_TAGE_UEBERFAELLIG) {
    return null
  }
  const letzteYmd = letzteZahlungserinnerungYmd({
    erinnerung_7_sent_at: ctx.erinnerung_7_sent_at,
    erinnerung_21_sent_at: ctx.erinnerung_21_sent_at,
  })
  if (letzteYmd != null) {
    const gap = tageZwischenYmd(letzteYmd, heuteYmdInZezone())
    if (gap < MAHNUNG_MIN_TAGE_ZWISCHEN_ERINNERUNGEN) return null
  }
  if (!ctx.erinnerung_7_sent_at) return 1
  if (
    !ctx.erinnerung_21_sent_at &&
    tageSeitZeitpunkt(ctx.erinnerung_7_sent_at) >= MAHNUNG_STUFE2_TAGE_NACH_ERSTER
  ) {
    return 2
  }
  return null
}

export function buildRechnungMahnverlauf(ctx: RechnungMahnKontext): MahnverlaufStufe[] {
  const st = (ctx.status ?? '').toLowerCase()
  const abgeschlossen = st === 'bezahlt' || st === 'storniert'
  const tage = tageSeitMahnAnker(ctx.faellig_am, ctx.gesendet_at)
  const naechste = abgeschlossen ? null : naechsteZahlungserinnerungStufe(ctx)

  const stufeState = (
    sentAt: string | null | undefined,
    stufe: 1 | 2
  ): MahnverlaufStufeState => {
    if (sentAt) return 'done'
    if (abgeschlossen) return 'skipped'
    if (naechste === stufe) return 'active'
    return 'open'
  }

  const internState: MahnverlaufStufeState = ctx.intern_warnung_30_at
    ? 'done'
    : abgeschlossen
      ? 'skipped'
      : tage >= 30
        ? 'active'
        : 'open'

  return [
    {
      id: 'rechnung',
      label: 'Rechnung versendet',
      sentAt: ctx.gesendet_at ?? null,
      state: ctx.gesendet_at || st === 'gesendet' || abgeschlossen ? 'done' : 'open',
      hint: 'Ursprungsrechnung — alle Mahnstufen beziehen sich auf diese Nummer.',
    },
    {
      id: 'stufe1',
      label: '1. Zahlungserinnerung',
      sentAt: ctx.erinnerung_7_sent_at ?? null,
      state: stufeState(ctx.erinnerung_7_sent_at, 1),
      hint:
        'Automatisch ab Tag nach max(Fälligkeit, Versand); nie an aufeinanderfolgenden Tagen.',
    },
    {
      id: 'stufe2',
      label: '2. Zahlungserinnerung',
      sentAt: ctx.erinnerung_21_sent_at ?? null,
      state: stufeState(ctx.erinnerung_21_sent_at, 2),
      hint: 'Zweite Erinnerung frühestens 7 Tage nach der ersten — dieselbe Rechnungsnummer.',
    },
    {
      id: 'intern30',
      label: 'Interne Warnung (30 Tage)',
      sentAt: ctx.intern_warnung_30_at ?? null,
      state: internState,
      hint: 'Nur intern — kein Kundenbeleg.',
    },
  ]
}

/** Test-Hilfe: YMD + n Tage (lokal). */
export function addDaysYmdLocal(ymd: string, days: number): string {
  const d = parseYmdLocal(ymd.slice(0, 10))
  d.setDate(d.getDate() + days)
  return formatYmdLocal(d)
}
