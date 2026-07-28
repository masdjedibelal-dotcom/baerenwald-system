'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import {
  akteFromHref,
  akteFromLabel,
  hrefClearingAkteFrom,
  parseAkteFromParam,
} from '@/lib/vorgang/akte-from'

/**
 * Ein-Ebenen-Rückweg. Klick → Ziel + `from` aus URL entfernen via replace (Welle 4).
 */
export function AkteRueckwegChip({ displayLabel }: { displayLabel?: string | null }) {
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const searchParams = useSearchParams()
  const fromRaw = searchParams.get('from')
  const ref = useMemo(() => parseAkteFromParam(fromRaw), [fromRaw])

  const onClick = useCallback(() => {
    if (!ref) return
    const target = akteFromHref(ref)
    // replace: History nicht mit Tab/from-Hops verschmutzen
    router.replace(target)
  }, [ref, router])

  if (!ref) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className="akte-rueckweg-chip mb-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[length:var(--fs-meta)] font-medium text-bw-primary hover:bg-bw-primary/10"
      aria-label={akteFromLabel(ref, displayLabel)}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      {akteFromLabel(ref, displayLabel)}
    </button>
  )
}

/** Hilfs-Hook: from aus URL strippen (z. B. nach Tab-Wechsel lokal). */
export function useClearAkteFromReplace() {
  const router = useRouter()
  const pathname = usePathname() ?? '/'
  const searchParams = useSearchParams()
  return useCallback(() => {
    if (!searchParams.get('from')) return
    router.replace(hrefClearingAkteFrom(pathname, new URLSearchParams(searchParams.toString())))
  }, [router, pathname, searchParams])
}
