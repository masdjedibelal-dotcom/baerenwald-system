import type { Metadata } from 'next'

import { EinstellungenWhatsAppClient } from '@/components/einstellungen/EinstellungenWhatsAppClient'
import { whatsappKonfig } from '@/lib/whatsapp/konfig'
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
      webhookBereit={Boolean(k.webhookToken)}
      vorlagen={Object.values(VORLAGEN)}
    />
  )
}
