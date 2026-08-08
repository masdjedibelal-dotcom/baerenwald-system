'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import type { LeadDetail, Rechnung } from '@/lib/types'

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

  const k = detail.kunden

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
        strasse:
          [detail.kunden?.strasse, detail.kunden?.hausnummer].filter(Boolean).join(' ').trim() ||
          detail.kunden?.adresse?.trim() ||
          '',
        vorname: k?.vorname ?? '',
        nachname: k?.nachname ?? '',
        ansprechpartner: k?.ansprechpartner ?? '',
        webseite: k?.webseite ?? '',
      }}
      kundeTyp={detail.kunden?.typ}
      onSaved={onSaved}
    />
  )
}
