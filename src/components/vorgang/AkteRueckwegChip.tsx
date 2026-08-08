'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  akteFromHref,
  akteFromLabel,
  hrefClearingAkteFrom,
  parseAkteFromParam,
} from '@/lib/vorgang/akte-from'
import { cn } from '@/lib/utils'

/**
 * Ein-Ebenen-Rückweg zum Ursprungs-Vorgang (`?from=`).
 * Optisch wie MockDetailBackLink — ersetzt „Zurück zu den Suchergebnissen“.
 */
export function AkteRueckwegChip({
  displayLabel,
  className,
}: {
  displayLabel?: string | null
  className?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromRaw = searchParams.get('from')
  const ref = useMemo(() => parseAkteFromParam(fromRaw), [fromRaw])

  const onClick = useCallback(() => {
    if (!ref) return
    // replace: History nicht mit Tab/from-Hops verschmutzen
    router.replace(akteFromHref(ref))
  }, [ref, router])

  if (!ref) return null

  const label = akteFromLabel(ref, displayLabel)

  return (
    <nav aria-label="Zurück" className={cn('mock-detail-back', className)}>
      <button
        type="button"
        onClick={onClick}
        className="mock-detail-back__link link border-0 bg-transparent p-0 text-left font-inherit"
        aria-label={label}
      >
        <MockIcon ctx="nav" n="arrow-left" size={15} />
        {label}
      </button>
    </nav>
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
