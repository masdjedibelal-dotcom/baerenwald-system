'use client'

import type { ResolvedVorgang } from '@/lib/vorgang/types'
import { ACTOR_LABELS } from '@/lib/vorgang/vorgang-labels'
import { cn } from '@/lib/utils'

export function VorgangResolverBanner({
  resolved,
  className,
}: {
  resolved: ResolvedVorgang
  className?: string
}) {
  if (!resolved.needsAction && !resolved.ueberfaellig && !resolved.badges.notfall) {
    return null
  }

  const hints: string[] = []
  if (resolved.badges.notfall) hints.push('Notfall')
  if (resolved.badges.wartet_freigabe) hints.push('Wartet auf Freigabe (HV)')
  if (resolved.actor) hints.push(ACTOR_LABELS[resolved.actor] ?? resolved.actor)
  if (resolved.ueberfaellig) hints.push('Rechnung überfällig')

  return (
    <div
      className={cn(
        'mb-4 rounded-xl border px-4 py-3 text-sm',
        resolved.badges.notfall
          ? 'border-red-200 bg-red-50 text-red-950'
          : 'border-amber-200 bg-amber-50 text-amber-950',
        className
      )}
      role="status"
    >
      <span className="font-medium">Aktion erforderlich</span>
      {hints.length ? <span className="text-bw-text-muted"> — {hints.join(' · ')}</span> : null}
    </div>
  )
}
