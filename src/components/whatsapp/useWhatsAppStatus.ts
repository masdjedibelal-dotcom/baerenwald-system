'use client'

import { useEffect, useState } from 'react'

import { whatsappStatus, type WaStatusInfo } from '@/app/(dashboard)/whatsapp/actions'

let cache: Promise<WaStatusInfo> | null = null

/** Ob WhatsApp im CRM sichtbar ist (echt verbunden oder Staging-Testmodus) — einmal je Seite geladen. */
export function useWhatsAppStatus(): WaStatusInfo | null {
  const [status, setStatus] = useState<WaStatusInfo | null>(null)
  useEffect(() => {
    let aktiv = true
    cache ??= whatsappStatus().catch(() => ({ sichtbar: false, modus: 'mock' as const, nummer: null }))
    void cache.then((s) => {
      if (aktiv) setStatus(s)
    })
    return () => {
      aktiv = false
    }
  }, [])
  return status
}
