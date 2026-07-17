'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import type { AuftragDetail } from '@/lib/types'
import { formatLeadListDatum, kanalLabel } from '@/lib/utils'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

function regionLabel(detail: AuftragDetail, leadPlz?: string | null): string {
  const ort = (detail.kunden?.ort ?? '').trim()
  const plz = (detail.kunden?.plz ?? leadPlz ?? '').trim()
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

/**
 * Mock Stammdaten Auftrag — flache Prop-Liste wie Anfrage/Angebot
 * (Name · Telefon · E-Mail · Region · Quelle · Eingegangen).
 */
export function AuftragStammdatenCard({
  detail,
  lead,
}: {
  detail: AuftragDetail
  lead?: {
    plz?: string | null
    kontakt_name?: string | null
    kontakt_email?: string | null
    kontakt_telefon?: string | null
    kanal?: string | null
    created_at?: string | null
  } | null
}) {
  const name =
    detail.kunden?.name?.trim() ||
    lead?.kontakt_name?.trim() ||
    '—'
  const tel =
    detail.kunden?.telefon?.trim() ||
    lead?.kontakt_telefon?.trim() ||
    ''
  const email =
    detail.kunden?.email?.trim() ||
    lead?.kontakt_email?.trim() ||
    ''
  const quelle = lead?.kanal ? kanalLabel(lead.kanal) : null
  const eingegangen = eingegangenLabel(detail.created_at || lead?.created_at)

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
        <MockProp label="Region">{regionLabel(detail, lead?.plz)}</MockProp>
        {quelle ? <MockProp label="Quelle">{quelle}</MockProp> : null}
        <MockProp label="Eingegangen">{eingegangen}</MockProp>
      </div>
    </MockCard>
  )
}
