import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { NachrichtenClient } from '@/components/whatsapp/NachrichtenClient'
import { whatsappKonfig } from '@/lib/whatsapp/konfig'

export const metadata: Metadata = {
  title: 'Nachrichten',
}

export const dynamic = 'force-dynamic'

/** Postfach „Nachrichten“ (WhatsApp): links Chats, rechts Verlauf. Auf Prod erst nach Anbindung. */
export default function NachrichtenPage() {
  if (!whatsappKonfig().sichtbar) notFound()
  return <NachrichtenClient />
}
