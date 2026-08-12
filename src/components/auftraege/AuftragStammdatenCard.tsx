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
  /**
   * HV: bevorzugt Auftraggeber-Embed; sonst Vertragskunde am Auftrag
   * (Direktauftrag lädt oft kein `auftraggeber`-Join → sonst leere Tel/Mail/Adresse).
   */
  const hvKunde = lead?.auftraggeber ?? (isHv ? detail.kunden : null)
  const k = isHv ? hvKunde : detail.kunden

  const hvName =
    hvKunde?.org_anzeigename?.trim() ||
    hvKunde?.name?.trim() ||
    (lead ? leadKontaktAnzeigeName(lead, '') : '') ||
    ''

  const name = isHv
    ? hvName || '—'
    : detail.kunden?.name?.trim() || lead?.kontakt_name?.trim() || '—'

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
        name: name === '—' ? '' : name,
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
