'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { KundeModal } from '@/components/kunden/KundeModal'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import { updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { splitStrasseHausnummer } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'

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
  /** Volle Kundendaten für EditorSheet (z. B. Kunden-Detail); sonst aus draft gebaut */
  editKunde?: Kunde | null
  /** @deprecated nicht in Stammdaten-View */
  quelle?: string | null
  /** @deprecated nicht in Stammdaten-View */
  eingegangen?: string | null
  onSaved?: (saved?: Partial<Kunde>) => void
  disabled?: boolean
  /** Auf Kunden-Detail: kein Link „Kundenakte“ */
  hideKundeLink?: boolean
  /**
   * @deprecated Internes EditorSheet — nicht mehr nötig.
   * Wenn gesetzt: Stift ruft das auf statt Sheet (Legacy).
   */
  onEdit?: () => void
  /** Optionaler Hinweis über dem View-Body (z. B. fehlende Rechnungsfelder) */
  banner?: ReactNode
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

function draftToEditKunde(
  kundeId: string,
  draft: EntityKundenStammDraft,
  kundeTyp?: string | null
): Kunde {
  const split = splitStrasseHausnummer(draft.strasse.trim())
  return {
    id: kundeId,
    name: draft.name.trim() || '—',
    vorname: draft.vorname?.trim() || null,
    nachname: draft.nachname?.trim() || null,
    email: draft.email.trim() || null,
    telefon: draft.telefon.trim() || null,
    adresse: draft.strasse.trim() || null,
    strasse: split.strasse || null,
    hausnummer: split.hausnummer || null,
    plz: draft.plz.trim() || null,
    ort: draft.ort.trim() || null,
    typ: (kundeTyp?.trim() || 'privat').toLowerCase(),
    notizen: null,
    created_at: '',
    ansprechpartner: draft.ansprechpartner?.trim() || null,
    webseite: draft.webseite?.trim() || null,
  }
}

/** Stammdaten-View + Bearbeiten über EditorSheet (mobil Bottom, Desktop Slide-over). */
export function EntityKundenStammdatenCard({
  kundeId,
  leadId,
  kundeTyp,
  initial,
  editKunde,
  hideKundeLink = false,
  disabled = false,
  onEdit,
  onSaved,
  banner,
}: Props) {
  const [draft, setDraft] = useState(initial)
  const [typ, setTyp] = useState(kundeTyp ?? null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setDraft(initial)
    setTyp(kundeTyp ?? null)
  }, [initial, kundeTyp])

  const canEdit = Boolean(kundeId?.trim()) && !disabled
  const showPencil = canEdit || (Boolean(onEdit) && !disabled)

  const modalKunde = useMemo(() => {
    const id = kundeId?.trim()
    if (!id) return null
    return editKunde ?? draftToEditKunde(id, draft, typ)
  }, [kundeId, editKunde, draft, typ])

  const typLbl = kundentypLabel(typ)
  const adresse =
    [draft.strasse.trim(), [draft.plz.trim(), draft.ort.trim()].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ') || ''
  const showKundeLink = Boolean(kundeId?.trim() && !hideKundeLink)
  const tel = draft.telefon.trim()
  const mail = draft.email.trim()

  function beginEdit() {
    if (onEdit) {
      onEdit()
      return
    }
    setSheetOpen(true)
  }

  const viewBody = (
    <>
      {banner}
      <div className="vgid">
        <div className="vgid-name">{draft.name.trim() || '—'}</div>
        {typLbl && typLbl !== '—' ? <div className="vgid-meta">{typLbl}</div> : null}
      </div>

      <div className="detail-soft-block">
        <div className="props">
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
      </div>

      {kundeId?.trim() ? (
        <div className="stammdaten-footer">
          <div className="stammdaten-footer__row">
            <div className="stammdaten-footer__status">
              <StammdatenPortalZeile
                kundeId={kundeId}
                fallbackEmail={draft.email}
                variant="vgid"
                hideLogin
              />
            </div>
            <div className="stammdaten-footer__login">
              <PortalLoginIconButton
                kundeId={kundeId}
                label="Kundenportal öffnen"
                withLabel
              />
            </div>
          </div>
          {showKundeLink ? (
            <div className="stammdaten-footer__secondary">
              <Link className="vgid-chip ghost vgid-chip--secondary" href={`/kunden/${kundeId.trim()}`}>
                <MockIcon ctx="default" n="user" size={14} />
                Kundenakte
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Stammdaten</div>
          {showPencil ? (
            <MockBtn sm kind="secondary" icon="pencil" title="Bearbeiten" onClick={beginEdit} />
          ) : null}
        </div>
        <div className="card-b">{viewBody}</div>
      </div>

      {!onEdit && modalKunde ? (
        <KundeModal
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          editKunde={modalKunde}
          stayOnPage
          revalidateAnfrageId={leadId?.trim() || undefined}
          onSaved={(_id, saved) => {
            if (saved) {
              const nextName =
                saved.name?.trim() ||
                [saved.vorname?.trim(), saved.nachname?.trim()].filter(Boolean).join(' ') ||
                draft.name
              const nextStrasse = [saved.strasse?.trim(), saved.hausnummer?.trim()]
                .filter(Boolean)
                .join(' ')
              const nextDraft: EntityKundenStammDraft = {
                ...draft,
                name: nextName,
                vorname: saved.vorname ?? draft.vorname,
                nachname: saved.nachname ?? draft.nachname,
                telefon: saved.telefon ?? draft.telefon,
                email: saved.email ?? draft.email,
                plz: saved.plz ?? draft.plz,
                ort: saved.ort ?? draft.ort,
                strasse: nextStrasse || draft.strasse,
              }
              setDraft(nextDraft)
              if (saved.typ) setTyp(saved.typ)

              const lid = leadId?.trim()
              if (lid) {
                void updateLeadKontakt(lid, {
                  kontakt_name: nextDraft.name,
                  kontakt_telefon: nextDraft.telefon || null,
                  kontakt_email: nextDraft.email || null,
                  plz: nextDraft.plz || null,
                  kundentyp: saved.typ ?? typ ?? undefined,
                })
              }
            }
            onSaved?.(saved)
          }}
        />
      ) : null}
    </>
  )
}
