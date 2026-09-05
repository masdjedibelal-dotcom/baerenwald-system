'use client'

import type { ReactNode } from 'react'
import { EntityKundenStammdatenCard } from '@/components/crm/EntityKundenStammdatenCard'
import { kundeNameAusAngebot } from '@/lib/angebot-einfach'
import { leadKontaktAnzeigeName } from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { AngebotDetail, LeadDetail } from '@/lib/types'

export function AngebotStammdatenCard({
  detail,
  lead,
  onSaved,
  footerBanner,
}: {
  detail: AngebotDetail
  lead?: LeadDetail | null
  onSaved?: () => void
  footerBanner?: ReactNode
}) {
  const isHv = lead ? resolvePipelineKontext(lead) === 'hv_meldung' : false
  /** HV: Auftraggeber-Embed, sonst Vertragskunde am Angebot (falls Embed fehlt). */
  const hvKunde = lead?.auftraggeber ?? (isHv ? detail.kunden : null)
  const k = isHv ? hvKunde : detail.kunden

  const name = isHv
    ? hvKunde?.org_anzeigename?.trim() ||
      hvKunde?.name?.trim() ||
      (lead ? leadKontaktAnzeigeName(lead) : '') ||
      '—'
    : kundeNameAusAngebot(detail)
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
      leadId={isHv ? null : detail.lead_id ?? lead?.id}
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
      footerBanner={footerBanner}
    />
  )
}
