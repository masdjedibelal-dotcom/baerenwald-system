/**
 * Mahnstufen gehören immer zur Ursprungsrechnung (Timestamps + E-Mail-Log).
 * Es werden keine eigenen Rechnungsobjekte angelegt.
 */

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

function parseYmdLocal(ymd: string): Date {
  const p = ymd.split('-').map((x) => parseInt(x, 10))
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return new Date(NaN)
  return new Date(p[0], p[1] - 1, p[2])
}

export function tageSeitFaelligkeitRechnung(faelligAm: string | null | undefined): number {
  if (!faelligAm) return 0
  const due = parseYmdLocal(faelligAm)
  if (Number.isNaN(due.getTime())) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
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
  if (tageSeitFaelligkeitRechnung(ctx.faellig_am) <= 0) return null
  if (!ctx.erinnerung_7_sent_at) return 1
  if (!ctx.erinnerung_21_sent_at) return 2
  return null
}

export function buildRechnungMahnverlauf(ctx: RechnungMahnKontext): MahnverlaufStufe[] {
  const st = (ctx.status ?? '').toLowerCase()
  const abgeschlossen = st === 'bezahlt' || st === 'storniert'
  const tage = tageSeitFaelligkeitRechnung(ctx.faellig_am)
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
      hint: 'Freundliche Erinnerung per E-Mail (kein neuer Beleg).',
    },
    {
      id: 'stufe2',
      label: '2. Zahlungserinnerung',
      sentAt: ctx.erinnerung_21_sent_at ?? null,
      state: stufeState(ctx.erinnerung_21_sent_at, 2),
      hint: 'Zweite Erinnerung — weiterhin dieselbe Rechnungsnummer.',
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
