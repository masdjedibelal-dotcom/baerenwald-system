import { NextResponse,type NextRequest } from 'next/server'

import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { webhookVerarbeiten } from '@/lib/whatsapp/dienst'
import { whatsappKonfig,whatsappWebhookUrl } from '@/lib/whatsapp/konfig'
import { twilioSignaturOk,type TwilioFelder } from '@/lib/whatsapp/webhook-parse'

/**
 * Twilio-Webhook: eingehende WhatsApp-Nachrichten, Knopf-Antworten und Zustellstatus.
 * In Twilio beim WhatsApp-Absender eintragen (eingehend, POST):
 *   https://baerenwald-backend.netlify.app/api/whatsapp/webhook
 * Den Zustellstatus schickt das CRM bei jeder Nachricht selbst als StatusCallback mit.
 * Schutz: Twilio-Signatur (X-Twilio-Signature) mit dem Auth Token — fremde Aufrufe → 403.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const k = whatsappKonfig()
  if (k.modus !== 'twilio' || !k.twilio) return NextResponse.json({ ok: false }, { status: 404 })
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ ok: false }, { status: 400 })
  const felder: TwilioFelder = {}
  form.forEach((v, key) => {
    if (typeof v === 'string') felder[key] = v
  })
  const webhookSecret = k.twilio.token
  if (!twilioSignaturOk(webhookSecret, whatsappWebhookUrl(), felder, req.headers.get('x-twilio-signature'))) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  try {
    await webhookVerarbeiten(getSupabaseAdmin(), felder)
  } catch (e) {
    // Fehler nur loggen — sonst wiederholt Twilio die Zustellung
    console.error('[whatsapp/webhook]', e)
  }
  // Leere TwiML-Antwort: Twilio schickt dann keine automatische Antwort
  return new NextResponse('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
}
