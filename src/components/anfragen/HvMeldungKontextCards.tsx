'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail, OrgFreigabeStatus } from '@/lib/types'
import { formatLeadListDatum } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { leadIstAkut } from '@/lib/anfragen/anfrage-akut-schwelle'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

function orgName(lead: LeadDetail): string {
  const ag = lead.auftraggeber
  if (!ag) return '—'
  return (ag.org_anzeigename ?? ag.name ?? '').trim() || '—'
}

function hvReferenz(lead: LeadDetail): string {
  const d = lead.created_at ? new Date(lead.created_at) : null
  const y = d && !Number.isNaN(d.getTime()) ? d.getFullYear() : new Date().getFullYear()
  const mmdd =
    d && !Number.isNaN(d.getTime())
      ? `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      : lead.id.replace(/-/g, '').slice(0, 4).toUpperCase()
  return `HV-${y}-${mmdd}`
}

function meldungMeta(lead: LeadDetail): string {
  if (!lead.created_at) return ''
  const day = formatLeadListDatum(lead.created_at)
  const t = new Date(lead.created_at)
  const time = Number.isNaN(t.getTime())
    ? ''
    : t.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return time ? `gemeldet ${day} ${time}` : `gemeldet ${day}`
}

function melderRolle(lead: LeadDetail): string {
  if (lead.erfassung_von === 'melder' || lead.kanal === 'hv_melder_link') return 'Mieter'
  if (lead.anlass === 'meldung') return 'Mieter'
  return 'Melder'
}

function melderName(lead: LeadDetail): string {
  const n = lead.melder_name?.trim()
  if (n) return n
  const k = lead.kunden
  if (k && typeof k === 'object') {
    const name = (k as { name?: string | null }).name?.trim()
    if (name) return name
  }
  return lead.kontakt_name?.trim() || '—'
}

function meldungstext(lead: LeadDetail): string | null {
  const direkt = lead.kontakt_nachricht?.trim()
  if (direkt) return direkt
  const fd =
    lead.funnel_daten && typeof lead.funnel_daten === 'object' && !Array.isArray(lead.funnel_daten)
      ? (lead.funnel_daten as Record<string, unknown>)
      : null
  for (const key of ['meldungstext', 'beschreibung', 'nachricht', 'text']) {
    const v = fd?.[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

const FREIGABE_BADGE: Record<
  OrgFreigabeStatus,
  { label: string; tone: 'yel' | 'grn' | 'muted' | 'red' }
> = {
  ausstehend: { label: 'Ausstehend', tone: 'yel' },
  freigegeben: { label: 'Freigegeben', tone: 'grn' },
  nicht_noetig: { label: 'Nicht nötig', tone: 'muted' },
  abgelehnt: { label: 'Abgelehnt', tone: 'red' },
}

function QaContact({ tel, mail }: { tel?: string | null; mail?: string | null }) {
  const t = tel?.trim()
  const m = mail?.trim()
  if (!t && !m) return null
  return (
    <div className="hvk-a">
      {t ? (
        <a className="qa-btn" href={telHref(t)} title="Anrufen" aria-label="Anrufen">
          <MockIcon ctx="row" n="phone" size={14} />
        </a>
      ) : null}
      {m ? (
        <a className="qa-btn" href={`mailto:${m}`} title="E-Mail" aria-label="E-Mail">
          <MockIcon ctx="row" n="mail" size={14} />
        </a>
      ) : null}
    </div>
  )
}

/** Mock HV-Meldung — Herkunftsband; nur bei Pipeline-Kontext hv_meldung. */
export function HvMeldungKontextCards({ lead }: { lead: LeadDetail }) {
  if (resolvePipelineKontext(lead) !== 'hv_meldung') return null

  const ag = lead.auftraggeber
  const objekt = lead.kunden_objekte
  const strasse = objekt ? kundenObjektStrasseZeile(objekt) : null
  const objektHaupt = strasse || objekt?.titel?.trim() || '—'
  const plzOrt = objekt ? [objekt.plz, objekt.ort].filter(Boolean).join(' ') : ''
  const einheit = lead.melder_einheit?.trim() || objekt?.einheiten_hinweis?.trim() || ''
  const objektSub = [plzOrt, einheit].filter(Boolean).join(' · ')

  const agName = orgName(lead)
  const agAnsprech = ag?.ansprechpartner?.trim() || null
  const agKundeId = lead.auftraggeber_kunde_id ?? ag?.id ?? null
  const objektHref =
    objekt?.id && agKundeId ? `/kunden/${agKundeId}/objekte/${objekt.id}` : null

  const quote = meldungstext(lead)
  const ref = hvReferenz(lead)
  const meta = meldungMeta(lead)
  const freigabe = lead.org_freigabe_status
    ? FREIGABE_BADGE[lead.org_freigabe_status]
    : null
  const notfallAutopass = (lead.hv_meldung_status ?? '').trim() === 'notmassnahme'
  const istAkut = leadIstAkut(lead)

  const melderTel = lead.melder_telefon?.trim() || lead.kontakt_telefon?.trim() || null
  const melderMail = lead.melder_email?.trim() || lead.kontakt_email?.trim() || null

  return (
    <div className="card hvk-card" style={{ marginBottom: 14 }}>
      <div className="hvk-head">
        <div className="hvk-head-l">
          <MockIcon ctx="default" n="inbox" size={15} aria-hidden />
          <span className="hvk-title">HV-Meldung</span>
          {istAkut ? (
            <span className={cn('hvk-badge', 'hvk-badge--red')}>Akut</span>
          ) : null}
          {freigabe ? (
            <span className={cn('hvk-badge', `hvk-badge--${freigabe.tone}`)}>{freigabe.label}</span>
          ) : null}
        </div>
        <span className="hvk-ref">
          {ref}
          {meta ? ` · ${meta}` : ''}
        </span>
      </div>

      <div className="hvk-band">
        <div className="hvk-row">
          <div className="hvk-ic" aria-hidden>
            <MockIcon ctx="row" n="briefcase" size={14} />
          </div>
          <div className="hvk-txt">
            <span className="hvk-k">Auftraggeber</span>
            {ag?.id ? (
              <Link href={`/kunden/${ag.id}`} className="hvk-h hvk-h--link">
                {agName}
              </Link>
            ) : (
              <span className="hvk-h">{agName}</span>
            )}
            {agAnsprech ? <span className="hvk-s">Sachbearbeiterin: {agAnsprech}</span> : null}
          </div>
          <QaContact tel={ag?.telefon} mail={ag?.email} />
        </div>

        <div className="hvk-row">
          <div className="hvk-ic" aria-hidden>
            <MockIcon ctx="row" n="building" size={14} />
          </div>
          <div className="hvk-txt">
            <span className="hvk-k">Objekt</span>
            {objektHref ? (
              <Link href={objektHref} className="hvk-h hvk-h--link">
                {objektHaupt}
              </Link>
            ) : (
              <span className="hvk-h">{objektHaupt}</span>
            )}
            {objektSub ? <span className="hvk-s">{objektSub}</span> : null}
          </div>
        </div>

        <div className="hvk-row">
          <div className="hvk-ic" aria-hidden>
            <MockIcon ctx="row" n="user" size={14} />
          </div>
          <div className="hvk-txt">
            <span className="hvk-k">Melder</span>
            <span className="hvk-h">{melderName(lead)}</span>
            <span className="hvk-s">{melderRolle(lead)}</span>
          </div>
          <QaContact tel={melderTel} mail={melderMail} />
        </div>
      </div>

      {quote ? <blockquote className="hvk-quote">{quote}</blockquote> : null}

      {notfallAutopass ? (
        <p className="hvk-notfall">Per Notfall-Regel ohne HV-Freigabe gestartet.</p>
      ) : null}
    </div>
  )
}
