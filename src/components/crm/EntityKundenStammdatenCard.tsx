'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useLocalTransition } from '@/components/ui/action-busy'
import { InlineEditField, InlineEditSection } from '@/components/ui/InlineEditSection'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { saveKunde } from '@/app/actions/kunden'
import { updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import {
  istKundeFirmaPflichtTyp,
  istKundeHausverwaltungTyp,
  istKundeNurGewerbeTyp,
  splitStrasseHausnummer,
} from '@/lib/kunde-stammdaten'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

const TYP_OPTIONS = [
  { value: 'privat', label: 'Privat' },
  { value: 'gewerbe', label: 'Gewerbe' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

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

type EditForm = {
  typ: string
  firmaName: string
  vorname: string
  nachname: string
  strasse: string
  hausnummer: string
  plz: string
  ort: string
  telefon: string
  email: string
  ansprechpartner: string
  webseite: string
}

function draftToEditForm(initial: EntityKundenStammDraft, kundeTyp?: string | null): EditForm {
  const typ = (kundeTyp?.trim() || 'privat').toLowerCase()
  const split = splitStrasseHausnummer(initial.strasse.trim())
  const firmaPflicht = istKundeFirmaPflichtTyp(typ)
  return {
    typ,
    firmaName: firmaPflicht ? initial.name.trim() : '',
    vorname: initial.vorname?.trim() || '',
    nachname: initial.nachname?.trim() || (!firmaPflicht ? initial.name.trim() : ''),
    strasse: split.strasse,
    hausnummer: split.hausnummer ?? '',
    plz: initial.plz.trim(),
    ort: initial.ort.trim(),
    telefon: initial.telefon.trim(),
    email: initial.email.trim(),
    ansprechpartner: initial.ansprechpartner?.trim() || '',
    webseite: initial.webseite?.trim() || '',
  }
}

function editFormToDraft(f: EditForm): EntityKundenStammDraft {
  const firmaPflicht = istKundeFirmaPflichtTyp(f.typ)
  const name = firmaPflicht
    ? f.firmaName.trim()
    : [f.vorname.trim(), f.nachname.trim()].filter(Boolean).join(' ') || f.nachname.trim()
  return {
    name,
    telefon: f.telefon,
    email: f.email,
    plz: f.plz,
    ort: f.ort,
    strasse: [f.strasse.trim(), f.hausnummer.trim()].filter(Boolean).join(' '),
    vorname: f.vorname,
    nachname: f.nachname,
    ansprechpartner: f.ansprechpartner,
    webseite: f.webseite,
  }
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
  /**
   * Externes Bearbeiten (Kunden-Detail mit eigenem Formular).
   * Wenn gesetzt: Stift ruft das auf statt Inline-Edit.
   */
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

/** Stammdaten als Identitätskarte + vollständige Felder (optional Inline-Edit). */
export function EntityKundenStammdatenCard({
  kundeId,
  leadId,
  kundeTyp,
  initial,
  hideKundeLink = false,
  disabled = false,
  onEdit,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(initial)
  const [typ, setTyp] = useState(kundeTyp ?? null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(() => draftToEditForm(initial, kundeTyp))
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useLocalTransition()

  useEffect(() => {
    setDraft(initial)
    setTyp(kundeTyp ?? null)
    if (!editing) setEditForm(draftToEditForm(initial, kundeTyp))
  }, [initial, kundeTyp, editing])

  const canInlineEdit = Boolean(kundeId?.trim()) && !disabled && !onEdit
  const showExternalEdit = Boolean(onEdit) && !disabled

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
    setErr(null)
    setEditForm(draftToEditForm(draft, typ))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setErr(null)
    setEditForm(draftToEditForm(draft, typ))
  }

  function save() {
    const id = kundeId?.trim()
    if (!id) return
    setErr(null)
    startTransition(async () => {
      const firmaPflicht = istKundeFirmaPflichtTyp(editForm.typ)
      const r = await saveKunde(
        {
          typ: editForm.typ,
          name: firmaPflicht ? editForm.firmaName : null,
          vorname: editForm.vorname || null,
          nachname: editForm.nachname || null,
          strasse: editForm.strasse,
          hausnummer: editForm.hausnummer,
          telefon: editForm.telefon || null,
          email: editForm.email || null,
          plz: editForm.plz || null,
          ort: editForm.ort || null,
          webseite: editForm.webseite || null,
          ansprechpartner: editForm.ansprechpartner || null,
        },
        id,
        leadId?.trim() ? { revalidateAnfrageIds: [leadId.trim()] } : undefined
      )
      if (!r.ok) {
        setErr(r.message)
        toast.error(r.message)
        return
      }

      const nextDraft = editFormToDraft(editForm)
      if (leadId?.trim()) {
        await updateLeadKontakt(leadId.trim(), {
          kontakt_name: nextDraft.name,
          kontakt_telefon: nextDraft.telefon || null,
          kontakt_email: nextDraft.email || null,
          plz: nextDraft.plz || null,
          kundentyp: editForm.typ,
        })
      }

      setDraft(nextDraft)
      setTyp(editForm.typ)
      setEditing(false)
      toast.success('Stammdaten gespeichert')
      onSaved?.()
    })
  }

  const viewBody = (
    <>
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
    </>
  )

  /* Kunden-Detail: Stift → externes Formular */
  if (showExternalEdit && !editing) {
    return (
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Stammdaten</div>
          <MockBtn sm kind="ghost" icon="pencil" title="Bearbeiten" onClick={beginEdit} />
        </div>
        <div className="card-b">{viewBody}</div>
      </div>
    )
  }

  /* Vorgang-Details: Inline-Edit mit Stift */
  if (canInlineEdit || editing) {
    return (
      <InlineEditSection
        title="Stammdaten"
        editing={editing}
        onStartEdit={beginEdit}
        onCancel={cancelEdit}
        onSave={save}
        saving={pending}
        disabled={disabled || !kundeId?.trim()}
      >
        {err ? (
          <p className="mb-2 text-[length:var(--fs-text)] text-status-cancel-text">{err}</p>
        ) : null}
        {editing ? (
          <div className="props">
            <InlineEditField label="Typ" editing value={kundentypLabel(editForm.typ)}>
              <select
                className="input"
                value={editForm.typ}
                onChange={(e) => setEditForm((f) => ({ ...f, typ: e.target.value }))}
              >
                {TYP_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </InlineEditField>
            {istKundeFirmaPflichtTyp(editForm.typ) ? (
              <InlineEditField
                label={istKundeHausverwaltungTyp(editForm.typ) ? 'Firma' : 'Firma / Name'}
                editing
                value={editForm.firmaName || '—'}
              >
                <input
                  className="input"
                  value={editForm.firmaName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firmaName: e.target.value }))}
                  autoFocus
                />
              </InlineEditField>
            ) : null}
            <InlineEditField label="Vorname" editing value={editForm.vorname || '—'}>
              <input
                className="input"
                value={editForm.vorname}
                onChange={(e) => setEditForm((f) => ({ ...f, vorname: e.target.value }))}
                autoFocus={!istKundeFirmaPflichtTyp(editForm.typ)}
              />
            </InlineEditField>
            <InlineEditField
              label={
                istKundeFirmaPflichtTyp(editForm.typ) ? 'Nachname (Ansprechpartner)' : 'Nachname'
              }
              editing
              value={editForm.nachname || '—'}
            >
              <input
                className="input"
                value={editForm.nachname}
                onChange={(e) => setEditForm((f) => ({ ...f, nachname: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Straße" editing value={editForm.strasse || '—'}>
              <input
                className="input"
                value={editForm.strasse}
                onChange={(e) => setEditForm((f) => ({ ...f, strasse: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Hausnummer" editing value={editForm.hausnummer || '—'}>
              <input
                className="input"
                value={editForm.hausnummer}
                onChange={(e) => setEditForm((f) => ({ ...f, hausnummer: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="PLZ" editing value={editForm.plz || '—'}>
              <input
                className="input"
                value={editForm.plz}
                onChange={(e) => setEditForm((f) => ({ ...f, plz: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Ort" editing value={editForm.ort || '—'}>
              <input
                className="input"
                value={editForm.ort}
                onChange={(e) => setEditForm((f) => ({ ...f, ort: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="Telefon" editing value={editForm.telefon || '—'}>
              <input
                className="input"
                type="tel"
                value={editForm.telefon}
                onChange={(e) => setEditForm((f) => ({ ...f, telefon: e.target.value }))}
              />
            </InlineEditField>
            <InlineEditField label="E-Mail" editing value={editForm.email || '—'}>
              <input
                className="input"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </InlineEditField>
            {istKundeNurGewerbeTyp(editForm.typ) ? (
              <InlineEditField
                label="Ansprechpartner"
                editing
                value={editForm.ansprechpartner || '—'}
              >
                <input
                  className="input"
                  value={editForm.ansprechpartner}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, ansprechpartner: e.target.value }))
                  }
                />
              </InlineEditField>
            ) : null}
            <InlineEditField label="Webseite" editing value={editForm.webseite || '—'}>
              <input
                className="input"
                value={editForm.webseite}
                onChange={(e) => setEditForm((f) => ({ ...f, webseite: e.target.value }))}
              />
            </InlineEditField>
          </div>
        ) : (
          viewBody
        )}
      </InlineEditSection>
    )
  }

  /* Kein Kunde verknüpft → nur Ansicht */
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-title title">Stammdaten</div>
      </div>
      <div className="card-b">{viewBody}</div>
    </div>
  )
}
