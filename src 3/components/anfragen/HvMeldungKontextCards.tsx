'use client'

import Link from 'next/link'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockProp } from '@/components/mock-ui/MockProp'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail } from '@/lib/types'
import { formatLeadListDatum } from '@/lib/utils'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

function orgName(lead: LeadDetail): string {
  const ag = lead.auftraggeber
  if (!ag) return '—'
  return (ag.org_anzeigename ?? ag.name ?? '').trim() || '—'
}

function objektAdresse(lead: LeadDetail): string | null {
  const o = lead.kunden_objekte
  if (!o) return null
  const str = kundenObjektStrasseZeile(o)
  const plzOrt = [o.plz, o.ort].filter(Boolean).join(' ')
  const parts = [str, plzOrt].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function melderRolle(lead: LeadDetail): string | null {
  if (lead.erfassung_von === 'melder' || lead.kanal === 'hv_melder_link') return 'Mieter'
  if (lead.anlass === 'meldung' && (lead.melder_name || lead.melder_email || lead.melder_telefon)) {
    return 'Mieter'
  }
  return null
}

function meldungMeta(lead: LeadDetail): string {
  if (!lead.created_at) return ''
  const day = formatLeadListDatum(lead.created_at)
  const t = new Date(lead.created_at)
  const time = Number.isNaN(t.getTime())
    ? ''
    : t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const gemeldet = time ? `gemeldet ${day} · ${time}` : `gemeldet ${day}`
  return gemeldet
}

/** Mock `HVKontextCard` — nur bei HV-Meldung. */
export function HvMeldungKontextCards({ lead }: { lead: LeadDetail }) {
  if (resolvePipelineKontext(lead) !== 'hv_meldung') return null

  const ag = lead.auftraggeber
  const objekt = lead.kunden_objekte
  const adresse = objektAdresse(lead)
  const rolle = melderRolle(lead)
  const meta = meldungMeta(lead)
  const zeigtMelder = Boolean(
    lead.melder_name || lead.melder_email || lead.melder_telefon || lead.melder_einheit || rolle
  )

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="section-h"
        style={{
          margin: '2px 2px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span>HV Meldung</span>
        {meta ? (
          <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12.5 }}>{meta}</span>
        ) : null}
      </div>

      <div className="hvk-cards">
        <MockCard title="Auftraggeber (Verwaltung)" icon="briefcase">
          <div className="props">
            <MockProp label="Verwaltung">
              {ag?.id ? (
                <Link href={`/kunden/${ag.id}`} className="link">
                  {orgName(lead)}
                </Link>
              ) : (
                orgName(lead)
              )}
            </MockProp>
            {ag?.email?.trim() ? (
              <MockProp label="E-Mail" link>
                <a href={`mailto:${ag.email.trim()}`}>{ag.email.trim()}</a>
              </MockProp>
            ) : null}
          </div>
        </MockCard>

        <MockCard title="Objekt / Einheit" icon="building">
          <div className="props">
            <MockProp label="Objekt">
              {objekt?.id && (lead.auftraggeber_kunde_id || lead.kunde_id) ? (
                <Link
                  href={`/kunden/${lead.auftraggeber_kunde_id ?? lead.kunde_id}/objekte/${objekt.id}`}
                  className="link"
                >
                  {objekt.titel?.trim() || 'Objekt'}
                </Link>
              ) : (
                objekt?.titel?.trim() || '—'
              )}
            </MockProp>
            {adresse ? <MockProp label="Adresse">{adresse}</MockProp> : null}
            {lead.melder_einheit?.trim() ? (
              <MockProp label="Einheit">{lead.melder_einheit.trim()}</MockProp>
            ) : null}
          </div>
        </MockCard>

        <MockCard title="Melder" icon="user">
          <div className="props">
            <MockProp label="Name">
              {zeigtMelder ? lead.melder_name?.trim() || '—' : '—'}
            </MockProp>
            {rolle ? <MockProp label="Rolle">{rolle}</MockProp> : null}
            {lead.melder_telefon?.trim() ? (
              <MockProp label="Telefon" link>
                <a href={telHref(lead.melder_telefon)}>{lead.melder_telefon.trim()}</a>
              </MockProp>
            ) : null}
            {lead.melder_email?.trim() ? (
              <MockProp label="E-Mail" link>
                <a href={`mailto:${lead.melder_email.trim()}`}>{lead.melder_email.trim()}</a>
              </MockProp>
            ) : null}
          </div>
        </MockCard>
      </div>
    </div>
  )
}
