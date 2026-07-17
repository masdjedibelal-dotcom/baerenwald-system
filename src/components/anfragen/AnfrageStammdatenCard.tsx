'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import {
  leadKontaktAnzeigeName,
  resolveLeadKunde,
} from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail } from '@/lib/types'
import { formatLeadListDatum, kanalLabel } from '@/lib/utils'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

function regionLabel(lead: LeadDetail): string {
  const kunde = resolveLeadKunde(lead.kunden)
  const ort = (kunde?.ort ?? '').trim()
  const plz = (kunde?.plz ?? lead.plz ?? '').trim()
  if (ort && plz) return `${ort} · ${plz}`
  if (ort) return ort
  if (plz) return plz
  return '—'
}

function eingegangenLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  const day = formatLeadListDatum(iso)
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return day
  const time = t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

/** Mock Stammdaten — direktes `.card` unter DetailShell (flach, ohne Border). */
export function AnfrageStammdatenCard({ lead }: { lead: LeadDetail }) {
  const kunde = resolveLeadKunde(lead.kunden)
  const name = leadKontaktAnzeigeName(lead)
  const tel = (kunde?.telefon ?? lead.kontakt_telefon ?? '').trim()
  const email = (kunde?.email ?? lead.kontakt_email ?? '').trim()
  const isHv = resolvePipelineKontext(lead) === 'hv_meldung'

  return (
    <MockCard title="Stammdaten">
      <div className="props">
        <MockProp label="Name">{name}</MockProp>
        <MockProp label="Telefon" link={Boolean(tel)}>
          {tel ? <a href={telHref(tel)}>{tel}</a> : '—'}
        </MockProp>
        <MockProp label="E-Mail" link={Boolean(email)}>
          {email ? <a href={`mailto:${email}`}>{email}</a> : '—'}
        </MockProp>
        <MockProp label="Region">{regionLabel(lead)}</MockProp>
        {!isHv ? (
          <>
            <MockProp label="Quelle">{kanalLabel(lead.kanal)}</MockProp>
            <MockProp label="Eingegangen">{eingegangenLabel(lead.created_at)}</MockProp>
          </>
        ) : null}
      </div>
    </MockCard>
  )
}
