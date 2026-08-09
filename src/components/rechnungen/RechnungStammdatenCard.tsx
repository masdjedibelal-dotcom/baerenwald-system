'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import type { LeadDetail, Rechnung } from '@/lib/types'
import { formatLeadListDatum, kanalLabel } from '@/lib/utils'

function eingegangenLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const day = formatLeadListDatum(iso)
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return day
  const time = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

export function RechnungStammdatenCard({
  detail,
  lead,
  onSaved,
}: {
  detail: Rechnung
  lead?: LeadDetail | null
  onSaved?: () => void
}) {
  const name = detail.kunden?.name?.trim() || lead?.kontakt_name?.trim() || ''

  return (
    <EntityKundenStammdatenCard
      kundeId={detail.kunde_id ?? detail.kunden?.id}
      leadId={lead?.id}
      initial={{
        name,
        telefon:
          detail.kunden?.telefon?.trim() || lead?.kontakt_telefon?.trim() || '',
        email: detail.kunden?.email?.trim() || lead?.kontakt_email?.trim() || '',
        plz: detail.kunden?.plz?.trim() || lead?.plz?.trim() || '',
        ort: detail.kunden?.ort?.trim() || '',
        strasse: detail.kunden?.adresse?.trim() || '',
      }}
      kundeTyp={detail.kunden?.typ}
      quelle={lead ? kanalLabel(lead.kanal) : null}
      eingegangen={eingegangenLabel(
        detail.created_at || detail.rechnungsdatum || lead?.created_at
      )}
      onSaved={onSaved}
    />
  )
}
