import 'server-only'

import { isStagingSupabase } from '@/lib/auth/staging-admin'

/**
 * WhatsApp-Einstellungen aus der Umgebung (Netlify → Environment variables):
 *
 *   WHATSAPP_PROVIDER       „360dialog“ schaltet echt; leer/„mock“ = Testmodus (nichts geht raus)
 *   D360_API_KEY            API-Key aus dem 360dialog-Hub (Kanal der Bärenwald-Nummer)
 *   WHATSAPP_NUMMER         Bärenwald-Nummer zur Anzeige, z. B. 4989123456
 *   WHATSAPP_WEBHOOK_TOKEN  geheimer Wert; Webhook-URL = /api/whatsapp/webhook?token=<Wert>
 *
 * Sichtbar im CRM: echt verbunden — oder Staging (Testmodus zum Anschauen). Auf Prod bleibt
 * WhatsApp ausgeblendet, bis 360dialog eingerichtet ist.
 */
export type WhatsAppModus = 'mock' | '360dialog'

export type WhatsAppKonfig = {
  modus: WhatsAppModus
  apiKey: string | null
  nummer: string | null
  webhookToken: string | null
  sichtbar: boolean
}

export function whatsappKonfig(): WhatsAppKonfig {
  const apiKey = process.env.D360_API_KEY?.trim() || null
  const modus: WhatsAppModus =
    process.env.WHATSAPP_PROVIDER?.trim().toLowerCase() === '360dialog' && apiKey ? '360dialog' : 'mock'
  return {
    modus,
    apiKey,
    nummer: process.env.WHATSAPP_NUMMER?.trim() || null,
    webhookToken: process.env.WHATSAPP_WEBHOOK_TOKEN?.trim() || null,
    sichtbar: modus === '360dialog' || isStagingSupabase(),
  }
}
