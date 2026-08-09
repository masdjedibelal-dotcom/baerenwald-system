'use client'

import { useEffect, useRef } from 'react'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import type { KiAssistDraft } from '@/lib/copilot/ki-assist-scopes'

/**
 * Wenn der Assistent „In Formular übernehmen“ sendet und dieses Sheet offen ist,
 * wird der Entwurf einmalig an onApply übergeben.
 */
export function useKiAssistDraftConsumer(
  active: boolean,
  accept: KiAssistDraft['type'] | KiAssistDraft['type'][],
  onApply: (draft: KiAssistDraft) => void
) {
  const { pendingDraft, consumePendingDraft } = useAssistent()
  const onApplyRef = useRef(onApply)
  onApplyRef.current = onApply

  useEffect(() => {
    if (!active || !pendingDraft) return
    const allow = Array.isArray(accept) ? accept : [accept]
    if (!allow.includes(pendingDraft.type)) return
    const d = consumePendingDraft(allow)
    if (d) onApplyRef.current(d)
  }, [active, pendingDraft, accept, consumePendingDraft])
}
