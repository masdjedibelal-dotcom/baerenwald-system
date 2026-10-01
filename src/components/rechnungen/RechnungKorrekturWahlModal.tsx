'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useRef } from 'react'
import { toast } from '@/components/ui/app-toast'
import { korrigiereRechnung } from '@/app/(dashboard)/rechnungen/actions'
import {
  loadRechnungWizardBootstrap,
  loadRechnungWizardBootstrapStandalone,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'

/**
 * „Rechnung bearbeiten“ bei gesendeter Rechnung: ohne Rückfrage Storno + Ersatz-Entwurf
 * vorbereiten und direkt in den Wizard. Bricht man dort ab, verwirft der Wizard alles
 * (Original wieder wie vorher). Keine Auswahl „zusätzliche Rechnung“ mehr.
 */
export function RechnungKorrekturWahlModal({
  open,
  onClose,
  rechnungId,
  auftragId,
  onKorrigieren,
}: {
  open: boolean
  onClose: () => void
  rechnungId: string
  auftragId?: string | null
  rechnungsnummer?: string | null
  onKorrigieren: (bootstrap: RechnungWizardBootstrap) => void
  /** Veraltet — keine Auswahl mehr. */
  onNeueRechnung?: () => void
}) {
  const [, startTransition] = useTransition()
  const runningRef = useRef(false)

  useEffect(() => {
    if (!open || runningRef.current) return
    runningRef.current = true
    startTransition(async () => {
      try {
        const korr = await korrigiereRechnung(rechnungId)
        if (!korr.ok) {
          toast.systemError(korr)
          return
        }
        const targetId = korr.mode === 'storno_neu' ? korr.neuId : rechnungId
        const res = auftragId?.trim()
          ? await loadRechnungWizardBootstrap(targetId, auftragId.trim())
          : await loadRechnungWizardBootstrapStandalone(targetId)
        if (!res.ok) {
          toast.systemError(res)
          return
        }
        if (korr.mode === 'storno_neu') {
          res.bootstrap.korrekturSession = {
            originalId: rechnungId,
            gutschriftId: korr.stornoId,
            neuId: korr.neuId,
            originalStatus: korr.originalStatus,
          }
        }
        onKorrigieren(res.bootstrap)
      } finally {
        runningRef.current = false
        onClose()
      }
    })
  }, [open, rechnungId, auftragId, onKorrigieren, onClose, startTransition])

  return null
}
