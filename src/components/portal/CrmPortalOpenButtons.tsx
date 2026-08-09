'use client'

import { useState, useTransition } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Props = {
  kundeId?: string
  handwerkerId?: string
  leadId?: string
  showKunde?: boolean
  showHandwerker?: boolean
  showMieter?: boolean
}

export function CrmPortalOpenButtons({
  kundeId,
  handwerkerId,
  leadId,
  showKunde = Boolean(kundeId),
  showHandwerker = Boolean(handwerkerId),
  showMieter = Boolean(leadId),
}: Props) {
  const [pending, startTransition] = useTransition()
  const [hint, setHint] = useState<string | null>(null)

  async function open(body: Record<string, string>) {
    setHint(null)
    startTransition(async () => {
      try {
        const res = await fetch('/api/portal-impersonate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = (await res.json()) as {
          ok?: boolean
          url?: string
          error?: string
          hint?: string
          roleLabel?: string
        }
        if (!res.ok || !json.ok || !json.url) {
          setHint(json.error ?? 'Portal konnte nicht geöffnet werden.')
          return
        }
        if (json.hint) setHint(json.hint)
        window.open(json.url, '_blank', 'noopener,noreferrer')
      } catch {
        setHint('Netzwerkfehler beim Öffnen des Portals.')
      }
    })
  }

  if (!showKunde && !showHandwerker && !showMieter) return null

  return (
    <div className="rounded-xl border border-bw-border bg-bw-surface-alt/60 p-3 space-y-2">
      <p className="text-xs font-medium text-bw-muted uppercase tracking-wide">
        Portal aus CRM öffnen
      </p>
      <p className="text-xs text-bw-muted">
        Öffnet die Portal-Ansicht dieser Person in einem neuen Tab. Die vorherige
        Portal-Session wird dabei automatisch ersetzt.
      </p>
      <div className="flex flex-wrap gap-2">
        {showKunde && kundeId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => open({ targetType: 'kunde', targetId: kundeId })}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden />
            HV-/Kunden-Portal
          </Button>
        ) : null}
        {showHandwerker && handwerkerId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => open({ targetType: 'handwerker', targetId: handwerkerId })}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden />
            Partner-Portal
          </Button>
        ) : null}
        {showMieter && leadId ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={() => open({ targetType: 'mieter_status', leadId })}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" aria-hidden />
            Mieter-Status
          </Button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-amber-800">{hint}</p> : null}
    </div>
  )
}
