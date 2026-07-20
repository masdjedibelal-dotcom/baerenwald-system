'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { KiClaudeNarrative } from '@/components/ki/KiClaudeNarrative'
import { KiThinDataBanner } from '@/components/ki/ki-card-shared'
import { cn } from '@/lib/utils'

type Props = {
  analyse: KiClusterAnalyseRow
  hinweis?: string
  onGenerateKi?: () => void
  kiLoading?: boolean
  hero: ReactNode
  details?: ReactNode
  empty?: boolean
  emptyBody?: ReactNode
  detailsLabel?: string
}

export function KiCardShell({
  analyse,
  hinweis,
  onGenerateKi,
  kiLoading,
  hero,
  details,
  empty,
  emptyBody,
  detailsLabel = 'Details anzeigen',
}: Props) {
  const [open, setOpen] = useState(false)
  const hasDetails = !!details && !empty

  return (
    <article className="rounded-xl border border-bw-border bg-bw-card overflow-hidden shadow-sm">
      <header className="border-b border-bw-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-bw-text">{analyse.titel}</h3>
          <time className="shrink-0 text-[11px] text-muted" dateTime={analyse.generiert_am}>
            {new Date(analyse.generiert_am).toLocaleString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
        {hinweis ? <p className="mt-1 text-xs text-muted">{hinweis}</p> : null}
        <p className="mt-0.5 text-[11px] text-muted">Stichprobe: {analyse.sample_size}</p>
      </header>

      <KiThinDataBanner sampleSize={analyse.sample_size} />

      <KiClaudeNarrative
        text={analyse.narrative}
        onGenerate={onGenerateKi}
        loading={kiLoading}
      />

      {empty && emptyBody ? (
        emptyBody
      ) : (
        <>
          <div className="border-b border-bw-border px-4 py-4">{hero}</div>
          {hasDetails ? (
            <div className="border-b border-bw-border">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-muted hover:bg-bw-bg/80"
              >
                {detailsLabel}
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              </button>
              {open ? <div className="border-t border-bw-border px-4 py-4">{details}</div> : null}
            </div>
          ) : null}
        </>
      )}
    </article>
  )
}
