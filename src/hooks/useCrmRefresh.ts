'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

/**
 * Gezielter Refresh nach Server Actions (P3-4).
 * Default `refresh()` = Soft (Generation) — Actions nutzen revalidatePath.
 * Hard nur über hardRefresh() (Pull-to-Refresh / Session).
 */
export function useCrmRefresh() {
  const router = useRouter()
  const [generation, setGeneration] = useState(0)

  const bump = useCallback(() => {
    setGeneration((g) => g + 1)
  }, [])

  const refresh = useCallback(() => {
    bump()
  }, [bump])

  const softRefresh = useCallback(() => {
    bump()
  }, [bump])

  const hardRefresh = useCallback(() => {
    bump()
    router.refresh()
  }, [bump, router])

  const refreshList = useCallback(
    (_basePath: '/anfragen' | '/angebote' | '/auftraege' | '/rechnungen' | '/kunden') => {
      softRefresh()
    },
    [softRefresh]
  )

  return { refresh, softRefresh, hardRefresh, refreshList, generation }
}
