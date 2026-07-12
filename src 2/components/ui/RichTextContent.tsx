'use client'

import { cn } from '@/lib/utils'
import { sanitizeRichTextHtml } from '@/lib/rich-text'

export function RichTextContent({
  html,
  className,
  fallback = null,
}: {
  html: string | null | undefined
  className?: string
  fallback?: React.ReactNode
}) {
  const safe = sanitizeRichTextHtml(html)
  if (!safe) return fallback ? <>{fallback}</> : null
  return (
    <div
      className={cn('rich-text-content text-bw-text', className)}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
