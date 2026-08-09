'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

/**
 * Gezielter Refresh nach Server Actions.
 * - Soft: nur Client-Generation (für Komponenten, die lokal nachladen)
 * - Hard: debounced router.refresh (wenn RSC-Props nötig sind)
 *
 * Default `refresh()` = soft + ein debounced Hard-Refresh (kein Refresh-Sturm).
 */
export function useCrmRefresh() {
  const router = useRouter()
  const [generation, setGeneration] = useState(0)
  const hardTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bump = useCallback(() => {
    setGeneration((g) => g + 1)
  }, [])

  const scheduleHardRefresh = useCallback(() => {
    if (hardTimer.current) clearTimeout(hardTimer.current)
    hardTimer.current = setTimeout(() => {
      hardTimer.current = null
      router.refresh()
    }, 350)
  }, [router])

  /** Soft + debounced Hard — Standard nach Actions (die oft schon revalidatePath nutzen). */
  const refresh = useCallback(() => {
    bump()
    scheduleHardRefresh()
  }, [bump, scheduleHardRefresh])

  /** Nur Client-Generation — wenn die Action bereits revalidatePath + Auto-Refresh abdeckt. */
  const softRefresh = useCallback(() => {
    bump()
  }, [bump])

  /** Sofortiger Full-Refresh (Pull-to-Refresh etc.). */
  const hardRefresh = useCallback(() => {
    bump()
    if (hardTimer.current) {
      clearTimeout(hardTimer.current)
      hardTimer.current = null
    }
    router.refresh()
  }, [bump, router])

  const refreshList = useCallback(
    (_basePath: '/anfragen' | '/angebote' | '/auftraege' | '/rechnungen' | '/kunden') => {
      refresh()
    },
    [refresh]
  )

  return { refresh, softRefresh, hardRefresh, refreshList, generation }
}
