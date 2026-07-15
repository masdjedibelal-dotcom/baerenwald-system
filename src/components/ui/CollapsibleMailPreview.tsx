'use client'

import { useState } from 'react'
import { ChevronDown, Mail } from 'lucide-react'
import { mailIframeSrcDoc } from '@/lib/mail/mail-iframe-srcdoc'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useIsMobile'

export function CollapsibleMailPreview({
  previewHtml,
  loadingMessage = 'Vorschau lädt…',
}: {
  previewHtml: string
  loadingMessage?: string
}) {
  const isMobile = useIsMobile()
  const [userToggled, setUserToggled] = useState<boolean | null>(null)
  const expanded = userToggled ?? !isMobile

  return (
    <div className="rounded-lg border border-bw-border bg-white">
      <button
        type="button"
        className="flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2.5 text-left md:cursor-default"
        onClick={() => setUserToggled((v) => !(v ?? !isMobile))}
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
          <Mail className="h-3.5 w-3.5" aria-hidden />
          Vorschau (Kopf &amp; Fuß)
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-bw-text-muted transition-transform md:hidden',
            expanded && 'rotate-180'
          )}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="border-t border-bw-border p-2 md:border-t-0 md:pt-0">
          <iframe
            title="E-Mail-Vorschau"
            sandbox=""
            className="h-[min(280px,40vh)] w-full rounded border-0 bg-white md:h-[280px]"
            srcDoc={mailIframeSrcDoc(previewHtml, loadingMessage)}
          />
        </div>
      ) : null}
    </div>
  )
}
