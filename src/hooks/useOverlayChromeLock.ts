'use client'

import { useEffect } from 'react'
import { acquireOverlayChromeLock } from '@/lib/surfaces/overlay-chrome-lock'

/** Bottom-Nav / FAB / Detail-CTA ausblenden, solange `active`. */
export function useOverlayChromeLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    return acquireOverlayChromeLock()
  }, [active])
}
