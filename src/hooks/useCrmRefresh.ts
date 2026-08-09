'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

/**
 * Gezielter Refresh nach Server Actions (die bereits revalidatePath aufrufen).
 * Ersetzt direkte router.refresh()-Streuung — später optimistisches UI möglich.
 */
export function useCrmRefresh() {
  const router = useRouter()
  /** Inkrement für Client-Komponenten (z. B. KommunikationCard), die nach Actions neu laden sollen. */
  const [generation, setGeneration] = useState(0)

  const refresh = useCallback(() => {
    router.refresh()
    setGeneration((g) => g + 1)
  }, [router])

  const refreshList = useCallback(
    (basePath: '/anfragen' | '/angebote' | '/auftraege' | '/rechnungen' | '/kunden') => {
      router.refresh()
      setGeneration((g) => g + 1)
      void basePath
    },
    [router]
  )

  return { refresh, refreshList, generation }
}
