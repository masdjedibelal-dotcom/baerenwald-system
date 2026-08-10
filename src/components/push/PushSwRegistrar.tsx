'use client'

import { useEffect } from 'react'
import { ensureCrmServiceWorker } from '@/lib/push/client'
import { isCrmPwaStandalone } from '@/lib/push/detect'

/** Registriert SW in der installierten PWA (kein Auto-Subscribe — nur Einstellungen). */
export function PushSwRegistrar() {
  useEffect(() => {
    if (!isCrmPwaStandalone()) return
    void ensureCrmServiceWorker().catch(() => {
      /* ignore */
    })
  }, [])
  return null
}
