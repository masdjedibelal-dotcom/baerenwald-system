'use client'

import { useMemo } from 'react'
import { EntityProjektUebersichtCard } from '@/components/crm/EntityProjektUebersichtCard'
import {
  LeadGptStudioBlock,
  leadHatKiVertriebsDaten,
} from '@/components/anfragen/LeadGptStudioBlock'
import { updateLeadBeschreibung } from '@/app/(dashboard)/anfragen/actions'
import { buildFunnelBedarfExtraRows } from '@/lib/anfragen/funnel-bedarf-rows'
import { isEchterFreitext, resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { situationBereichTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
import { anfragePreisDetailLabel, isCrmStaffFunnel } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'

function vorhabenTitel(lead: LeadDetail): string {
  return (
    situationBereichTitel(lead.situation, bereicheFuerAnzeige(lead.bereiche, lead.situation)) ||
    'Anfrage'
  )
}

function beschreibungFromLead(lead: LeadDetail): string | null {
  if (isEchterFreitext(lead.kontakt_nachricht)) return lead.kontakt_nachricht!.trim()
  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object'
      ? (lead.funnel_daten as Record<string, unknown>)
      : {}
  const beratung =
    typeof fd.beratung_text === 'string'
      ? fd.beratung_text.trim()
      : typeof fd.beratungText === 'string'
        ? fd.beratungText.trim()
        : ''
  if (beratung) return beratung
  const note = typeof fd.beschreibung === 'string' ? fd.beschreibung.trim() : ''
  if (note) return note
  const note2 = typeof fd.note === 'string' ? fd.note.trim() : ''
  return note2 || null
}

/** Anfrage: Bedarf (Funnel) — keine Positionen/Wunschliste in Details. */
export function AnfrageDetailsTab({
  lead,
  onSaved,
}: {
  lead: LeadDetail
  onSaved?: () => void
}) {
  const preisrahmen = resolveLeadPreisAnzeige(
    lead.kanal,
    lead.budget_ca,
    lead.preis_min,
    lead.preis_max,
    lead.funnel_daten
  )

  const bedarfUi = useMemo(() => buildFunnelBedarfExtraRows(lead), [lead])
  const showKi = leadHatKiVertriebsDaten(lead) || Boolean(lead.ki_zusammenfassung?.trim())
  const staffSelbst = isCrmStaffFunnel(lead.funnel_daten)
  const titel = vorhabenTitel(lead)
  const beschreibungRaw = (beschreibungFromLead(lead) ?? '').trim()
  const beschreibungGleich =
    staffSelbst &&
    Boolean(beschreibungRaw) &&
    (beschreibungRaw.toLowerCase() === titel.trim().toLowerCase() ||
      beschreibungRaw.toLowerCase().startsWith(`${titel.trim().toLowerCase()}\n`))

  return (
    <EntityProjektUebersichtCard
      title="Anfrage"
      icon="inbox"
      titelLabel="Vorhaben"
      initial={{
        titel,
        // Identisch mit Vorhaben → nicht nochmal anzeigen
        beschreibung: beschreibungGleich ? '' : beschreibungRaw,
        startDatum: '',
        endDatum: '',
        istBauprojekt: false,
      }}
      editableFields={['beschreibung']}
      onSave={async (draft) => {
        const r = await updateLeadBeschreibung(lead.id, draft.beschreibung)
        if (r.ok) onSaved?.()
        return r
      }}
      preisrahmenLabel={preisrahmen === '—' ? null : preisrahmen}
      preisLabel={anfragePreisDetailLabel(lead.kanal, lead.funnel_daten)}
      extraRows={bedarfUi.extraRows}
      footerRows={bedarfUi.footerRows}
      belowContent={showKi ? <LeadGptStudioBlock lead={lead} /> : null}
    />
  )
}
