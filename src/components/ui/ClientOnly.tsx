'use client'

import { useEffect, useState, type ReactNode } from 'react'

/** Rendert Kinder erst nach Mount — vermeidet SSR/Client-DOM-Abweichungen (z. B. Portale, Wizard). */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null
  return <>{children}</>
}
