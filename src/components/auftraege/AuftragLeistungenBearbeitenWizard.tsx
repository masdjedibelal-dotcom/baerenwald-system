'use client'

import { useMemo, useState } from 'react'
import { useLocalTransition } from '@/components/ui/action-busy'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { saveAuftragLeistungenOhneAngebot } from '@/app/(dashboard)/auftraege/auftrag-posboard-actions'
import {
  auftragPositionenToPosBoardLines,
  neuePosBoardLine,
  type PosBoardLine,
} from '@/lib/posboard/position-adapters'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AuftragPosition, Gewerk, Preisliste } from '@/lib/types'
import { COPY_BUTTON, TOAST } from '@/lib/copy'

/**
 * Leistungen am Direktauftrag ohne Angebot bearbeiten.
 * Schreibt nur `auftrag_positionen` — kein Angebot-Wizard / kein Sync.
 */
export function AuftragLeistungenBearbeitenWizard({
  auftragId,
  titel,
  positionen,
  gewerke = [],
  preislisten = [],
  firm: _firm,
  onClose,
  onDone,
  fallbackLines,
}: {
  auftragId: string
  titel: string
  positionen: AuftragPosition[]
  /** Wenn der Auftrag noch keine eigenen Positionen hat (Altdaten): aus dem Angebot vorbelegen */
  fallbackLines?: PosBoardLine[]
  gewerke?: Gewerk[]
  preislisten?: Preisliste[]
  firm?: FirmenEinstellungen
  onClose: () => void
  onDone: () => void
}) {
  const [pending, startTransition] = useLocalTransition()
  const seeded = useMemo(() => {
    const lines = auftragPositionenToPosBoardLines(positionen)
    if (lines.length) return lines
    return fallbackLines?.length ? fallbackLines : [neuePosBoardLine()]
  }, [positionen, fallbackLines])
  const [lines, setLinesState] = useState<PosBoardLine[]>(seeded)
  const [draftDirty, setDraftDirty] = useState(false)

  const setLines = (next: PosBoardLine[]) => {
    setDraftDirty(true)
    setLinesState(next)
  }

  const gewerkNamen = useMemo(
    () =>
      gewerke
        .map((g) => g.name?.trim())
        .filter((n): n is string => Boolean(n)),
    [gewerke]
  )

  const hatLeistung = lines.some((l) => l.name.trim())
  const displayTitel = titel.trim() || 'Leistungen'

  function speichern() {
    if (!hatLeistung) {
      toast.error(TOAST.mindestens_eine_leistung_mit_bezeichnung_erforde)
      return
    }
    startTransition(async () => {
      const r = await saveAuftragLeistungenOhneAngebot({
        auftragId,
        positionen: lines,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.leistung_gespeichert)
      onDone()
    })
  }

  return (
    <DocumentCanvas
      portal
      manageHistory={false}
      title={COPY_BUTTON.leistungenBearbeiten}
      subtitle={displayTitel}
      onClose={onClose}
      draftDirty={draftDirty}
      busy={pending}
      busyLabel="Leistungen werden gespeichert…"
      className="wizard-flow auftrag-leistungen-canvas"
      primaryAction={{
        label: COPY_BUTTON.speichern,
        onClick: speichern,
        busy: pending,
        getGaps: () =>
          hatLeistung
            ? []
            : [{ id: 'positionen', label: 'mindestens 1 Position' }],
      }}
      document={
        <div className="dc-doc flex flex-col gap-4" data-doc-section="positionen">
          <PosBoard
            title={displayTitel}
            positionen={lines}
            onChange={setLines}
            showUst={false}
            showTotals={false}
            gewerke={gewerkNamen}
            preislisten={preislisten}
          />
        </div>
      }
    />
  )
}
