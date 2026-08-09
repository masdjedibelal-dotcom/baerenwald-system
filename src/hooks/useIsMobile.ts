'use client'

import { useEffect, useState } from 'react'

function readIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 767px)').matches
}

/** SoT: Viewport &lt; 768px (Tailwind `md` / max-width 767). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(readIsMobile)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}
