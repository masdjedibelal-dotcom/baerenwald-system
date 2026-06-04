'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

/** Dashboard: direkter Link zur häufigsten Aktion (keine Dummy-Modals). */
export function FloatingAction() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()

  if (pathname !== '/') return null

  return (
    <button
      type="button"
      onClick={() => router.push('/anfragen?neu=1')}
      className="fab md:hidden"
      aria-label="Neue Anfrage"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
