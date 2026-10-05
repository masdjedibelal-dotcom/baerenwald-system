import type { Metadata } from 'next'

import { EinstellungenWhatsAppClient } from '@/components/einstellungen/EinstellungenWhatsAppClient'
import { whatsappKonfig,whatsappWebhookUrl } from '@/lib/whatsapp/konfig'
import { VORLAGEN } from '@/lib/whatsapp/vorlagen'

export const metadata: Metadata = {
  title: 'WhatsApp',
}

export const dynamic = 'force-dynamic'

export default function EinstellungenWhatsAppPage() {
  const k = whatsappKonfig()
  return (
    <EinstellungenWhatsAppClient
      modus={k.modus}
      nummer={k.nummer}
      webhookUrl={whatsappWebhookUrl()}
      vorlagen={Object.values(VORLAGEN).map((v) => ({ ...v, contentSid: k.vorlagen[v.name] }))}
    />
  )
}
