'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { kundenObjektStrasseZeile } from '@/lib/kunden-objekte'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail, OrgFreigabeStatus } from '@/lib/types'
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
    <span className="hvk-a">
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
    </span>
  )
}

/** Kompaktes HV-Aktionsband — Badges, Links, Quick-Call; Details im Anfrage-Phase-Sheet. */
export function HvMeldungKontextCards({ lead }: { lead: LeadDetail }) {
  if (resolvePipelineKontext(lead) !== 'hv_meldung') return null

  const ag = lead.auftraggeber
  const objekt = lead.kunden_objekte
  const strasse = objekt ? kundenObjektStrasseZeile(objekt) : null
  const objektLabel = strasse || objekt?.titel?.trim() || null
  const einheit = lead.melder_einheit?.trim() || null
  const agName = orgName(lead)
  const agKundeId = lead.auftraggeber_kunde_id ?? ag?.id ?? null
  const objektHref =
    objekt?.id && agKundeId ? `/kunden/${agKundeId}/objekte/${objekt.id}` : null

  const freigabe = lead.org_freigabe_status
    ? FREIGABE_BADGE[lead.org_freigabe_status]
    : null
  const notfallAutopass = (lead.hv_meldung_status ?? '').trim() === 'notmassnahme'
  const istAkut = leadIstAkut(lead)

  const melderTel = lead.melder_telefon?.trim() || lead.kontakt_telefon?.trim() || null
  const melderMail = lead.melder_email?.trim() || lead.kontakt_email?.trim() || null
  const melder = melderName(lead)

  return (
    <div className="card hvk-card hvk-card--band">
      <div className="hvk-band-top">
        <div className="hvk-head-l">
          <MockIcon ctx="default" n="inbox" size={14} aria-hidden />
          <span className="hvk-title">HV</span>
          {istAkut || notfallAutopass ? (
            <span className={cn('hvk-badge', 'hvk-badge--amber')}>Direktauftrag</span>
          ) : null}
          {freigabe && freigabe.tone !== 'muted' ? (
            <span className={cn('hvk-badge', `hvk-badge--${freigabe.tone}`)}>{freigabe.label}</span>
          ) : null}
        </div>
      </div>

      <div className="hvk-chips">
        <div className="hvk-chip">
          {ag?.id ? (
            <Link href={`/kunden/${ag.id}`} className="hvk-chip-main">
              {agName}
            </Link>
          ) : (
            <span className="hvk-chip-main">{agName}</span>
          )}
          <QaContact tel={ag?.telefon} mail={ag?.email} />
        </div>

        {objektLabel ? (
          <div className="hvk-chip">
            {objektHref ? (
              <Link href={objektHref} className="hvk-chip-main" title={[objektLabel, einheit].filter(Boolean).join(' · ')}>
                {objektLabel}
                {einheit ? <span className="hvk-chip-sub"> · {einheit}</span> : null}
              </Link>
            ) : (
              <span className="hvk-chip-main">
                {objektLabel}
                {einheit ? <span className="hvk-chip-sub"> · {einheit}</span> : null}
              </span>
            )}
          </div>
        ) : null}

        <div className="hvk-chip">
          <span className="hvk-chip-main">{melder}</span>
          <QaContact tel={melderTel} mail={melderMail} />
        </div>
      </div>
    </div>
  )
}
