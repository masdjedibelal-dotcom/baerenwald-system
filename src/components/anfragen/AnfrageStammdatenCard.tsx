'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import {
  leadKontaktAnzeigeName,
  resolveLeadKunde,
} from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail } from '@/lib/types'

export function AnfrageStammdatenCard({
  lead,
  onSaved,
}: {
  lead: LeadDetail
  onSaved?: () => void
}) {
  const isHv = resolvePipelineKontext(lead) === 'hv_meldung'
  const melder = resolveLeadKunde(lead.kunden)
  const ag = lead.auftraggeber
  const name = leadKontaktAnzeigeName(lead)

  const kundeId = isHv
    ? lead.auftraggeber_kunde_id ?? ag?.id ?? null
    : lead.kunde_id ?? melder?.id ?? null

  const telefon = isHv
    ? (ag?.telefon ?? '').trim()
    : (melder?.telefon ?? lead.kontakt_telefon ?? '').trim()
  const email = isHv
    ? (ag?.email ?? '').trim()
    : (melder?.email ?? lead.kontakt_email ?? '').trim()
  const plz = isHv ? (ag?.plz ?? '').trim() : (melder?.plz ?? lead.plz ?? '').trim()
  const ort = isHv ? (ag?.ort ?? '').trim() : (melder?.ort ?? '').trim()
  const strasse = isHv
    ? [ag?.strasse, ag?.hausnummer].filter(Boolean).join(' ').trim()
    : [melder?.strasse, melder?.hausnummer].filter(Boolean).join(' ').trim()
  const kundeTyp = isHv ? ag?.typ ?? 'hausverwaltung' : melder?.typ

  return (
    <EntityKundenStammdatenCard
      kundeId={kundeId}
      leadId={isHv ? null : lead.id}
      initial={{ name, telefon, email, plz, ort, strasse }}
      kundeTyp={kundeTyp}
      onSaved={onSaved}
    />
  )
}
