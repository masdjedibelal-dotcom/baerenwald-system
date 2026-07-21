'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import {
  leadKontaktAnzeigeName,
  resolveLeadKunde,
} from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail } from '@/lib/types'
import { formatLeadListDatum, kanalLabel } from '@/lib/utils'

function eingegangenLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const day = formatLeadListDatum(iso)
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return day
  const time = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

export function AnfrageStammdatenCard({
  lead,
  onSaved,
}: {
  lead: LeadDetail
  onSaved?: () => void
}) {
  const kunde = resolveLeadKunde(lead.kunden)
  const isHv = resolvePipelineKontext(lead) === 'hv_meldung'
  const name = leadKontaktAnzeigeName(lead)

  return (
    <EntityKundenStammdatenCard
      kundeId={lead.kunde_id ?? kunde?.id}
      leadId={lead.id}
      initial={{
        name,
        telefon: (kunde?.telefon ?? lead.kontakt_telefon ?? '').trim(),
        email: (kunde?.email ?? lead.kontakt_email ?? '').trim(),
        plz: (kunde?.plz ?? lead.plz ?? '').trim(),
        ort: (kunde?.ort ?? '').trim(),
        strasse: [kunde?.strasse, kunde?.hausnummer].filter(Boolean).join(' ').trim(),
      }}
      kundeTyp={kunde?.typ}
      quelle={!isHv ? kanalLabel(lead.kanal) : null}
      eingegangen={!isHv ? eingegangenLabel(lead.created_at) : null}
      onSaved={onSaved}
    />
  )
}
