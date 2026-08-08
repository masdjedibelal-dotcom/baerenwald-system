'use client'

import type { ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
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

export type EntityHandwerkerStammDraft = {
  displayName: string
  firma?: string
  geschaeftsfuehrer?: string
  gewerkLabel?: string
  telefon: string
  email: string
  adresse: string
}

type Props = {
  handwerkerId: string
  initial: EntityHandwerkerStammDraft
  portalGesperrt?: boolean
  onInvite?: () => void
  disabled?: boolean
  onEdit?: () => void
}

/** Stammdaten wie Kundenkarte: Identität + vollständige Felder. */
export function EntityHandwerkerStammdatenCard({
  handwerkerId,
  initial,
  portalGesperrt = false,
  onInvite,
  disabled = false,
  onEdit,
}: Props) {
  const tel = initial.telefon.trim()
  const mail = initial.email.trim()
  const firma = initial.firma?.trim() || ''
  const gf = initial.geschaeftsfuehrer?.trim() || ''
  const gewerk = initial.gewerkLabel?.trim() || ''

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
          <div className="vgid-name">{initial.displayName.trim() || '—'}</div>
          {gewerk ? <div className="vgid-meta">{gewerk}</div> : null}
        </div>

        <div className="props mt-3">
          {firma && firma !== initial.displayName.trim() ? (
            <PropRow label="Betrieb" value={firma} />
          ) : null}
          <PropRow label="Geschäftsführer" value={gf || '—'} />
          <PropRow label="Gewerk" value={gewerk || '—'} />
          <PropRow label="Adresse" value={initial.adresse.trim() || '—'} />
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
        </div>

        <StammdatenPortalZeile
          handwerkerId={handwerkerId}
          fallbackEmail={initial.email}
          gesperrt={portalGesperrt}
          onInvite={onInvite}
          variant="vgid"
        />
      </div>
    </div>
  )
}
