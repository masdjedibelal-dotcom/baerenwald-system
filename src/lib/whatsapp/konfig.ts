import 'server-only'

import { isStagingSupabase } from '@/lib/auth/staging-admin'
import { crmBasisUrl } from '@/lib/crm-basis-url'

/**
 * WhatsApp-Einstellungen aus der Umgebung (Netlify → Environment variables):
 *
 *   WHATSAPP_PROVIDER       „360dialog“ schaltet echt; leer/„mock“ = Testmodus (nichts geht raus)
 *   D360_API_KEY            API-Key aus dem 360dialog-Hub (Kanal der Bärenwald-Nummer)
 *   WHATSAPP_NUMMER         Bärenwald-Nummer zur Anzeige, z. B. 4989123456
 *   WHATSAPP_WEBHOOK_TOKEN  geheimer Wert (lang, zufällig); steht in der Webhook-URL als ?token=…
 *
 * Vorlagen werden bei 360dialog über ihren Namen (bw_einsatz_neu …) angesprochen, Sprache „de“.
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

function env(name: string): string | null {
  return process.env[name]?.trim() || null
}

export function whatsappKonfig(): WhatsAppKonfig {
  const apiKey = env('D360_API_KEY')
  const echt = env('WHATSAPP_PROVIDER')?.toLowerCase() === '360dialog' && Boolean(apiKey)
  return {
    modus: echt ? '360dialog' : 'mock',
    apiKey: echt ? apiKey : null,
    nummer: env('WHATSAPP_NUMMER'),
    webhookToken: env('WHATSAPP_WEBHOOK_TOKEN'),
    sichtbar: echt || isStagingSupabase(),
  }
}

/** Webhook-Adresse für 360dialog (mit geheimem Token, 360dialog signiert nicht). */
export function whatsappWebhookUrl(): string | null {
  const token = env('WHATSAPP_WEBHOOK_TOKEN')
  if (!token) return null
  return `${crmBasisUrl()}/api/whatsapp/webhook?token=${encodeURIComponent(token)}`
}
