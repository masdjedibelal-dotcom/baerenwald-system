'use client'

import { useCallback, useEffect, useState } from 'react'

/** Client: Admin-Flag für Menü-Sichtbarkeit (Server prüft trotzdem). */
export function useIsCrmAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)

  const load = useCallback(() => {
    let cancelled = false
    fetch('/api/crm/me')
      .then((r) => r.json())
      .then((d: { isAdmin?: boolean }) => {
        if (!cancelled) setIsAdmin(Boolean(d.isAdmin))
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const cancel = load()
    const onVis = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancel()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  return isAdmin
}
