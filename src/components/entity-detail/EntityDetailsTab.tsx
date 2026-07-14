'use client'

import type { ReactNode } from 'react'
import { ProjektUebersichtCard } from '@/components/crm/ProjektUebersichtCard'
import { PosBoard } from '@/components/posboard/PosBoard'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { AngebotPosition } from '@/lib/types'

/** Spec §3 „Details“: Projekt-Übersicht + PosBoard. */
export function EntityDetailsTab({
  projektKontext,
  positionen = [],
  overview,
  posBoardTitle = 'Leistungen',
  posBoardReadOnly = true,
}: {
  projektKontext?: ProjektKontext | null
  positionen?: AngebotPosition[]
  overview?: ReactNode
  posBoardTitle?: string
  posBoardReadOnly?: boolean
}) {
  return (
    <div className="space-y-4">
      {projektKontext ? <ProjektUebersichtCard kontext={projektKontext} /> : null}
      {overview}
      <PosBoard
        title={posBoardTitle}
        positionen={positionen}
        readOnly={posBoardReadOnly}
      />
    </div>
  )
}
