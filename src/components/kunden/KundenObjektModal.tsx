'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { EditorSheet, type EditorSheetContext } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'

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
  const [titel, setTitel] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [baujahr, setBaujahr] = useState('')
  const [gesamtflaeche, setGesamtflaeche] = useState('')
  const [meldeSlug, setMeldeSlug] = useState('')
  const [err, setErr] = useState<string | null>(null)
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
    setErr(null)
    setDirty(false)
    setSlugWarnOpen(false)
  }, [open, editObjekt])

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
    setErr(null)
    if (!strasse.trim()) {
      setErr('Straße ist Pflicht.')
      return
    }
    if (!hausnummer.trim()) {
      setErr('Hausnummer ist Pflicht.')
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
          setErr(r.message)
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
        toast.success('Gespeichert')
        setDirty(false)
        onClose()
        return
      }

      const r = await createKundenObjekt(kundeId, payload)
      if (!r.ok) {
        setErr(r.message)
        return
      }

      onSaved(r.objekt)
      toast.success('Objekt angelegt')
      setDirty(false)
      onClose()
    })
  }

  const canSave =
    Boolean(titel.trim() && strasse.trim() && hausnummer.trim() && plz.trim() && ort.trim()) &&
    !pending

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
      confirmDisabled={!canSave}
      confirmBusy={pending}
      className="kunde-create-sheet"
    >
      <div className="kunde-create">
        {err ? <p className="kunde-create__err">{err}</p> : null}

        <MockFormSection title="Objektdaten" icon="building">
          <MockField label="Objektname" required full>
            <input
              className="input"
              value={titel}
              onChange={(e) => mark(setTitel, e.target.value)}
              placeholder="z.B. Wohnanlage Lindenhof"
            />
          </MockField>
          <MockField label="Straße" required>
            <input
              className="input"
              value={strasse}
              onChange={(e) => mark(setStrasse, e.target.value)}
              placeholder="Lindenstraße"
            />
          </MockField>
          <MockField label="Hausnummer" required>
            <input
              className="input"
              value={hausnummer}
              onChange={(e) => mark(setHausnummer, e.target.value)}
              placeholder="14"
            />
          </MockField>
          <MockField label="PLZ" required>
            <input
              className="input"
              value={plz}
              onChange={(e) => mark(setPlz, e.target.value)}
              placeholder="80802"
              inputMode="numeric"
            />
          </MockField>
          <MockField label="Ort" required>
            <input
              className="input"
              value={ort}
              onChange={(e) => mark(setOrt, e.target.value)}
              placeholder="München"
            />
          </MockField>
          <MockField label="Baujahr">
            <input
              className="input"
              value={baujahr}
              onChange={(e) => mark(setBaujahr, e.target.value)}
              placeholder="1998"
              inputMode="numeric"
            />
          </MockField>
          <MockField label="Gesamtfläche (m²)">
            <input
              className="input"
              value={gesamtflaeche}
              onChange={(e) => mark(setGesamtflaeche, e.target.value)}
              placeholder="1.240"
              inputMode="decimal"
            />
          </MockField>
          <MockField label="Verwaltung" full>
            <input
              className="input"
              value={verwaltungName?.trim() || '—'}
              readOnly
              disabled
            />
          </MockField>
          {isEdit ? (
            <MockField label="Melde-Slug (URL)" full>
              <input
                className="input"
                value={meldeSlug}
                onChange={(e) => mark(setMeldeSlug, e.target.value)}
                placeholder="z. B. lindenhof-14"
              />
            </MockField>
          ) : null}
        </MockFormSection>

        {!isEdit ? (
          <p
            style={{
              fontSize: 'var(--fs-meta)',
              color: 'var(--text-3)',
              margin: '4px 0 0',
              lineHeight: 1.45,
            }}
          >
            Nach dem Anlegen: Einheit anlegen, danach Eigentümer und Mieter zuordnen
            (wie im HV-Portal).
          </p>
        ) : null}
      </div>
    </EditorSheet>

    {slugWarnOpen ? (
      <MockModal
        open
        icon="alert-triangle"
        title="Melde-Slug ändern?"
        sub="Gedruckte Aushänge werden ungültig."
        size="sm"
        onClose={() => setSlugWarnOpen(false)}
        footer={
          <>
            <MockBtn kind="ghost" onClick={() => setSlugWarnOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn kind="danger" icon="check" onClick={speichern} disabled={pending}>
              Slug ändern
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          Gedruckte Aushänge mit der alten Adresse funktionieren danach nicht mehr — neue Aushänge
          drucken.
        </div>
      </MockModal>
    ) : null}
    </>
  )
}
