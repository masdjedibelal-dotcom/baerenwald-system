'use client'

import { useEffect } from 'react'
import { isCrmPwaStandalone } from '@/lib/push/detect'

const CLASS = 'is-pwa-standalone'

/** Setzt body-Klasse für PWA-Chrome (größere Bottom-Nav o. ä.). */
export function PwaStandaloneClass() {
  useEffect(() => {
    const sync = () => {
      document.body.classList.toggle(CLASS, isCrmPwaStandalone())
    }
    sync()
    const mq = window.matchMedia('(display-mode: standalone)')
    mq.addEventListener?.('change', sync)
    return () => {
      mq.removeEventListener?.('change', sync)
      document.body.classList.remove(CLASS)
    }
  }, [])
  return null
}
