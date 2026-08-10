'use client'

import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
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
  const isHv = lead ? resolvePipelineKontext(lead) === 'hv_meldung' : false
  const hvKunde = lead?.auftraggeber ?? (isHv ? detail.kunden : null)
  const k = isHv ? hvKunde : detail.kunden

  const name = isHv
    ? lead?.auftraggeber?.org_anzeigename?.trim() ||
      hvKunde?.name?.trim() ||
      (lead ? leadKontaktAnzeigeName(lead, '') : '') ||
      ''
    : detail.kunden?.name?.trim() || lead?.kontakt_name?.trim() || ''

  const kundeId = isHv
    ? lead?.auftraggeber_kunde_id ?? hvKunde?.id ?? detail.kunde_id ?? detail.kunden?.id
    : detail.kunde_id ?? detail.kunden?.id

  const strasse =
    [k?.strasse, k?.hausnummer].filter(Boolean).join(' ').trim() ||
    k?.adresse?.trim() ||
    ''

  return (
    <EntityKundenStammdatenCard
      kundeId={kundeId}
      leadId={isHv ? null : lead?.id}
      initial={{
        name,
        telefon: (k?.telefon ?? (!isHv ? lead?.kontakt_telefon : null) ?? '').trim(),
        email: (k?.email ?? (!isHv ? lead?.kontakt_email : null) ?? '').trim(),
        plz: (k?.plz ?? (!isHv ? lead?.plz : null) ?? '').trim(),
        ort: (k?.ort ?? '').trim(),
        strasse,
        vorname: k?.vorname ?? '',
        nachname: k?.nachname ?? '',
        ansprechpartner: k?.ansprechpartner ?? '',
        webseite: k?.webseite ?? '',
      }}
      kundeTyp={isHv ? k?.typ ?? 'hausverwaltung' : detail.kunden?.typ}
      onSaved={onSaved}
    />
  )
}
