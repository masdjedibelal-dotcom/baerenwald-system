'use client'

import { useMemo, useState } from 'react'
import { useLocalTransition } from '@/components/ui/action-busy'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { createDirektauftragMitLeistungen } from '@/app/(dashboard)/auftraege/direktauftrag-leistungen-actions'
import { parseFunnelPositionen } from '@/lib/lead-funnel-positionen'
import { leadIstAkut } from '@/lib/anfragen/anfrage-akut-schwelle'
import {
  neuePosBoardLine,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { Gewerk, LeadDetail, Preisliste } from '@/lib/types'

function vorhabenTitel(lead: LeadDetail): string {
  const sit = lead.situation?.trim()
  if (sit && sit !== 'notfall') return sit
  const bereiche = Array.isArray(lead.bereiche)
    ? lead.bereiche.map((b) => String(b).trim()).filter(Boolean)
    : []
  if (bereiche.length) return bereiche.join(', ')
  return lead.melder_einheit?.trim() || 'Direktauftrag'
}

function seedLinesFromLead(lead: LeadDetail): PosBoardLine[] {
  const funnel = parseFunnelPositionen(lead.funnel_daten)
  if (!funnel.length) return [neuePosBoardLine()]
  return funnel.map((p) => {
    const mid =
      p.preis_min > 0 || p.preis_max > 0
        ? Math.round(((p.preis_min + p.preis_max) / 2) * 100) / 100
        : 0
    return neuePosBoardLine({
      name: p.leistung?.trim() || 'Leistung',
      gewerk: p.gewerk_name?.trim() || 'Allgemein',
      menge: p.menge > 0 ? p.menge : 1,
      einheit: p.einheit?.trim() || 'Stück',
      preis: mid,
      beschreibung: '',
    })
  })
}

/**
 * Abgespeckter DocumentCanvas wie Angebot/Rechnung — nur PosBoard (Leistungen).
 * Speichern (✓ oben rechts) → Auftrag anlegen → Aufrufer öffnet Auftrag/Leistungen.
 */
export function DirektBeauftragenWizard({
  lead,
  gewerke = [],
  preislisten = [],
  initialLines,
  firm: _firm,
  onClose,
  onDone,
}: {
  lead: LeadDetail
  gewerke?: Gewerk[]
  preislisten?: Preisliste[]
  initialLines?: PosBoardLine[]
  firm?: FirmenEinstellungen
  onClose: () => void
  onDone: (auftragId: string) => void
}) {
  const [pending, startTransition] = useLocalTransition()
  const [lines, setLines] = useState<PosBoardLine[]>(() =>
    initialLines && initialLines.length > 0 ? initialLines : seedLinesFromLead(lead)
  )
  const istAkut = leadIstAkut(lead)
  const titel = useMemo(() => vorhabenTitel(lead), [lead])
  const gewerkNamen = useMemo(
    () =>
      gewerke
        .map((g) => g.name?.trim())
        .filter((n): n is string => Boolean(n)),
    [gewerke]
  )

  function speichern() {
    const ok = lines.some((l) => l.name.trim())
    if (!ok) {
      toast.error('Mindestens eine Leistung mit Bezeichnung erforderlich.')
      return
    }
    startTransition(async () => {
      const r = await createDirektauftragMitLeistungen({
        leadId: lead.id,
        positionen: lines,
        titel,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Direktauftrag angelegt')
      onDone(r.auftragId)
    })
  }

  return (
    <DocumentCanvas
      portal
      manageHistory={false}
      title="Direkt beauftragen"
      subtitle={istAkut ? `${titel} · Akut` : titel}
      onClose={onClose}
      onSave={() => speichern()}
      saveBusy={pending}
      busy={pending}
      busyLabel="Auftrag wird angelegt…"
      className="wizard-flow direkt-beauftragen-canvas"
      document={
        <div className="dc-doc flex flex-col gap-4">
          <PosBoard
            title={titel || 'Leistungen'}
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
