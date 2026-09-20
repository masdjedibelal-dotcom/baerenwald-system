'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EMPTY } from '@/lib/crm-labels'

import { MockBtn } from '@/components/mock-ui'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { CrmInlineLoading } from '@/components/layout/CrmPageLoading'
import {
  composeVizZielbildBlob,
  composeVizZielbildDataUrl,
  downloadVizZielbildBlob,
  erklaerungFromBrief,
} from '@/lib/visualize/compose-zielbild'
import type { VizBauErklaerung } from '@/lib/visualize/types'
import {
  zielbildPreviewFrameClass,
  zielbildPreviewMediaClass,
  zielbildPreviewPlaceholderClass,
} from '@/lib/gpt-viz/zielbild-preview-classes'
import { cn } from '@/lib/utils'

type VizZielbildCardProps = {
  vorherUrl: string
  nachherUrl: string
  erklaerung?: VizBauErklaerung | null
  className?: string
}

export function VizZielbildCard({
  vorherUrl,
  nachherUrl,
  erklaerung,
  className,
}: VizZielbildCardProps) {
  const resolved = useMemo(() => erklaerungFromBrief(erklaerung), [erklaerung])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPreviewUrl(null)

    void composeVizZielbildDataUrl({ vorherUrl, nachherUrl, erklaerung: resolved })
      .then((url) => {
        if (!cancelled) setPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError('Zielbild konnte nicht erstellt werden.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [vorherUrl, nachherUrl, resolved])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    setError(null)
    try {
      const blob = await composeVizZielbildBlob({ vorherUrl, nachherUrl, erklaerung: resolved })
      downloadVizZielbildBlob(blob)
    } catch {
      setError('Download fehlgeschlagen.')
    } finally {
      setDownloading(false)
    }
  }, [vorherUrl, nachherUrl, resolved])

  return (
    <div className={cn('rounded-sheet border border-bw-border bg-bw-bg p-3', className)}>
      <div className="mb-2">
        <p className="text-[length:var(--fs-text)] font-semibold text-bw-text">Zielbild-Vorschau</p>
        <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
          Feed 4:5 (1080×1350) · Vorher &amp; Nachher · wie Website — PNG zum Teilen oder fürs Angebot.
        </p>
      </div>

      <div className={cn(zielbildPreviewFrameClass, 'mb-3')}>
        {loading ? (
          <CrmInlineLoading
            label="Wird erstellt …"
            minHeight={120}
            className={zielbildPreviewPlaceholderClass}
          />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Bärenwald Zielbild" className={zielbildPreviewMediaClass} />
        ) : (
          <p className={cn(zielbildPreviewPlaceholderClass, 'py-6 text-[length:var(--fs-text)]')}>
            {error ?? EMPTY.vorschau}
          </p>
        )}
      </div>

      <MockBtn
        type="button"
        kind="secondary"
        className="w-full"
        loading={downloading}
        disabled={loading || !previewUrl}
        onClick={() => void handleDownload()}
      >
        <MockIcon n="download" ctx="default" className="mr-2 h-4 w-4" aria-hidden />
        Zielbild herunterladen
      </MockBtn>

      {error && previewUrl ? (
        <p className="mt-2 text-[length:var(--fs-meta)] text-status-cancel-text">{error}</p>
      ) : null}
    </div>
  )
}
