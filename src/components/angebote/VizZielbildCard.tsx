'use client'

import { Download, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
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
    <div className={cn('rounded-xl border border-bw-border bg-bw-bg p-3', className)}>
      <div className="mb-2">
        <p className="text-sm font-semibold text-bw-text">Zielbild-Vorschau</p>
        <p className="text-xs text-bw-text-muted">
          Feed 4:5 (1080×1350) · Vorher &amp; Nachher · wie Website — PNG zum Teilen oder fürs Angebot.
        </p>
      </div>

      <div className={cn(zielbildPreviewFrameClass, 'mb-3')}>
        {loading ? (
          <div className={cn(zielbildPreviewPlaceholderClass, 'flex-col gap-2 py-6')}>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span>Wird erstellt …</span>
          </div>
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="Bärenwald Zielbild" className={zielbildPreviewMediaClass} />
        ) : (
          <p className={cn(zielbildPreviewPlaceholderClass, 'py-6 text-sm')}>
            {error ?? 'Keine Vorschau'}
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={loading || downloading || !previewUrl}
        onClick={() => void handleDownload()}
      >
        {downloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            Wird gespeichert …
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" aria-hidden />
            Zielbild herunterladen
          </>
        )}
      </Button>

      {error && previewUrl ? (
        <p className="mt-2 text-xs text-status-cancel-text">{error}</p>
      ) : null}
    </div>
  )
}
