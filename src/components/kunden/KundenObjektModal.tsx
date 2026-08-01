'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { createObjektEinheit } from '@/app/actions/objektakte-actions'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'

type DraftEinheit = {
  key: string
  bezeichnung: string
  flaeche: string
}

function parseStrasseNr(raw: string): { strasse: string; hausnummer: string } {
  const t = raw.trim()
  if (!t) return { strasse: '', hausnummer: '' }
  const m = t.match(/^(.*?)[,\s]+(\d+\s*[a-zA-Z]?)$/)
  if (m) return { strasse: m[1]!.trim(), hausnummer: m[2]!.trim() }
  return { strasse: t, hausnummer: '' }
}

function formatStrasseNr(strasse: string | null | undefined, nr: string | null | undefined): string {
  return [strasse?.trim(), nr?.trim()].filter(Boolean).join(' ')
}

/** Mock-Parität: Objekt anlegen — Objektdaten + Wohneinheiten. */
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
  const [strasseNr, setStrasseNr] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [baujahr, setBaujahr] = useState('')
  const [gesamtflaeche, setGesamtflaeche] = useState('')
  const [einheiten, setEinheiten] = useState<DraftEinheit[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const isEdit = Boolean(editObjekt)

  useEffect(() => {
    if (!open) return
    if (editObjekt) {
      setTitel(editObjekt.titel ?? '')
      setStrasseNr(formatStrasseNr(editObjekt.strasse, editObjekt.hausnummer))
      setPlz(editObjekt.plz ?? '')
      setOrt(editObjekt.ort ?? '')
      setBaujahr('')
      setGesamtflaeche('')
      setEinheiten([])
    } else {
      setTitel('')
      setStrasseNr('')
      setPlz('')
      setOrt('')
      setBaujahr('')
      setGesamtflaeche('')
      setEinheiten([])
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
    for (const e of einheiten) {
      const n = Number(String(e.flaeche).replace(',', '.'))
      if (Number.isFinite(n)) sum += n
    }
    const g = Number(String(gesamtflaeche).replace(',', '.'))
    if (Number.isFinite(g) && g > 0) return { min: 0, max: g }
    return { min: 0, max: sum }
  }, [einheiten, gesamtflaeche])

  function addEinheit() {
    mark(setEinheiten, [
      ...einheiten,
      { key: `e-${Date.now()}-${einheiten.length}`, bezeichnung: '', flaeche: '' },
    ])
  }

  function patchEinheit(key: string, patch: Partial<DraftEinheit>) {
    mark(
      setEinheiten,
      einheiten.map((e) => (e.key === key ? { ...e, ...patch } : e))
    )
  }

  function removeEinheit(key: string) {
    mark(
      setEinheiten,
      einheiten.filter((e) => e.key !== key)
    )
  }

  function speichern() {
    setErr(null)
    const { strasse, hausnummer } = parseStrasseNr(strasseNr)
    const hinweisParts: string[] = []
    if (baujahr.trim()) hinweisParts.push(`Baujahr: ${baujahr.trim()}`)
    if (gesamtflaeche.trim()) hinweisParts.push(`Gesamtfläche: ${gesamtflaeche.trim()} m²`)

    const payload = {
      titel,
      strasse,
      hausnummer: hausnummer || null,
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

      for (const e of einheiten) {
        const bez = e.bezeichnung.trim()
        if (!bez) continue
        const fl = Number(String(e.flaeche).replace(',', '.'))
        const cr = await createObjektEinheit(kundeId, r.objekt.id, {
          bezeichnung: bez,
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
    Boolean(titel.trim() && strasseNr.trim() && plz.trim() && ort.trim()) && !pending

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
          <MockField label="Straße & Nr." required full>
            <input
              className="input"
              value={strasseNr}
              onChange={(e) => mark(setStrasseNr, e.target.value)}
              placeholder="Lindenstraße 14"
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
              <MockIcon ctx="default" n="building" size={13} />
              <span style={{ flex: 1 }}>Wohneinheiten</span>
              <span style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                {flaecheSumme.min} – {Math.round(flaecheSumme.max)} m²
              </span>
            </div>
            {einheiten.length === 0 ? (
              <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)', margin: '4px 0 12px' }}>
                Noch keine Einheiten — unten hinzufügen.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                {einheiten.map((e) => (
                  <div
                    key={e.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 100px 36px',
                      gap: 8,
                      alignItems: 'end',
                    }}
                  >
                    <MockField label="Bezeichnung">
                      <input
                        className="input"
                        value={e.bezeichnung}
                        onChange={(ev) => patchEinheit(e.key, { bezeichnung: ev.target.value })}
                        placeholder="WE 01"
                      />
                    </MockField>
                    <MockField label="m²">
                      <input
                        className="input"
                        value={e.flaeche}
                        onChange={(ev) => patchEinheit(e.key, { flaeche: ev.target.value })}
                        placeholder="72"
                        inputMode="decimal"
                      />
                    </MockField>
                    <button
                      type="button"
                      className="qa-btn"
                      title="Entfernen"
                      aria-label="Einheit entfernen"
                      onClick={() => removeEinheit(e.key)}
                    >
                      <MockIcon ctx="default" n="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="btn ghost sm" onClick={addEinheit}>
              + Wohneinheit hinzufügen
            </button>
          </div>
        ) : null}
      </div>
    </EditorSheet>
  )
}
