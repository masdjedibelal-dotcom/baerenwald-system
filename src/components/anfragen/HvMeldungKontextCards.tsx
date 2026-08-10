'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { resolveLeadKunde } from '@/lib/lead-display-helpers'
import { resolvePipelineKontext } from '@/lib/leads/pipeline-kontext'
import type { LeadDetail, OrgFreigabeStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import { leadIstAkut } from '@/lib/anfragen/anfrage-akut-schwelle'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

function melderName(lead: LeadDetail): string {
  const n = lead.melder_name?.trim()
  if (n) return n
  const k = resolveLeadKunde(lead.kunden)
  const name = k?.name?.trim()
  if (name) return name
  return lead.kontakt_name?.trim() || '—'
}

function melderAdresse(lead: LeadDetail): string {
  const k = resolveLeadKunde(lead.kunden)
  const strasse = [k?.strasse?.trim(), k?.hausnummer?.trim()].filter(Boolean).join(' ')
  const plzOrt = [k?.plz?.trim() || lead.plz?.trim(), k?.ort?.trim()].filter(Boolean).join(' ')
  const einheit = lead.melder_einheit?.trim()
  return [strasse, plzOrt, einheit ? `Einheit ${einheit}` : null].filter(Boolean).join(', ') || '—'
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

/** Eine Card: Melder + Leistungsort-Anschrift (HV steckt schon in Stammdaten). */
export function HvMeldungKontextCards({ lead }: { lead: LeadDetail }) {
  if (resolvePipelineKontext(lead) !== 'hv_meldung') return null

  const objekt = lead.kunden_objekte
  const agKundeId = lead.auftraggeber_kunde_id ?? lead.auftraggeber?.id ?? null
  const objektHref =
    objekt?.id && agKundeId ? `/kunden/${agKundeId}/objekte/${objekt.id}` : null
  const objektTitel = objekt?.titel?.trim() || null

  const freigabe = lead.org_freigabe_status
    ? FREIGABE_BADGE[lead.org_freigabe_status]
    : null
  const notfallAutopass = (lead.hv_meldung_status ?? '').trim() === 'notmassnahme'
  const istAkut = leadIstAkut(lead)

  const melderTel = lead.melder_telefon?.trim() || lead.kontakt_telefon?.trim() || null
  const melderMail = lead.melder_email?.trim() || lead.kontakt_email?.trim() || null

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">Melder</div>
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
          <PropRow label="Name" value={melderName(lead)} />
          <PropRow
            label="Telefon"
            value={
              melderTel ? (
                <a className="link" href={telHref(melderTel)}>
                  {melderTel}
                </a>
              ) : (
                '—'
              )
            }
          />
          <PropRow
            label="E-Mail"
            value={
              melderMail ? (
                <a className="link" href={`mailto:${melderMail}`}>
                  {melderMail}
                </a>
              ) : (
                '—'
              )
            }
          />
          <PropRow label="Adresse" value={melderAdresse(lead)} />
        </div>

        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-2 text-[length:var(--fs-meta)] font-semibold text-[var(--text-3)]">
            Leistungsort
            {objektTitel ? (
              <>
                {' · '}
                {objektHref ? (
                  <Link href={objektHref} className="link font-semibold">
                    {objektTitel}
                  </Link>
                ) : (
                  <span className="font-semibold text-[var(--text)]">{objektTitel}</span>
                )}
              </>
            ) : null}
          </div>
          <div className="props">
            <PropRow label="Straße" value={objekt?.strasse?.trim() || '—'} />
            <PropRow label="Hausnummer" value={objekt?.hausnummer?.trim() || '—'} />
            <PropRow label="PLZ" value={objekt?.plz?.trim() || '—'} />
            <PropRow label="Ort" value={objekt?.ort?.trim() || '—'} />
          </div>
        </div>
      </div>
    </div>
  )
}
