import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { webhookVerarbeiten } from '@/lib/whatsapp/dienst'
import { whatsappKonfig } from '@/lib/whatsapp/konfig'

/**
 * Webhook für 360dialog: eingehende Nachrichten, Knopf-Antworten und Zustellstatus.
 * 360dialog signiert nicht — Schutz über geheimes Token in der URL:
 *   https://baerenwald-backend.netlify.app/api/whatsapp/webhook?token=<WHATSAPP_WEBHOOK_TOKEN>
 * Einrichten (einmalig, nach Kontoanlage):
 *   POST https://waba-v2.360dialog.io/v1/configs/webhook  { "url": "<obige URL>" }  Header D360-API-KEY
 */
export const dynamic = 'force-dynamic'

function tokenOk(req: NextRequest): boolean {
  const webhookSecret = whatsappKonfig().webhookToken
  return Boolean(webhookSecret) && req.nextUrl.searchParams.get('token') === webhookSecret
}

export async function POST(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ ok: false }, { status: 401 })
  const payload = await req.json().catch(() => null)
  if (!payload) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    const r = await webhookVerarbeiten(getSupabaseAdmin(), payload)
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    console.error('[whatsapp/webhook]', e)
    // 200, damit WhatsApp nicht endlos wiederholt; Fehler steht im Log
    return NextResponse.json({ ok: false })
  }
}

/** Erreichbarkeits-Test (Browser/360dialog). */
export async function GET(req: NextRequest) {
  if (!tokenOk(req)) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, modus: whatsappKonfig().modus })
}
