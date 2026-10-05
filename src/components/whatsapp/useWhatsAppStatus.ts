'use client'

import { useEffect,useState } from 'react'

import { whatsappStatus,zaehleUngeleseneWhatsApp,type WaStatusInfo } from '@/app/(dashboard)/whatsapp/actions'

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

/** Menü-Zähler „Nachrichten“: ungelesene WhatsApp, bei Seitenwechsel und jede Minute neu. */
export function useWhatsAppUngelesen(aktiv: boolean, pfad: string): number {
  const [anzahl, setAnzahl] = useState(0)
  useEffect(() => {
    if (!aktiv) return
    let lebt = true
    const holen = () =>
      zaehleUngeleseneWhatsApp()
        .then((n) => {
          if (lebt) setAnzahl(n)
        })
        .catch(() => undefined)
    holen()
    const t = window.setInterval(holen, 60000)
    return () => {
      lebt = false
      window.clearInterval(t)
    }
  }, [aktiv, pfad])
  return anzahl
}
