import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmailHtml } from '@/lib/auftraege/emails'

export const dynamic = 'force-dynamic'

function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const h = req.headers.get('authorization')
  return h === `Bearer ${secret}`
}

function daysUntil(isoDate: string): number {
  const parts = isoDate.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 9999
  const [y, m, d] = parts
  const target = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const intern = process.env.INTERNE_RECHNUNG_WARNUNG_EMAIL ?? process.env.INTERNE_WARNUNG_EMAIL
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const actions: string[] = []

  const { data: einRows, error: eErr } = await supabaseAdmin
    .from('einbehalte')
    .select(
      `
      id, auftrag_id, einbehalt_betrag, freigabe_datum, status,
      freigabe_reminder_30_sent_at, freigabe_reminder_7_sent_at,
      handwerker(name),
      auftraege(kunden(name))
    `
    )
    .eq('status', 'einbehalten')

  if (eErr) {
    console.error('[cron/einbehalte]', eErr.message)
    return NextResponse.json({ ok: false, error: eErr.message }, { status: 500 })
  }

  for (const row of einRows ?? []) {
    const r = row as Record<string, unknown>
    const fd = String(r.freigabe_datum ?? '')
    const tage = daysUntil(fd)
    if (tage < 0 || tage > 30) continue

    const hw = r.handwerker as { name?: string } | { name?: string }[] | null
    const hwName = Array.isArray(hw) ? hw[0]?.name : hw?.name
    const auf = r.auftraege as { kunden?: { name?: string } } | { kunden?: { name?: string } }[] | null
    const k = Array.isArray(auf) ? auf[0]?.kunden : auf?.kunden
    const kunde = k?.name ?? 'Kundin'

    if (tage <= 30 && tage >= 7 && !r.freigabe_reminder_30_sent_at && intern) {
      await sendEmailHtml({
        to: intern,
        subject: `Einbehalt fällig in ${tage} Tagen — ${hwName ?? 'Handwerker'}`,
        html: `<p>Sicherheitseinbehalt: <strong>${Number(r.einbehalt_betrag ?? 0).toLocaleString('de-DE')} €</strong></p>
          <p>Handwerker: ${hwName ?? '—'}<br/>Kundin: ${kunde}<br/>Freigabe: ${fd}</p>
          <p><a href="${base}/auftraege/${r.auftrag_id}/finanzen">Zum Auftrag (Finanzen)</a></p>`,
      })
      await supabaseAdmin
        .from('einbehalte')
        .update({ freigabe_reminder_30_sent_at: new Date().toISOString() })
        .eq('id', r.id as string)
      actions.push(`einbehalt_30:${r.id}`)
    }

    if (tage <= 7 && tage >= 0 && !r.freigabe_reminder_7_sent_at && intern) {
      await sendEmailHtml({
        to: intern,
        subject: `Einbehalt in ${tage} Tagen fällig — jetzt prüfen`,
        html: `<p><strong>7-Tage-Hinweis:</strong> Einbehalt ${Number(r.einbehalt_betrag ?? 0).toLocaleString('de-DE')} € · ${hwName ?? '—'}</p>
          <p>Freigabe: ${fd} · Kundin: ${kunde}</p>
          <p><a href="${base}/auftraege/${r.auftrag_id}/finanzen">Finanzen öffnen</a></p>`,
      })
      await supabaseAdmin
        .from('einbehalte')
        .update({ freigabe_reminder_7_sent_at: new Date().toISOString() })
        .eq('id', r.id as string)
      actions.push(`einbehalt_7:${r.id}`)
    }
  }

  const { data: bRows, error: bErr } = await supabaseAdmin
    .from('buergschaften')
    .select(
      `
      id, gueltig_bis, betrag, ablauf_reminder_60_sent_at,
      handwerker(name),
      einbehalte(id, auftrag_id, status)
    `
    )

  if (bErr) {
    console.error('[cron/einbehalte buergschaft]', bErr.message)
    return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 })
  }

  for (const row of bRows ?? []) {
    const r = row as Record<string, unknown>
    const ein = r.einbehalte as { status?: string; auftrag_id?: string } | null
    if (ein?.status !== 'buergschaft') continue

    const gd = String(r.gueltig_bis ?? '')
    const tage = daysUntil(gd)
    if (tage < 0 || tage > 60) continue
    if (r.ablauf_reminder_60_sent_at || !intern) continue

    const hw = r.handwerker as { name?: string } | null
    const auftragId = ein?.auftrag_id

    await sendEmailHtml({
      to: intern,
      subject: 'Bürgschaft läuft ab — verlängern oder Einbehalt einfordern',
      html: `<p>Bürgschaft endet in <strong>${tage}</strong> Tagen (${gd}).</p>
        <p>Betrag: ${Number(r.betrag ?? 0).toLocaleString('de-DE')} € · ${hw?.name ?? '—'}</p>
        ${auftragId ? `<p><a href="${base}/auftraege/${auftragId}/finanzen">Zum Auftrag</a></p>` : ''}`,
    })
    await supabaseAdmin
      .from('buergschaften')
      .update({ ablauf_reminder_60_sent_at: new Date().toISOString() })
      .eq('id', r.id as string)
    actions.push(`buergschaft_60:${r.id}`)
  }

  return NextResponse.json({ ok: true, actions })
}
