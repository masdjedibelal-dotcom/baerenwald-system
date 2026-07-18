'use client'

import { useEffect, useState, useTransition } from 'react'
import { InlineEditField, InlineEditSection } from '@/components/ui/InlineEditSection'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { saveKunde } from '@/app/actions/kunden'
import { updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { splitDeutscherVollname } from '@/lib/kunde-namen'

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
  /** Lead-Kontakt speichern, wenn kein/zusätzlich Kunde */
  leadId?: string | null
  /** Kundentyp für saveKunde (Pflichtfeld) */
  kundeTyp?: string | null
  initial: EntityKundenStammDraft
  quelle?: string | null
  eingegangen?: string | null
  onSaved?: () => void
  disabled?: boolean
}

/**
 * Gemeinsame Kunden-Stammdaten mit Inline-Bearbeiten (Stift → Speichern/Abbrechen).
 */
export function EntityKundenStammdatenCard({
  kundeId,
  leadId,
  kundeTyp,
  initial,
  quelle,
  eingegangen,
  onSaved,
  disabled,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!editing) setDraft(initial)
  }, [initial, editing])

  const region =
    draft.ort.trim() && draft.plz.trim()
      ? `${draft.ort.trim()} · ${draft.plz.trim()}`
      : draft.ort.trim() || draft.plz.trim() || '—'

  function patch(p: Partial<EntityKundenStammDraft>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function cancel() {
    setDraft(initial)
    setEditing(false)
  }

  function save() {
    if (!draft.name.trim()) {
      toast.error('Name ist erforderlich.')
      return
    }
    startTransition(async () => {
      if (kundeId?.trim()) {
        const { vorname, nachname } = splitDeutscherVollname(draft.name)
        const r = await saveKunde(
          {
            name: draft.name.trim(),
            vorname: vorname || null,
            nachname: nachname || null,
            typ: kundeTyp?.trim() || 'privat',
            telefon: draft.telefon.trim() || null,
            email: draft.email.trim() || null,
            plz: draft.plz.trim() || null,
            ort: draft.ort.trim() || null,
            strasse: draft.strasse.trim() || null,
            stammPflicht: false,
          },
          kundeId,
          leadId ? { revalidateAnfrageIds: [leadId] } : undefined
        )
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      if (leadId?.trim()) {
        const r = await updateLeadKontakt(leadId, {
          kontakt_name: draft.name.trim(),
          kontakt_telefon: draft.telefon.trim() || null,
          kontakt_email: draft.email.trim() || null,
          plz: draft.plz.trim() || null,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      if (!kundeId?.trim() && !leadId?.trim()) {
        toast.error('Kein Kunde oder Lead zum Speichern verknüpft.')
        return
      }
      toast.success('Stammdaten gespeichert')
      setEditing(false)
      onSaved?.()
    })
  }

  return (
    <InlineEditSection
      title="Stammdaten"
      editing={editing}
      onStartEdit={() => setEditing(true)}
      onCancel={cancel}
      onSave={save}
      saving={pending}
      disabled={disabled || (!kundeId && !leadId)}
    >
      {editing ? (
        <p className="inline-edit-hint">
          <MockIcon ctx="default" n="info-circle" size={14} />
          Hervorgehobene Felder sind bearbeitbar.
        </p>
      ) : null}
      <div className="props">
        <InlineEditField
          label="Name"
          editing={editing}
          value={draft.name.trim() || '—'}
        >
          <input
            className="input"
            value={draft.name}
            onChange={(e) => patch({ name: e.target.value })}
            autoFocus
          />
        </InlineEditField>
        <InlineEditField
          label="Telefon"
          editing={editing}
          value={
            draft.telefon.trim() ? (
              <a href={telHref(draft.telefon)}>{draft.telefon}</a>
            ) : (
              '—'
            )
          }
        >
          <input
            className="input"
            type="tel"
            value={draft.telefon}
            onChange={(e) => patch({ telefon: e.target.value })}
          />
        </InlineEditField>
        <InlineEditField
          label="E-Mail"
          editing={editing}
          value={
            draft.email.trim() ? (
              <a href={`mailto:${draft.email}`}>{draft.email}</a>
            ) : (
              '—'
            )
          }
        >
          <input
            className="input"
            type="email"
            value={draft.email}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </InlineEditField>
        <InlineEditField label="PLZ" editing={editing} value={draft.plz.trim() || '—'}>
          <input
            className="input"
            value={draft.plz}
            onChange={(e) => patch({ plz: e.target.value })}
          />
        </InlineEditField>
        <InlineEditField label="Ort" editing={editing} value={draft.ort.trim() || '—'}>
          <input
            className="input"
            value={draft.ort}
            onChange={(e) => patch({ ort: e.target.value })}
          />
        </InlineEditField>
        {editing || draft.strasse.trim() ? (
          <InlineEditField
            label="Straße"
            editing={editing}
            value={draft.strasse.trim() || '—'}
          >
            <input
              className="input"
              value={draft.strasse}
              onChange={(e) => patch({ strasse: e.target.value })}
            />
          </InlineEditField>
        ) : null}
        {!editing ? <InlineEditField label="Region" editing={false} value={region} /> : null}
        {!editing && quelle ? (
          <InlineEditField label="Quelle" editing={false} value={quelle} />
        ) : null}
        {!editing && eingegangen ? (
          <InlineEditField label="Eingegangen" editing={false} value={eingegangen} />
        ) : null}
      </div>
    </InlineEditSection>
  )
}
