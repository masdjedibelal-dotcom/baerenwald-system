'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'
import { PartnerEditSheet } from '@/components/handwerker/PartnerEditSheet'
import type { Handwerker } from '@/lib/types'

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

type GewerkOpt = { id: string; name: string; slug: string }

type Props = {
  handwerkerId: string
  initial: EntityHandwerkerStammDraft
  /** Volle Zeile für EditorSheet */
  editHandwerker?: Handwerker | null
  gewerkeOptionen?: GewerkOpt[]
  portalGesperrt?: boolean
  onInvite?: () => void
  disabled?: boolean
  /**
   * @deprecated Internes EditorSheet — wenn gesetzt, überschreibt Sheet.
   */
  onEdit?: () => void
  onSaved?: () => void
}

/** Stammdaten-View + Bearbeiten über EditorSheet (mobil Bottom, Desktop Slide-over). */
export function EntityHandwerkerStammdatenCard({
  handwerkerId,
  initial,
  editHandwerker = null,
  gewerkeOptionen = [],
  portalGesperrt = false,
  onInvite,
  disabled = false,
  onEdit,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  const tel = draft.telefon.trim()
  const mail = draft.email.trim()
  const firma = draft.firma?.trim() || ''
  const gf = draft.geschaeftsfuehrer?.trim() || ''
  const gewerk = draft.gewerkLabel?.trim() || ''
  const canSheet = Boolean(editHandwerker) && !disabled
  const showPencil = (canSheet || Boolean(onEdit)) && !disabled

  function beginEdit() {
    if (onEdit) {
      onEdit()
      return
    }
    setSheetOpen(true)
  }

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Stammdaten</div>
          {showPencil ? (
            <MockBtn sm kind="ghost" icon="pencil" title="Bearbeiten" onClick={beginEdit} />
          ) : null}
        </div>
        <div className="card-b">
          <div className="vgid">
            <div className="vgid-name">{draft.displayName.trim() || '—'}</div>
            {gewerk ? <div className="vgid-meta">{gewerk}</div> : null}
          </div>

          <div className="detail-soft-block">
            <div className="props">
              {firma && firma !== draft.displayName.trim() ? (
                <PropRow label="Betrieb" value={firma} />
              ) : null}
              <PropRow label="Geschäftsführer" value={gf || '—'} />
              <PropRow label="Gewerk" value={gewerk || '—'} />
              <PropRow label="Adresse" value={draft.adresse.trim() || '—'} />
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
          </div>

          <StammdatenPortalZeile
            handwerkerId={handwerkerId}
            fallbackEmail={draft.email}
            gesperrt={portalGesperrt}
            onInvite={onInvite}
            variant="vgid"
          />
        </div>
      </div>

      {!onEdit && editHandwerker ? (
        <PartnerEditSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          handwerker={editHandwerker}
          gewerkeOptionen={gewerkeOptionen}
          focus="stamm"
          onSaved={onSaved}
        />
      ) : null}
    </>
  )
}
