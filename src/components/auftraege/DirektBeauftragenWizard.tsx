'use client'

import { useMemo, useState } from 'react'
import { useLocalTransition } from '@/components/ui/action-busy'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { PosBoard } from '@/components/posboard/PosBoard'
import { toast } from '@/components/ui/app-toast'
import { createDirektauftragMitLeistungen } from '@/app/(dashboard)/auftraege/direktauftrag-leistungen-actions'
import { parseFunnelPositionen } from '@/lib/lead-funnel-positionen'
import { leadIstAkut } from '@/lib/anfragen/anfrage-akut-schwelle'
import { preislisteEinzelpreis } from '@/lib/preisliste-preis'
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

function normLeistung(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß]+/g, ' ')
    .trim()
}

/** Fehlende Einzelpreise aus Preisliste nachziehen (nie vorhandene Preise überschreiben). */
function enrichZeroPrices(
  lines: PosBoardLine[],
  preislisten: Preisliste[]
): PosBoardLine[] {
  if (!lines.length || !preislisten.length) return lines
  const aktiv = preislisten.filter((p) => p.aktiv !== false)
  if (!aktiv.length) return lines

  return lines.map((line) => {
    if (line.kind === 'freitext' || line.kind === 'nachlass') return line
    if ((Number(line.preis) || 0) > 0) return line

    if (line.preisliste_id) {
      const byId = aktiv.find((p) => p.id === line.preisliste_id)
      const v = byId ? preislisteEinzelpreis(byId) : 0
      if (v > 0) return { ...line, preis: v, preisliste_id: byId!.id }
    }

    const hint = normLeistung(line.name)
    if (!hint) return line
    const exact = aktiv.find((p) => normLeistung(p.leistung) === hint)
    const words = hint.split(/\s+/).filter(Boolean)
    const partial =
      exact ??
      aktiv.find((p) => {
        const n = normLeistung(p.leistung)
        return words.some((w) => w.length > 2 && n.includes(w))
      })
    if (!partial) return line
    const v = preislisteEinzelpreis(partial)
    if (v <= 0) return line
    return {
      ...line,
      preis: v,
      preisliste_id: line.preisliste_id ?? partial.id,
      einheit: line.einheit?.trim() || partial.einheit || line.einheit,
    }
  })
}

function seedLinesFromLead(
  lead: LeadDetail,
  preislisten: Preisliste[] = []
): PosBoardLine[] {
  const funnel = parseFunnelPositionen(lead.funnel_daten)
  if (!funnel.length) return [neuePosBoardLine()]
  const seeded = funnel.map((p) => {
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
  return enrichZeroPrices(seeded, preislisten)
}

/**
 * Partner-LV (falls vorhanden) bevorzugen, aber 0-€-Preise aus Funnel/Preisliste füllen.
 * Nie vorhandene Preise auf 0 setzen.
 */
function resolveInitialLines(
  lead: LeadDetail,
  preislisten: Preisliste[],
  initialLines?: PosBoardLine[]
): PosBoardLine[] {
  const seed = seedLinesFromLead(lead, preislisten)
  if (!initialLines?.length) return seed

  const seedPreisByName = new Map(
    seed
      .filter((s) => (Number(s.preis) || 0) > 0)
      .map((s) => [normLeistung(s.name), Number(s.preis)])
  )

  const merged = initialLines.map((line) => {
    if (line.kind === 'freitext' || line.kind === 'nachlass') return line
    if ((Number(line.preis) || 0) > 0) return line
    const fromSeed = seedPreisByName.get(normLeistung(line.name))
    if (fromSeed != null && fromSeed > 0) return { ...line, preis: fromSeed }
    return line
  })

  return enrichZeroPrices(merged, preislisten)
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
    resolveInitialLines(lead, preislisten, initialLines)
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
