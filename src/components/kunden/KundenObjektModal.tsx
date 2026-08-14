'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { createObjektMieter } from '@/app/actions/objektakte-actions'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'

type DraftMieter = {
  key: string
  name: string
  bezeichnung: string
  flaeche: string
}

/** Objekt anlegen — Objektdaten + optionale Mieter (mit Einheit). */
export function KundenObjektModal({
  open,
  onClose,
  kundeId,
  verwaltungName,
  editObjekt,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  kundeId: string
  /** Anzeigename der Verwaltung (Kunde) */
  verwaltungName?: string
  editObjekt?: KundenObjekt | null
  onSaved: (objekt: KundenObjekt) => void
}) {
  const [pending, startTransition] = useTransition()
  const [titel, setTitel] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [baujahr, setBaujahr] = useState('')
  const [gesamtflaeche, setGesamtflaeche] = useState('')
  const [mieter, setMieter] = useState<DraftMieter[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

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
      setMieter([])
    } else {
      setTitel('')
      setStrasse('')
      setHausnummer('')
      setPlz('')
      setOrt('')
      setBaujahr('')
      setGesamtflaeche('')
      setMieter([])
    }
    setErr(null)
    setDirty(false)
  }, [open, editObjekt])

  function mark<T>(setter: (v: T) => void, v: T) {
    setter(v)
    setDirty(true)
  }

  const flaecheSumme = useMemo(() => {
    let sum = 0
    for (const e of mieter) {
      const n = Number(String(e.flaeche).replace(',', '.'))
      if (Number.isFinite(n)) sum += n
    }
    const g = Number(String(gesamtflaeche).replace(',', '.'))
    if (Number.isFinite(g) && g > 0) return { min: 0, max: g }
    return { min: 0, max: sum }
  }, [mieter, gesamtflaeche])

  function addMieter() {
    mark(setMieter, [
      ...mieter,
      {
        key: `m-${Date.now()}-${mieter.length}`,
        name: '',
        bezeichnung: '',
        flaeche: '',
      },
    ])
  }

  function patchMieter(key: string, patch: Partial<DraftMieter>) {
    mark(
      setMieter,
      mieter.map((e) => (e.key === key ? { ...e, ...patch } : e))
    )
  }

  function removeMieter(key: string) {
    mark(
      setMieter,
      mieter.filter((e) => e.key !== key)
    )
  }

  function speichern() {
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
      melde_slug: editObjekt?.melde_slug ?? null,
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

      for (const m of mieter) {
        const name = m.name.trim()
        if (!name) continue
        const fl = Number(String(m.flaeche).replace(',', '.'))
        const cr = await createObjektMieter(kundeId, r.objekt.id, {
          name,
          wohnung: m.bezeichnung.trim() || undefined,
          wohnflaeche_m2: Number.isFinite(fl) && fl > 0 ? fl : null,
        })
        if (!cr.ok) {
          toast.error(cr.message)
        }
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
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Objekt bearbeiten' : 'Objekt anlegen'}
      crumb={isEdit ? 'Objekt >' : 'Neues Objekt >'}
      context="detail"
      dirty={dirty}
      size="lg"
      onConfirm={speichern}
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
        </MockFormSection>

        {!isEdit ? (
          <div className="form-section">
            <div
              className="form-section-h"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <MockIcon ctx="default" n="users" size={13} />
              <span style={{ flex: 1 }}>Mieter</span>
              <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                {flaecheSumme.min} – {Math.round(flaecheSumme.max)} m²
              </span>
            </div>
            {mieter.length === 0 ? (
              <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)', margin: '4px 0 12px' }}>
                Noch keine Mieter — unten hinzufügen (Name + Einheit).
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {mieter.map((m) => (
                  <div
                    key={m.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 1fr 80px 36px',
                      gap: 8,
                      alignItems: 'end',
                    }}
                  >
                    <MockField label="Mieter">
                      <input
                        className="input"
                        value={m.name}
                        onChange={(ev) => patchMieter(m.key, { name: ev.target.value })}
                        placeholder="Max Mustermann"
                      />
                    </MockField>
                    <MockField label="Einheit">
                      <input
                        className="input"
                        value={m.bezeichnung}
                        onChange={(ev) =>
                          patchMieter(m.key, { bezeichnung: ev.target.value })
                        }
                        placeholder="WE 01"
                      />
                    </MockField>
                    <MockField label="m²">
                      <input
                        className="input"
                        value={m.flaeche}
                        onChange={(ev) => patchMieter(m.key, { flaeche: ev.target.value })}
                        placeholder="72"
                        inputMode="decimal"
                      />
                    </MockField>
                    <button
                      type="button"
                      className="qa-btn"
                      title="Entfernen"
                      aria-label="Mieter entfernen"
                      onClick={() => removeMieter(m.key)}
                    >
                      <MockIcon ctx="default" n="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="btn ghost sm" onClick={addMieter}>
              + Mieter hinzufügen
            </button>
          </div>
        ) : null}
      </div>
    </EditorSheet>
  )
}
