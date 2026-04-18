import { NextRequest, NextResponse } from 'next/server'
import { loadDatenschutzAnfragen, loadDatenschutzFaellige } from '@/lib/datenschutz/queries'
import { sendEmail } from '@/lib/email'
import * as templates from '@/lib/email-templates'

export const dynamic = 'force-dynamic'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = req.headers.get('authorization')
  return h === `Bearer ${secret}`
}

function appBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (u) return u.replace(/\/$/, '')
  const v = process.env.VERCEL_URL?.trim()
  if (v) return `https://${v.replace(/\/$/, '')}`
  return 'http://localhost:3000'
}

function tageOffen(createdAt: string): number {
  const t = new Date(createdAt).getTime()
  return Math.floor((Date.now() - t) / 86400000)
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const intern = process.env.INTERNE_DATENSCHUTZ_EMAIL ?? process.env.INTERNE_RECHNUNG_WARNUNG_EMAIL
  const base = appBaseUrl()
  const link = `${base}/einstellungen/datenschutz`

  const faellig = await loadDatenschutzFaellige()
  if (faellig.length > 0 && intern) {
    const byKat = new Map<string, number>()
    for (const r of faellig) {
      byKat.set(r.kategorie, (byKat.get(r.kategorie) ?? 0) + 1)
    }
    const lines = Array.from(byKat.entries()).map(([k, n]) => `• ${k}: ${n}`)
    const body = [
      `Es sind ${faellig.length} Einträge zur Löschung / Anonymisierung fällig (laut konfigurierten Fristen).`,
      '',
      ...lines,
      '',
      `Übersicht: ${link}`,
      '',
      'Bitte innerhalb von 30 Tagen prüfen und verarbeiten.',
    ].join('\n')
    try {
      await sendEmail({
        to: intern,
        subject: `DSGVO — ${faellig.length} Einträge zur Löschung fällig`,
        html: templates.emailInternHinweis(body),
      })
    } catch (e) {
      console.error('[cron/datenschutz] Mail fällig', e)
    }
  }

  const anfragen = await loadDatenschutzAnfragen()
  const kritisch = anfragen.filter((a) => a.status !== 'erledigt' && tageOffen(a.created_at) > 25)
  if (kritisch.length > 0 && intern) {
    const body = [
      `DSGVO-Frist: ${kritisch.length} Kunden-Anfrage(n) sind seit über 25 Tagen ohne Status „erledigt“.`,
      '',
      ...kritisch.map((a) => `• ${a.name} (${a.typ}) — ${tageOffen(a.created_at)} Tage offen`),
      '',
      `Bearbeiten: ${link}`,
    ].join('\n')
    try {
      await sendEmail({
        to: intern,
        subject: `DSGVO Frist läuft ab — ${kritisch.length} Anfrage(n) noch offen`,
        html: templates.emailInternHinweis(body),
      })
    } catch (e) {
      console.error('[cron/datenschutz] Mail Anfragen', e)
    }
  }

  return NextResponse.json({
    ok: true,
    faellig: faellig.length,
    anfragen_warnung: kritisch.length,
  })
}
