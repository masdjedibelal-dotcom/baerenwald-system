'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Gezielter Refresh nach Server Actions (die bereits revalidatePath aufrufen).
 * Ersetzt direkte router.refresh()-Streuung — später optimistisches UI möglich.
 */
export function useCrmRefresh() {
  const router = useRouter()

  const refresh = useCallback(() => {
    router.refresh()
  }, [router])

  const refreshList = useCallback(
    (basePath: '/anfragen' | '/angebote' | '/auftraege' | '/rechnungen' | '/kunden') => {
      router.refresh()
      void basePath
    },
    [router]
  )

  return { refresh, refreshList }
}
