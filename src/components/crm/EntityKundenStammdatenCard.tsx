'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

export type EntityKundenStammDraft = {
  name: string
  telefon: string
  email: string
  plz: string
  ort: string
  strasse: string
  vorname?: string
  nachname?: string
  ansprechpartner?: string
  webseite?: string
  quelleLabel?: string
}

type Props = {
  kundeId?: string | null
  leadId?: string | null
  kundeTyp?: string | null
  initial: EntityKundenStammDraft
  /** @deprecated nicht in Stammdaten-View */
  quelle?: string | null
  /** @deprecated nicht in Stammdaten-View */
  eingegangen?: string | null
  onSaved?: () => void
  disabled?: boolean
  /** Auf Kunden-Detail: kein Link „Kundenakte“ */
  hideKundeLink?: boolean
  /** Stift → Stammdaten bearbeiten (Kunden-Detail) */
  onEdit?: () => void
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

/** Stammdaten als Identitätskarte + vollständige Felder. */
export function EntityKundenStammdatenCard({
  kundeId,
  kundeTyp,
  initial,
  hideKundeLink = false,
  disabled = false,
  onEdit,
}: Props) {
  const [draft, setDraft] = useState(initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const typLbl = kundentypLabel(kundeTyp)
  const adresse =
    [draft.strasse.trim(), [draft.plz.trim(), draft.ort.trim()].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ') || ''
  const showKundeLink = Boolean(kundeId?.trim() && !hideKundeLink)
  const tel = draft.telefon.trim()
  const mail = draft.email.trim()

  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">Stammdaten</div>
        {onEdit && !disabled ? (
          <MockBtn sm kind="ghost" icon="pencil" title="Bearbeiten" onClick={onEdit} />
        ) : null}
      </div>
      <div className="card-b">
        <div className="vgid">
          <div className="vgid-name">{draft.name.trim() || '—'}</div>
          {typLbl && typLbl !== '—' ? <div className="vgid-meta">{typLbl}</div> : null}
        </div>

        <div className="props mt-3">
          <PropRow label="Typ" value={typLbl} />
          {draft.vorname?.trim() || draft.nachname?.trim() ? (
            <PropRow
              label="Name"
              value={[draft.vorname?.trim(), draft.nachname?.trim()].filter(Boolean).join(' ')}
            />
          ) : null}
          <PropRow label="Adresse" value={adresse || '—'} />
          <PropRow
            label="Telefon"
            value={
              tel ? (
                <a className="link" href={telHref(tel)}>
                  {tel}
                </a>
              ) : (
                '—'
              )
            }
          />
          <PropRow
            label="E-Mail"
            value={
              mail ? (
                <a className="link" href={`mailto:${mail}`}>
                  {mail}
                </a>
              ) : (
                '—'
              )
            }
          />
          {draft.ansprechpartner?.trim() ? (
            <PropRow label="Ansprechpartner" value={draft.ansprechpartner.trim()} />
          ) : null}
          {draft.webseite?.trim() ? (
            <PropRow label="Webseite" value={draft.webseite.trim()} />
          ) : null}
          {draft.quelleLabel?.trim() ? (
            <PropRow label="Quelle" value={draft.quelleLabel.trim()} />
          ) : null}
        </div>

        {(showKundeLink || kundeId) && (
          <div className="vgid-chips mt-3">
            {showKundeLink ? (
              <Link className="vgid-chip ghost" href={`/kunden/${kundeId!.trim()}`}>
                <MockIcon ctx="default" n="user" size={14} />
                Kundenakte
              </Link>
            ) : null}
          </div>
        )}

        <StammdatenPortalZeile
          kundeId={kundeId}
          fallbackEmail={draft.email}
          variant="vgid"
        />
      </div>
    </div>
  )
}
