'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import type { KiAssistScopeId } from '@/lib/copilot/ki-assist-scopes'
import { getKiAssistScope } from '@/lib/copilot/ki-assist-scopes'
import { cn } from '@/lib/utils'

/**
 * Sparkles-Icon in Editoren → öffnet Assistenten bereits auf den Scope eingestellt.
 */
export function KiAssistIconButton({
  scope,
  extraHint,
  draftInput,
  className,
  title,
  onBeforeOpen,
}: {
  scope: KiAssistScopeId
  extraHint?: string | null
  draftInput?: string | null
  className?: string
  title?: string
  onBeforeOpen?: () => void
}) {
  const { openScoped } = useAssistent()
  const meta = getKiAssistScope(scope)
  const label = title ?? `KI: ${meta.label}`

  return (
    <button
      type="button"
      className={cn('ki-assist-icon-btn', className)}
      title={label}
      aria-label={label}
      onClick={() => {
        onBeforeOpen?.()
        openScoped({
          scopeId: scope,
          extraHint: extraHint ?? null,
          draftInput: draftInput ?? null,
        })
      }}
    >
      <MockIcon ctx="btn" n="sparkles" size={16} />
    </button>
  )
}
