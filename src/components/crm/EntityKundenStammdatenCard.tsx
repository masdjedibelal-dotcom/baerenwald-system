'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

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
}

/** Stammdaten als Mock-Identitätskarte (`.vgid`) — Ansicht ohne Stift/Edit. */
export function EntityKundenStammdatenCard({
  kundeId,
  kundeTyp,
  initial,
  hideKundeLink = false,
}: Props) {
  const [draft, setDraft] = useState(initial)
  const isMobile = useIsMobile()

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const typLbl = kundentypLabel(kundeTyp)
  const region =
    draft.ort.trim() && draft.plz.trim()
      ? `${draft.ort.trim()} · ${draft.plz.trim()}`
      : draft.ort.trim() || draft.plz.trim() || ''
  const metaParts = [
    typLbl && typLbl !== '—' ? typLbl : null,
    region || null,
  ].filter(Boolean) as string[]

  const showKundeLink = Boolean(kundeId?.trim() && !hideKundeLink)

  return (
    <div className={cn('card', isMobile && 'stammdaten-card--mobile')}>
      <div className="card-h">
        <div className="card-title title">Stammdaten</div>
      </div>
      <div className="card-b">
        <div className={cn('vgid', isMobile && 'vgid--compact')}>
          <div className="vgid-name">{draft.name.trim() || '—'}</div>
          {metaParts.length > 0 ? (
            <div className="vgid-meta">{metaParts.join(' · ')}</div>
          ) : null}

          {isMobile ? (
            showKundeLink ? (
              <div className="vgid-chips vgid-chips--compact">
                <Link className="vgid-chip ghost" href={`/kunden/${kundeId!.trim()}`}>
                  <MockIcon ctx="default" n="user" size={14} />
                  Kundenakte
                </Link>
              </div>
            ) : null
          ) : (
            (draft.telefon.trim() || draft.email.trim() || showKundeLink) && (
              <div className="vgid-chips">
                {draft.telefon.trim() ? (
                  <a className="vgid-chip" href={telHref(draft.telefon)}>
                    <MockIcon ctx="default" n="phone" size={14} />
                    {draft.telefon.trim()}
                  </a>
                ) : null}
                {draft.email.trim() ? (
                  <a className="vgid-chip" href={`mailto:${draft.email.trim()}`}>
                    <MockIcon ctx="default" n="mail" size={14} />
                    {draft.email.trim()}
                  </a>
                ) : null}
                {showKundeLink ? (
                  <Link className="vgid-chip ghost" href={`/kunden/${kundeId!.trim()}`}>
                    <MockIcon ctx="default" n="user" size={14} />
                    Kundenakte
                  </Link>
                ) : null}
              </div>
            )
          )}

          <StammdatenPortalZeile
            kundeId={kundeId}
            fallbackEmail={draft.email}
            variant="vgid"
          />
        </div>
      </div>
    </div>
  )
}
