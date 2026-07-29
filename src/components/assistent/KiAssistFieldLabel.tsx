'use client'

import type { ReactNode } from 'react'
import { KiAssistIconButton } from '@/components/assistent/KiAssistIconButton'
import type { KiAssistScopeId } from '@/lib/copilot/ki-assist-scopes'
import { cn } from '@/lib/utils'

/** Label-Zeile mit KI-Icon — für kundensichtbare Textfelder. */
export function KiAssistFieldLabel({
  label,
  scope,
  extraHint,
  draftInput,
  required,
  className,
  children,
  onBeforeOpen,
}: {
  label: ReactNode
  scope: KiAssistScopeId
  extraHint?: string | null
  draftInput?: string | null
  required?: boolean
  className?: string
  children?: ReactNode
  onBeforeOpen?: () => void
}) {
  return (
    <div className={cn('ki-assist-field', className)}>
      <div className="lt-field-lbl lt-field-lbl--with-ki">
        <span>
          {label}
          {required ? <span className="req"> *</span> : null}
        </span>
        <KiAssistIconButton
          scope={scope}
          extraHint={extraHint}
          draftInput={draftInput}
          onBeforeOpen={onBeforeOpen}
        />
      </div>
      {children}
    </div>
  )
}
