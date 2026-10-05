import 'server-only'

import { isStagingSupabase } from '@/lib/auth/staging-admin'
import { getPublicAppUrl } from '@/lib/utils'
import type { VorlagenName } from '@/lib/whatsapp/vorlagen'

/**
 * WhatsApp-Einstellungen aus der Umgebung (Netlify → Environment variables):
 *
 *   WHATSAPP_PROVIDER            „twilio“ schaltet echt; leer/„mock“ = Testmodus (nichts geht raus)
 *   TWILIO_ACCOUNT_SID           Account SID (Twilio-Konsole, Startseite)
 *   TWILIO_AUTH_TOKEN            Auth Token (prüft auch die Signatur eingehender Webhooks)
 *   TWILIO_WHATSAPP_NUMMER       WhatsApp-Absender, z. B. +4989123456
 *   TWILIO_VORLAGE_EINSATZ       Content-SID (HX…) der Vorlage bw_einsatz_neu
 *   TWILIO_VORLAGE_BAUTAGEBUCH   Content-SID der Vorlage bw_bautagebuch
 *   TWILIO_VORLAGE_NACHRICHT     Content-SID der Vorlage bw_nachricht
 *   WHATSAPP_WEBHOOK_URL         optional; Standard: <CRM-Adresse>/api/whatsapp/webhook
 *
 * Sichtbar im CRM: echt verbunden — oder Staging (Testmodus zum Anschauen). Auf Prod bleibt
 * WhatsApp ausgeblendet, bis Twilio eingerichtet ist.
 */
export type WhatsAppModus = 'mock' | 'twilio'

export type WhatsAppKonfig = {
  modus: WhatsAppModus
  twilio: { sid: string; token: string; von: string } | null
  nummer: string | null
  vorlagen: Record<VorlagenName, string | null>
  sichtbar: boolean
}

function env(name: string): string | null {
  return process.env[name]?.trim() || null
}

export function whatsappKonfig(): WhatsAppKonfig {
  const sid = env('TWILIO_ACCOUNT_SID')
  const token = env('TWILIO_AUTH_TOKEN')
  const von = env('TWILIO_WHATSAPP_NUMMER')
  const echt = env('WHATSAPP_PROVIDER')?.toLowerCase() === 'twilio' && Boolean(sid && token && von)
  return {
    modus: echt ? 'twilio' : 'mock',
    twilio: echt ? { sid: sid!, token: token!, von: von! } : null,
    nummer: von,
    vorlagen: {
      bw_einsatz_neu: env('TWILIO_VORLAGE_EINSATZ'),
      bw_bautagebuch: env('TWILIO_VORLAGE_BAUTAGEBUCH'),
      bw_nachricht: env('TWILIO_VORLAGE_NACHRICHT'),
    },
    sichtbar: echt || isStagingSupabase(),
  }
}

/** Adresse, die bei Twilio als Webhook eingetragen ist (gleiche URL prüft die Signatur). */
export function whatsappWebhookUrl(): string {
  const fest = env('WHATSAPP_WEBHOOK_URL')
  if (fest) return fest
  return `${getPublicAppUrl()}/api/whatsapp/webhook`
}
