'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import type { AuftragDetail } from '@/lib/types'
import { formatLeadListDatum, kanalLabel } from '@/lib/utils'

function eingegangenLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const day = formatLeadListDatum(iso)
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return day
  const time = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

export function AuftragStammdatenCard({
  detail,
  lead,
  onSaved,
}: {
  detail: AuftragDetail
  lead?: {
    id?: string | null
    plz?: string | null
    kontakt_name?: string | null
    kontakt_email?: string | null
    kontakt_telefon?: string | null
    kanal?: string | null
    created_at?: string | null
  } | null
  onSaved?: () => void
}) {
  const name =
    detail.kunden?.name?.trim() || lead?.kontakt_name?.trim() || '—'

  return (
    <EntityKundenStammdatenCard
      kundeId={detail.kunde_id ?? detail.kunden?.id}
      leadId={detail.lead_id ?? lead?.id}
      initial={{
        name: name === '—' ? '' : name,
        telefon:
          detail.kunden?.telefon?.trim() || lead?.kontakt_telefon?.trim() || '',
        email: detail.kunden?.email?.trim() || lead?.kontakt_email?.trim() || '',
        plz: detail.kunden?.plz?.trim() || lead?.plz?.trim() || '',
        ort: detail.kunden?.ort?.trim() || '',
        strasse: [detail.kunden?.strasse, detail.kunden?.hausnummer]
          .filter(Boolean)
          .join(' ')
          .trim(),
      }}
      kundeTyp={detail.kunden?.typ}
      quelle={lead?.kanal ? kanalLabel(lead.kanal) : null}
      eingegangen={eingegangenLabel(detail.created_at || lead?.created_at)}
      onSaved={onSaved}
    />
  )
}
