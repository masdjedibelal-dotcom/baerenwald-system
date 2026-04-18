import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { emails } from '@/lib/email'

export const dynamic = 'force-dynamic'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = req.headers.get('authorization')
  return h === `Bearer ${secret}`
}

/** Kalendertage seit Fälligkeit (nur >0 wenn überfällig). */
function tageUeberfaellig(faelligAm: string): number {
  const parts = faelligAm.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  const [y, m, d] = parts
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

function formatDeDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  if (!y || !m || !d) return isoDate
  return `${d}.${m}.${y}`
}

type RechnungRow = {
  id: string
  rechnungsnummer: string
  brutto: number | null
  faellig_am: string | null
  erinnerung_7_sent_at: string | null
  erinnerung_21_sent_at: string | null
  intern_warnung_30_at: string | null
  kunden: { name: string; email: string | null } | { name: string; email: string | null }[] | null
}

function normalizeKunde(
  k: RechnungRow['kunden']
): { name: string; email: string | null } | null {
  if (!k) return null
  if (Array.isArray(k)) return k[0] ?? null
  return k
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const heute = new Date().toISOString().slice(0, 10)
  const iban = process.env.EMAIL_FIRMEN_IBAN ?? ''

  const { data: rows, error } = await supabaseAdmin
    .from('rechnungen')
    .select(
      'id, rechnungsnummer, brutto, faellig_am, erinnerung_7_sent_at, erinnerung_21_sent_at, intern_warnung_30_at, kunden(name, email)'
    )
    .eq('status', 'gesendet')
    .is('bezahlt_at', null)
    .not('faellig_am', 'is', null)
    .lt('faellig_am', heute)

  if (error) {
    console.error('[cron/rechnungen]', error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const list = (rows ?? []) as RechnungRow[]
  const ergebnis: { id: string; aktion: string }[] = []

  for (const r of list) {
    if (!r.faellig_am) continue
    const tage = tageUeberfaellig(r.faellig_am)
    if (tage <= 0) continue

    const kunde = normalizeKunde(r.kunden)
    const name = kunde?.name ?? 'Kundin/Kunde'
    const email = kunde?.email?.trim() ?? ''
    const brutto = r.brutto ?? 0
    const faelligFmt = formatDeDate(r.faellig_am)

    try {
      if (tage >= 7 && !r.erinnerung_7_sent_at && email) {
        await emails.zahlungserinnerung(email, {
          name,
          rechnungsnummer: r.rechnungsnummer,
          brutto,
          faellig_am: faelligFmt,
          tage_ueberfaellig: tage,
          iban,
        })
        await supabaseAdmin
          .from('rechnungen')
          .update({ erinnerung_7_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', r.id)
        ergebnis.push({ id: r.id, aktion: 'erinnerung_7' })
      }

      if (tage >= 21 && !r.erinnerung_21_sent_at && email) {
        await emails.zahlungserinnerung(email, {
          name,
          rechnungsnummer: r.rechnungsnummer,
          brutto,
          faellig_am: faelligFmt,
          tage_ueberfaellig: tage,
          iban,
        })
        await supabaseAdmin
          .from('rechnungen')
          .update({ erinnerung_21_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', r.id)
        ergebnis.push({ id: r.id, aktion: 'erinnerung_21' })
      }

      if (tage >= 30 && !r.intern_warnung_30_at) {
        const msg = `[Intern] Rechnung ${r.rechnungsnummer} (${r.id}) ist seit ${tage} Tagen überfällig (Fälligkeit ${r.faellig_am}).`
        console.warn(msg)
        const intern = process.env.INTERNE_RECHNUNG_WARNUNG_EMAIL
        if (intern) {
          await emails.internHinweis(intern, msg)
        }
        await supabaseAdmin
          .from('rechnungen')
          .update({ intern_warnung_30_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', r.id)
        ergebnis.push({ id: r.id, aktion: 'intern_30' })
      }
    } catch (e) {
      console.error('[cron/rechnungen] Rechnung', r.id, e)
      ergebnis.push({ id: r.id, aktion: 'fehler' })
    }
  }

  return NextResponse.json({ ok: true, bearbeitet: ergebnis.length, details: ergebnis })
}
