'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { KundeModal } from '@/components/kunden/KundeModal'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'
import { PortalLoginIconButton } from '@/components/portal/PortalLoginIconButton'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { saveKunde } from '@/app/actions/kunden'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { splitStrasseHausnummer } from '@/lib/kunde-stammdaten'
import type { Kunde } from '@/lib/types'
import { toast } from '@/components/ui/app-toast'
import { TOAST } from '@/lib/copy'

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
  /** Hinweis direkt unter Portal-/Kundenakte-Buttons (z. B. Direktauftrag-Schwelle) */
  footerBanner?: ReactNode
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
  const { strasse, hausnummer } = splitStrasseHausnummer(draft.strasse)
  return {
    id: kundeId,
    name: draft.name,
    vorname: draft.vorname ?? null,
    nachname: draft.nachname ?? null,
    telefon: draft.telefon || null,
    email: draft.email || null,
    plz: draft.plz || null,
    ort: draft.ort || null,
    strasse: strasse || null,
    hausnummer: hausnummer || null,
    typ: (kundeTyp as Kunde['typ']) ?? null,
  } as Kunde
}

/** Stammdaten-View: Name/Tel/E-Mail inline; Adresse & Rest über Sheet. */
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
  footerBanner,
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

  function beginEdit() {
    if (onEdit) {
      onEdit()
      return
    }
    setSheetOpen(true)
  }

  async function saveInlineField(
    patch: Partial<Pick<EntityKundenStammDraft, 'name' | 'telefon' | 'email'>>
  ) {
    const next = { ...draft, ...patch }
    setDraft(next)
    const kid = kundeId?.trim()
    const lid = leadId?.trim()
    if (kid) {
      const { strasse, hausnummer } = splitStrasseHausnummer(next.strasse)
      const r = await saveKunde(
        {
          name: next.name,
          vorname: next.vorname,
          nachname: next.nachname,
          telefon: next.telefon || null,
          email: next.email || null,
          plz: next.plz || null,
          ort: next.ort || null,
          strasse: strasse || null,
          hausnummer: hausnummer || null,
          typ: (typ ?? 'privat') as string,
          stammPflicht: false,
        },
        kid,
        lid ? { revalidateAnfrageIds: [lid] } : undefined
      )
      if (!r.ok) {
        toast.systemError(r)
        setDraft(draft)
        return
      }
    }
    if (lid) {
      const r = await updateLeadKontakt(lid, {
        kontakt_name: next.name,
        kontakt_telefon: next.telefon || null,
        kontakt_email: next.email || null,
        plz: next.plz || null,
        kundentyp: typ ?? undefined,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
    }
    toast.autoSaved({ label: 'Kontakt' })
    onSaved?.(next as Partial<Kunde>)
  }

  const viewBody = (
    <>
      {banner}
      <div className="vgid">
        {canEdit ? (
          <SheetEditableField
            kind="text"
            label="Name"
            value={draft.name}
            placeholder="Name"
            editMode="inline"
            sheetContext="detail"
            onSave={(v) => void saveInlineField({ name: v })}
            className="vgid-name-field"
          />
        ) : (
          <div className="vgid-name">{draft.name.trim() || '—'}</div>
        )}
        {typLbl && typLbl !== '—' ? <div className="vgid-meta">{typLbl}</div> : null}
      </div>

      <div className="detail-soft-block">
        <div className="props">
          <PropRow label="Typ" value={typLbl} />
          {draft.vorname?.trim() || draft.nachname?.trim() ? (
            <PropRow
              label="Vor-/Nachname"
              value={[draft.vorname?.trim(), draft.nachname?.trim()].filter(Boolean).join(' ')}
            />
          ) : null}
          <PropRow label="Adresse" value={adresse || '—'} />
          {canEdit ? (
            <>
              <div className="prop prop--inline-edit">
                <SheetEditableField
                  kind="tel"
                  label="Telefon"
                  value={draft.telefon}
                  placeholder="Telefon"
                  editMode="inline"
                  sheetContext="detail"
                  onSave={(v) => void saveInlineField({ telefon: v })}
                />
              </div>
              <div className="prop prop--inline-edit">
                <SheetEditableField
                  kind="email"
                  label="E-Mail"
                  value={draft.email}
                  placeholder="E-Mail"
                  editMode="inline"
                  sheetContext="detail"
                  onSave={(v) => void saveInlineField({ email: v })}
                />
              </div>
            </>
          ) : (
            <>
              <PropRow
                label="Telefon"
                value={
                  draft.telefon.trim() ? (
                    <a className="link" href={telHref(draft.telefon)}>
                      {draft.telefon.trim()}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
              <PropRow
                label="E-Mail"
                value={
                  draft.email.trim() ? (
                    <a className="link" href={`mailto:${draft.email.trim()}`}>
                      {draft.email.trim()}
                    </a>
                  ) : (
                    '—'
                  )
                }
              />
            </>
          )}
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
      {footerBanner ? (
        <div className="stammdaten-footer-banner">{footerBanner}</div>
      ) : null}
    </>
  )

  return (
    <>
      <MockCard
        title="Stammdaten"
        actions={
          showPencil ? (
            <MockBtn sm kind="secondary" icon="pencil" title="Bearbeiten" onClick={beginEdit} />
          ) : null
        }
      >
        {viewBody}
      </MockCard>

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
