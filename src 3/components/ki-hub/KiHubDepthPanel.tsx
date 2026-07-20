'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { KiAnalyticsClient } from '@/components/ki/KiAnalyticsClient'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'

type Props = {
  analysen: KiClusterAnalyseRow[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function KiHubDepthPanel({ analysen, open: openProp, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <section id="ki-depth" className="border-t border-bw-border pt-6">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left hover:bg-bw-bg"
      >
        <div>
          <h2 className="text-sm font-semibold text-bw-text">Alle Analysen & Rohdaten</h2>
          <p className="text-xs text-muted">
            Cluster-Auswertungen, Funnel, Margen, Handwerker — wie bisheriges KI Analytics
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open ? (
        <div className="mt-4">
          <KiAnalyticsClient analysen={analysen} />
        </div>
      ) : null}
    </section>
  )
}
