'use client'

import { useEffect, useState } from 'react'

/** Client: Admin-Flag für Menü-Sichtbarkeit (Server prüft trotzdem). */
export function useIsCrmAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
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
  return isAdmin
}
