'use client'

import { MockBtn } from '@/components/mock-ui'
import { useCallback, useEffect, useState } from 'react'
import { refreshHandwerkerMediaUrl } from '@/app/(dashboard)/auftraege/handwerker-media-actions'
import { cn } from '@/lib/utils'
import { C } from '@/lib/tokens/colors'

export type MediaThumbSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<MediaThumbSize, string> = {
  sm: 'h-10 w-10 rounded-card',
  md: 'h-[4.5rem] w-[4.5rem] rounded-sheet',
  lg: 'h-28 w-28 rounded-sheet',
}

type MediaThumbProps = {
  src: string | null | undefined
  storagePath?: string | null
  alt?: string
  size?: MediaThumbSize
  className?: string
  href?: string | null
  onClick?: (e: React.MouseEvent) => void
}

/** Globale Bild-Vorschau — bei Fehler Handwerker-Upload neu signieren. */
export function MediaThumb({
  src,
  storagePath,
  alt = '',
  size = 'sm',
  className,
  href,
  onClick,
}: MediaThumbProps) {
  const [url, setUrl] = useState(src?.trim() || '')
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    setUrl(src?.trim() || '')
    setFailed(false)
  }, [src])

  const tryRefresh = useCallback(async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const next = await refreshHandwerkerMediaUrl({
        url: url || src || null,
        storagePath: storagePath ?? null,
      })
      if (next?.ok && next.url) {
        setUrl(next.url)
        setFailed(false)
      } else {
        setFailed(true)
      }
    } catch {
      setFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, url, src, storagePath])

  if (!url && !storagePath) return null

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url || undefined}
      alt={alt}
      className={cn(
        `object-cover bg-[var(--bg-soft,${C.gray100c})]`,
        SIZE_CLASS[size],
        failed && 'opacity-40',
        refreshing && 'opacity-60',
        className
      )}
      onError={() => {
        if (!failed && !refreshing) void tryRefresh()
        else setFailed(true)
      }}
    />
  )

  if (onClick) {
    return (
      <MockBtn className="shrink-0 overflow-hidden p-0" type="button" onClick={onClick}>
        {img}
      </MockBtn>
    )
  }

  const link = href?.trim() || url
  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="relative shrink-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {img}
      </a>
    )
  }

  return <span className="shrink-0 overflow-hidden">{img}</span>
}

export function MediaThumbStrip({
  urls,
  max = 3,
  size = 'sm',
  className,
}: {
  urls: string[]
  max?: number
  size?: MediaThumbSize
  className?: string
}) {
  const list = urls.filter(Boolean).slice(0, max)
  if (!list.length) return null
  const rest = urls.length - list.length
  return (
    <div className={cn('flex shrink-0 items-center gap-1', className)}>
      {list.map((u, i) => (
        <MediaThumb key={`${u.slice(0, 48)}-${i}`} src={u} size={size} />
      ))}
      {rest > 0 ? (
        <span className={`text-fs-caption font-bold tabular-nums text-[var(--text-3,${C.grayNeutral2})]`}>
          +{rest}
        </span>
      ) : null}
    </div>
  )
}
