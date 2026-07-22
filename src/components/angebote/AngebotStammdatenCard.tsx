'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import { kundeNameAusAngebot } from '@/lib/angebot-einfach'
import {
  leadKontaktAnzeigeName,
} from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { AngebotDetail, LeadDetail } from '@/lib/types'
import { formatLeadListDatum, kanalLabel } from '@/lib/utils'

function eingegangenLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const day = formatLeadListDatum(iso)
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return day
  const time = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

export function AngebotStammdatenCard({
  detail,
  lead,
  onSaved,
}: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  onSaved?: () => void
}) {
  const isHv = lead ? resolvePipelineKontext(lead) === 'hv_meldung' : false
  const ag = lead?.auftraggeber

  const name = isHv && lead ? leadKontaktAnzeigeName(lead) : kundeNameAusAngebot(detail)
  const kundeId = isHv
    ? lead?.auftraggeber_kunde_id ?? ag?.id ?? detail.kunde_id ?? detail.kunden?.id
    : detail.kunde_id ?? detail.kunden?.id

  return (
    <EntityKundenStammdatenCard
      kundeId={kundeId}
      leadId={isHv ? null : detail.lead_id ?? lead?.id}
      initial={{
        name,
        telefon: isHv
          ? (ag?.telefon ?? '').trim()
          : detail.kunden?.telefon?.trim() || lead?.kontakt_telefon?.trim() || '',
        email: isHv
          ? (ag?.email ?? '').trim()
          : detail.kunden?.email?.trim() || lead?.kontakt_email?.trim() || '',
        plz: isHv
          ? (ag?.plz ?? '').trim()
          : detail.kunden?.plz?.trim() || lead?.plz?.trim() || '',
        ort: isHv ? (ag?.ort ?? '').trim() : detail.kunden?.ort?.trim() || '',
        strasse: isHv
          ? [ag?.strasse, ag?.hausnummer].filter(Boolean).join(' ').trim()
          : [detail.kunden?.strasse, detail.kunden?.hausnummer]
              .filter(Boolean)
              .join(' ')
              .trim(),
      }}
      kundeTyp={isHv ? ag?.typ ?? 'hausverwaltung' : detail.kunden?.typ}
      quelle={lead && !isHv ? kanalLabel(lead.kanal) : null}
      eingegangen={eingegangenLabel(detail.created_at || lead?.created_at)}
      onSaved={onSaved}
    />
  )
}
