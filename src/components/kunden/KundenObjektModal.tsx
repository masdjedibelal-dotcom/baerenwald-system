'use client'
import { MockField, MockFormSection, MockInput } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'
import { TOAST } from '@/lib/copy'
import { parseForm, useFieldErrors } from '@/lib/validation/form-schema'

/* FORM_VALIDATION: kunden-objekt */
const kundenObjektSchema = z.object({
  titel: z.string().trim().min(1, 'Objektname ist Pflicht.'),
  strasse: z.string().trim().min(1, 'Straße ist Pflicht.'),
  hausnummer: z.string().trim().min(1, 'Hausnummer ist Pflicht.'),
  plz: z.string().trim().min(1, 'PLZ ist Pflicht.'),
  ort: z.string().trim().min(1, 'Ort ist Pflicht.'),
})

/**
 * Objekt anlegen/bearbeiten — nur Objektdaten.
 * Einheiten sowie Mieter/Eigentümer danach in der Objektakte (wie HV-Portal).
 */
export function KundenObjektModal({
  open,
  onClose,
  kundeId,
  verwaltungName,
  editObjekt,
  onSaved,
  context = 'detail',
  overlayClassName,
}: {
  open: boolean
  onClose: () => void
  kundeId: string
  /** Anzeigename der Verwaltung (Kunde) */
  verwaltungName?: string
  editObjekt?: KundenObjekt | null
  onSaved: (objekt: KundenObjekt) => void
  /** canvas = über Wizard/DocumentCanvas (z. B. Rechnung → Kunde → Objekt anlegen). */
  context?: EditorSheetContext
  /** z. B. editor-sheet-overlay--stack über einem Detail-Sheet. */
  overlayClassName?: string
}) {
  const [pending, startTransition] = useTransition()
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [titel, setTitel] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [baujahr, setBaujahr] = useState('')
  const [gesamtflaeche, setGesamtflaeche] = useState('')
  const [meldeSlug, setMeldeSlug] = useState('')
  const [dirty, setDirty] = useState(false)
  const [slugWarnOpen, setSlugWarnOpen] = useState(false)

  const isEdit = Boolean(editObjekt)

  useEffect(() => {
    if (!open) return
    if (editObjekt) {
      setTitel(editObjekt.titel ?? '')
      setStrasse(editObjekt.strasse ?? '')
      setHausnummer(editObjekt.hausnummer ?? '')
      setPlz(editObjekt.plz ?? '')
      setOrt(editObjekt.ort ?? '')
      setBaujahr('')
      setGesamtflaeche('')
      setMeldeSlug(editObjekt.melde_slug ?? '')
    } else {
      setTitel('')
      setStrasse('')
      setHausnummer('')
      setPlz('')
      setOrt('')
      setBaujahr('')
      setGesamtflaeche('')
      setMeldeSlug('')
    }
    clearFieldErrors()
    setDirty(false)
    setSlugWarnOpen(false)
  }, [open, editObjekt, clearFieldErrors])

  function mark<T>(setter: (v: T) => void, v: T) {
    setter(v)
    setDirty(true)
  }

  function requestSpeichern() {
    const prev = String(editObjekt?.melde_slug ?? '').trim().toLowerCase()
    const next = meldeSlug.trim().toLowerCase()
    if (isEdit && prev && next && prev !== next) {
      setSlugWarnOpen(true)
      return
    }
    speichern()
  }

  function speichern() {
    setSlugWarnOpen(false)
    const parsed = parseForm(kundenObjektSchema, { titel, strasse, hausnummer, plz, ort })
    if (!parsed.ok) {
      applyFieldErrors(parsed.fieldErrors)
      return
    }

    const hinweisParts: string[] = []
    if (baujahr.trim()) hinweisParts.push(`Baujahr: ${baujahr.trim()}`)
    if (gesamtflaeche.trim()) hinweisParts.push(`Gesamtfläche: ${gesamtflaeche.trim()} m²`)

    const payload = {
      titel,
      strasse: strasse.trim(),
      hausnummer: hausnummer.trim() || null,
      plz,
      ort,
      melde_slug: isEdit ? meldeSlug.trim() || null : editObjekt?.melde_slug ?? null,
      melde_aktiv: editObjekt?.melde_aktiv !== false,
      einheiten_hinweis: hinweisParts.length
        ? hinweisParts.join(' · ')
        : editObjekt?.einheiten_hinweis ?? null,
      notizen_intern: editObjekt?.notizen_intern ?? null,
    }

    startTransition(async () => {
      if (editObjekt) {
        const r = await updateKundenObjekt(editObjekt.id, kundeId, payload)
        if (!r.ok) {
          applyFieldErrors({ _form: r.message })
          toast.systemError(r)
          return
        }
        onSaved({
          ...editObjekt,
          titel: titel.trim(),
          strasse: strasse.trim() || null,
          hausnummer: hausnummer.trim() || null,
          plz: plz.trim() || null,
          ort: ort.trim() || null,
          einheiten_hinweis: payload.einheiten_hinweis,
        })
        toast.success(TOAST.gespeichert)
        setDirty(false)
        onClose()
        return
      }

      const r = await createKundenObjekt(kundeId, payload)
      if (!r.ok) {
        applyFieldErrors({ _form: r.message })
        toast.systemError(r)
        return
      }

      onSaved(r.objekt)
      toast.success(TOAST.objekt_angelegt)
      setDirty(false)
      onClose()
    })
  }

  return (
    <>
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Objekt bearbeiten' : 'Objekt anlegen'}
      crumb={isEdit ? 'Objekt >' : 'Neues Objekt >'}
      context={context}
      overlayClassName={overlayClassName}
      dirty={dirty}
      size="lg"
      onConfirm={requestSpeichern}
      confirmDisabled={pending}
      confirmBusy={pending}
      className="kunde-create-sheet"
    >
      <div className="kunde-create">
        {fieldErrors._form ? (
          <p className="field-error" role="alert">
            {fieldErrors._form}
          </p>
        ) : null}

        <MockFormSection title="Objektdaten" icon="building">
          <MockField label="Objektname" required full name="titel" error={fieldErrors.titel}>
            <MockInput
              value={titel}
              onChange={(e) => {
                clearField('titel')
                mark(setTitel, e.target.value)
              }}
              placeholder="z.B. Wohnanlage Lindenhof"
            />
          </MockField>
          <MockField label="Straße" required name="strasse" error={fieldErrors.strasse}>
            <MockInput
              value={strasse}
              onChange={(e) => {
                clearField('strasse')
                mark(setStrasse, e.target.value)
              }}
              placeholder="Lindenstraße"
            />
          </MockField>
          <MockField label="Hausnummer" required name="hausnummer" error={fieldErrors.hausnummer}>
            <MockInput
              value={hausnummer}
              onChange={(e) => {
                clearField('hausnummer')
                mark(setHausnummer, e.target.value)
              }}
              placeholder="14"
            />
          </MockField>
          <MockField label="PLZ" required name="plz" error={fieldErrors.plz}>
            <MockInput
              value={plz}
              onChange={(e) => {
                clearField('plz')
                mark(setPlz, e.target.value)
              }}
              placeholder="80802"
              inputMode="numeric"
            />
          </MockField>
          <MockField label="Ort" required name="ort" error={fieldErrors.ort}>
            <MockInput
              value={ort}
              onChange={(e) => {
                clearField('ort')
                mark(setOrt, e.target.value)
              }}
              placeholder="München"
            />
          </MockField>
          <MockField label="Baujahr">
            <MockInput value={baujahr} onChange={(e) => mark(setBaujahr, e.target.value)} placeholder="1998" inputMode="numeric" />
          </MockField>
          <MockField label="Gesamtfläche (m²)">
            <MockInput value={gesamtflaeche} onChange={(e) => mark(setGesamtflaeche, e.target.value)} placeholder="1.240" inputMode="decimal" />
          </MockField>
          <MockField label="Verwaltung" full>
            <MockInput value={verwaltungName?.trim() || '—'} readOnly disabled />
          </MockField>
          {isEdit ? (
            <MockField label="Melde-Slug (URL)" full>
              <MockInput value={meldeSlug} onChange={(e) => mark(setMeldeSlug, e.target.value)} placeholder="z. B. lindenhof-14" />
            </MockField>
          ) : null}
        </MockFormSection>

        {!isEdit ? (
          <p
            style={{
              fontSize: 'var(--fs-meta)',
              color: 'var(--text-3)',
              margin: 'var(--sp-row) 0 0',
              lineHeight: 1.45,
            }}
          >
            Nach dem Anlegen: Einheit anlegen, danach Eigentümer und Mieter zuordnen
            (wie im HV-Portal).
          </p>
        ) : null}
      </div>
    </EditorSheet>

    <ConfirmPopup
      open={slugWarnOpen}
      onClose={() => {
        if (!pending) setSlugWarnOpen(false)
      }}
      title="Melde-Slug ändern?"
      danger
      busy={pending}
      confirmLabel={pending ? 'Wird geändert…' : 'Slug ändern'}
      onConfirm={speichern}
    >
      <p className="m-0 mb-2" style={{ color: 'var(--text-3)' }}>
        Gedruckte Aushänge werden ungültig.
      </p>
      <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
        Gedruckte Aushänge mit der alten Adresse funktionieren danach nicht mehr — neue Aushänge
        drucken.
      </div>
    </ConfirmPopup>
    </>
  )
}
