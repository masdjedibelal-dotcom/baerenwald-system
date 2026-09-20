'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { useState, type ReactNode } from 'react'
import type { KiClusterAnalyseRow } from '@/lib/ki/types'
import { KiClaudeNarrative } from '@/components/ki/KiClaudeNarrative'
import { KiThinDataBanner } from '@/components/ki/ki-card-shared'
import { cn } from '@/lib/utils'
import { formatDatumZeit } from '@/lib/format/geld-datum'

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
    <MockCard
      title={analyse.titel}
      actions={
        <time className="shrink-0 text-fs-caption text-muted" dateTime={analyse.generiert_am}>
          {formatDatumZeit(String(analyse.generiert_am))}
        </time>
      }
      flush
    >
      {hinweis ? <p className="border-b border-bw-border px-4 py-2 text-xs text-muted">{hinweis}</p> : null}

      <KiThinDataBanner sampleSize={analyse.sample_size} />

      {empty && emptyBody ? (
        emptyBody
      ) : (
        <>
          <div className="border-b border-bw-border px-4 py-4">{hero}</div>
          {hasDetails ? (
            <div className="border-b border-bw-border">
              <MockBtn
                fullWidth
                className="flex items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-muted hover:bg-bw-bg/80"
                type="button"
                onClick={() => setOpen((v) => !v)}
              >
                {detailsLabel}
                <MockIcon n="chevron-down" ctx="default" className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
              </MockBtn>
              {open ? <div className="border-t border-bw-border px-4 py-4">{details}</div> : null}
            </div>
          ) : null}
        </>
      )}

      <KiClaudeNarrative
        text={analyse.narrative}
        onGenerate={onGenerateKi}
        loading={kiLoading}
      />
    </MockCard>
  )
}
