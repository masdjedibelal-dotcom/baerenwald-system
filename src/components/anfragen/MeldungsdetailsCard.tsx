'use client'

import { useMemo } from 'react'

import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { meldeBereichLabel } from '@/lib/anfragen/melde-fachdetail-labels'
import { isEchterFreitext } from '@/lib/lead-display-helpers'
import { leadSituationDisplay, normalizeFunnelDaten } from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { BEREICH_LABELS } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'

function PropRow({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim()
  if (!text) return null
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v whitespace-pre-wrap">{text}</div>
    </div>
  )
}

function bereichAnzeige(lead: LeadDetail): string | null {
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  if (!bereiche.length) return null
  const labels = bereiche.map((b) => {
    const key = b.trim().toLowerCase()
    return meldeBereichLabel(key) || BEREICH_LABELS[key] || b
  })
  return labels.join(', ')
}

function freitextFromLead(lead: LeadDetail): string | null {
  if (isEchterFreitext(lead.kontakt_nachricht)) return lead.kontakt_nachricht!.trim()
  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}
  for (const key of ['beschreibung', 'note', 'beratung_text', 'beratungText']) {
    const v = fd[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** Nur Anzeige — Funnel-/Meldedaten aus Website- oder Staff-Funnel. */
export function MeldungsdetailsCard({ lead }: { lead: LeadDetail }) {
  const bedarf = useMemo(() => buildFunnelBedarfExtraRows(lead), [lead])

  const norm = useMemo(() => {
    try {
      return normalizeFunnelDaten(lead.funnel_daten, lead.bereiche)
    } catch {
      return null
    }
  }, [lead.funnel_daten, lead.bereiche])

  const situation = leadSituationDisplay(lead.situation) || null
  const bereiche = bereichAnzeige(lead)
  const umfang = norm?.labels.umfang?.trim() || null
  const zeitraum =
    bedarf.extraRows.find((r) => r.label === 'Zeitraum')?.children?.toString() ?? null
  const dringlichkeit =
    bedarf.extraRows.find((r) => r.label === 'Dringlichkeit')?.children?.toString() ??
    norm?.labels.dringlichkeit?.trim() ??
    null
  const freitext = freitextFromLead(lead)

  const hatInhalt = Boolean(
    situation || bereiche || umfang || zeitraum || dringlichkeit || freitext
  )

  if (!hatInhalt) return null

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">Meldungsdetails</div>
      </div>
      <div className="card-b">
        <div className="props">
          <PropRow label="Situation" value={situation} />
          <PropRow label="Bereich(e)" value={bereiche} />
          <PropRow label="Umfang" value={umfang} />
          <PropRow label="Zeitraum" value={zeitraum} />
          <PropRow label="Dringlichkeit" value={dringlichkeit} />
          <PropRow label="Freitext Melder" value={freitext} />
        </div>
      </div>
    </div>
  )
}
