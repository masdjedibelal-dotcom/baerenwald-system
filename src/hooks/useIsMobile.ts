'use client'

import { useEffect, useState } from 'react'

/**
 * SoT: Viewport &lt; 768px (Tailwind `md` / max-width 767).
 * Erst nach dem Laden messen: der Server kennt die Breite nicht, sonst weicht das erste
 * Rendern im Browser ab (Hydration-Fehler, z. B. Wisch-Knöpfe in Listenzeilen).
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}
