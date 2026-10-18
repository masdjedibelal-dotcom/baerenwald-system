'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useMemo, useState } from 'react'

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
    // Bereichs-Label zuerst — der Melde-Helfer gibt unbekannte Werte roh zurück („sanitaer“)
    return BEREICH_LABELS[key] || meldeBereichLabel(key) || b
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

/** Fotos/Videos aus der Meldung bzw. Website-Anfrage (`funnel_daten.fotos`: URL oder { url }). */
function fotosFromLead(lead: LeadDetail): string[] {
  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}
  const raw = Array.isArray(fd.fotos) ? fd.fotos : []
  const urls: string[] = []
  for (const f of raw) {
    const url =
      typeof f === 'string' ? f : f && typeof f === 'object' ? (f as { url?: unknown }).url : null
    if (typeof url === 'string' && /^https?:\/\//.test(url) && !urls.includes(url)) urls.push(url)
  }
  return urls
}

function istVideo(url: string): boolean {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url)
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
  const fotos = useMemo(() => fotosFromLead(lead), [lead])
  const [grossUrl, setGrossUrl] = useState<string | null>(null)

  const hatInhalt = Boolean(
    situation || bereiche || umfang || zeitraum || dringlichkeit || freitext || fotos.length
  )

  if (!hatInhalt) return null

  return (
    <MockCard title="Meldungsdetails">
      <div className="props">
        <PropRow label="Situation" value={situation} />
        <PropRow label="Bereich(e)" value={bereiche} />
        <PropRow label="Umfang" value={umfang} />
        <PropRow label="Zeitraum" value={zeitraum} />
        <PropRow label="Dringlichkeit" value={dringlichkeit} />
        <PropRow label="Freitext Melder" value={freitext} />
      </div>
      {fotos.length ? (
        <div className="mt-3">
          <div className="prop-l mb-2">Fotos ({fotos.length})</div>
          <div className="flex flex-wrap gap-2">
            {fotos.map((url) =>
              istVideo(url) ? (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="link text-[length:var(--fs-meta)]">
                  Video öffnen
                </a>
              ) : (
                <MockBtn
                  key={url}
                  type="button"
                  onClick={() => setGrossUrl(url)}
                  className="h-[54px] w-[72px] cursor-pointer overflow-hidden rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] p-0"
                  aria-label="Foto vergrößern"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </MockBtn>
              )
            )}
          </div>
        </div>
      ) : null}
      <EditorSheet
        open={!!grossUrl}
        onClose={() => setGrossUrl(null)}
        title="Foto"
        secondary={{ label: 'Schließen', onClick: () => setGrossUrl(null) }}
      >
        {grossUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={grossUrl} alt="Foto zur Meldung" className="block w-full rounded-[var(--r-sm)]" />
        ) : null}
      </EditorSheet>
    </MockCard>
  )
}
