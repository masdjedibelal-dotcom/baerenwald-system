'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

function showAnfragenFab(pathname: string): boolean {
  if (!pathname.startsWith('/anfragen')) return false
  if (pathname === '/anfragen/neu') return false
  if (pathname.includes('/angebote')) return false
  return true
}

/** Mobile: goldener Plus-Button nur auf Anfragen-Screens → Route „Neue Anfrage“. */
export function FloatingAction() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()

  if (!showAnfragenFab(pathname)) return null

  return (
    <button
      type="button"
      onClick={() => router.push('/anfragen/neu')}
      className="fab md:hidden"
      aria-label="Neue Anfrage"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
