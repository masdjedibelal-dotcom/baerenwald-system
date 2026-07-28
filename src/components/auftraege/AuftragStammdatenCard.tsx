'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { AuftragDetail, LeadDetail } from '@/lib/types'

export function AuftragStammdatenCard({
  detail,
  lead,
  onSaved,
}: {
  detail: AuftragDetail
  lead?: LeadDetail | null
  onSaved?: () => void
}) {
  const isHv = lead ? resolvePipelineKontext(lead) === 'hv_meldung' : false
  const ag = lead?.auftraggeber

  const name = isHv && lead
    ? leadKontaktAnzeigeName(lead)
    : detail.kunden?.name?.trim() || lead?.kontakt_name?.trim() || '—'

  const kundeId = isHv
    ? lead?.auftraggeber_kunde_id ?? ag?.id ?? detail.kunde_id ?? detail.kunden?.id
    : detail.kunde_id ?? detail.kunden?.id

  return (
    <EntityKundenStammdatenCard
      kundeId={kundeId}
      leadId={isHv ? null : detail.lead_id ?? lead?.id}
      initial={{
        name: name === '—' ? '' : name,
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
      onSaved={onSaved}
    />
  )
}
