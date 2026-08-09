'use client'

import type { ReactNode } from 'react'
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

function PropRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') {
    return (
      <div className="prop">
        <div className="prop-l">{label}</div>
        <div className="prop-v">—</div>
      </div>
    )
  }
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{value}</div>
    </div>
  )
}

function ContactValue({ tel, mail }: { tel?: string | null; mail?: string | null }) {
  const t = tel?.trim()
  const m = mail?.trim()
  if (!t && !m) return '—'
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {t ? (
        <a className="link" href={telHref(t)}>
          {t}
        </a>
      ) : null}
      {m ? (
        <a className="link" href={`mailto:${m}`}>
          {m}
        </a>
      ) : null}
    </span>
  )
}

/** HV-Kontext: normale Cards wie Stammdaten — Hausverwaltung, Anschrift, Melder. */
export function HvMeldungKontextCards({ lead }: { lead: LeadDetail }) {
  if (resolvePipelineKontext(lead) !== 'hv_meldung') return null

  const ag = lead.auftraggeber
  const objekt = lead.kunden_objekte
  const strasse = objekt ? kundenObjektStrasseZeile(objekt) : null
  const plz = objekt?.plz?.trim() || null
  const ort = objekt?.ort?.trim() || null
  const objektTitel = objekt?.titel?.trim() || null
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
    <div className="hvk-cards">
      <div className="card">
        <div className="card-h">
          <div className="card-title title">
            <MockIcon ctx="default" n="inbox" size={14} aria-hidden />
            Hausverwaltung
          </div>
          <div className="inline-flex flex-wrap items-center gap-1">
            {istAkut || notfallAutopass ? (
              <span className={cn('hvk-badge', 'hvk-badge--yel')}>Direktauftrag</span>
            ) : null}
            {freigabe && freigabe.tone !== 'muted' ? (
              <span className={cn('hvk-badge', `hvk-badge--${freigabe.tone}`)}>
                {freigabe.label}
              </span>
            ) : null}
          </div>
        </div>
        <div className="card-b">
          <div className="props">
            <PropRow
              label="Name"
              value={
                ag?.id ? (
                  <Link href={`/kunden/${ag.id}`} className="link">
                    {agName}
                  </Link>
                ) : (
                  agName
                )
              }
            />
            <PropRow
              label="Telefon"
              value={
                ag?.telefon?.trim() ? (
                  <a className="link" href={telHref(ag.telefon)}>
                    {ag.telefon.trim()}
                  </a>
                ) : (
                  '—'
                )
              }
            />
            <PropRow
              label="E-Mail"
              value={
                ag?.email?.trim() ? (
                  <a className="link" href={`mailto:${ag.email.trim()}`}>
                    {ag.email.trim()}
                  </a>
                ) : (
                  '—'
                )
              }
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="card-title title">Anschrift</div>
        </div>
        <div className="card-b">
          <div className="props">
            {objektTitel ? (
              <PropRow
                label="Objekt"
                value={
                  objektHref ? (
                    <Link href={objektHref} className="link">
                      {objektTitel}
                    </Link>
                  ) : (
                    objektTitel
                  )
                }
              />
            ) : null}
            <PropRow label="Straße" value={strasse || '—'} />
            <PropRow label="PLZ" value={plz || '—'} />
            <PropRow label="Ort" value={ort || '—'} />
            {einheit ? <PropRow label="Einheit" value={einheit} /> : null}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div className="card-title title">Melder</div>
        </div>
        <div className="card-b">
          <div className="props">
            <PropRow label="Name" value={melder} />
            <PropRow label="Kontakt" value={<ContactValue tel={melderTel} mail={melderMail} />} />
          </div>
        </div>
      </div>
    </div>
  )
}
