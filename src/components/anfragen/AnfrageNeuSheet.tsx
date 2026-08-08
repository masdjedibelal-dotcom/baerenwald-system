'use client'

import { AnfrageWizard } from '@/components/anfragen/AnfrageWizard'
import type { LeadDetail } from '@/lib/types'

export type AnfrageNeuSheetProps = {
  open: boolean
  onClose: () => void
  defaultKundeId?: string | null
  onSuccess?: (id: string) => void
  bearbeitenLead?: LeadDetail | null
}

/** Fullscreen-Wizard (wie Angebot/Rechnung) — Name historisch „Sheet“. */
export function AnfrageNeuSheet(props: AnfrageNeuSheetProps) {
  return <AnfrageWizard {...props} />
}
