'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import {
  createObjektMieter,
  deleteEinheitBewohner,
  updateEinheitBewohner,
  updateObjektEinheit,
} from '@/app/actions/objektakte-actions'
import type { EinheitBewohner, ObjektEinheit } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'

const COLS = 'minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr) 28px'

type MieterRow = EinheitBewohner & { einheitLabel: string; flaeche: number | null }

/**
 * Objekt-Tab „Mieter“: Mieter + Einheit gemeinsam (gleiche Daten wie HV-Portal).
 * Leer stehende Einheiten ohne Mieter werden nicht als eigene Zeilen geführt.
 */
export function ObjektEinheitenSection({
  kundeId,
  objektId,
  einheiten,
  bewohner: initial,
  onChanged,
}: {
  kundeId: string
  objektId: string
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
  onChanged: () => void
}) {
  const [rows, setRows] = useState<EinheitBewohner[]>(() =>
    initial.filter((b) => b.aktiv !== false)
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<EinheitBewohner | null>(null)
  const [pending, startTransition] = useTransition()
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [wohnung, setWohnung] = useState('')
  const [flaeche, setFlaeche] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [drawer, setDrawer] = useState<EinheitBewohner | null>(null)

  useEffect(() => {
    setRows(initial.filter((b) => b.aktiv !== false))
  }, [initial])

  const einheitById = useMemo(() => {
    const m = new Map<string, ObjektEinheit>()
    for (const e of einheiten) m.set(e.id, e)
    return m
  }, [einheiten])

  const liste: MieterRow[] = useMemo(
    () =>
      rows.map((b) => {
        const e = einheitById.get(b.objekt_einheit_id)
        return {
          ...b,
          einheitLabel:
            b.objekt_einheiten?.bezeichnung?.trim() ||
            e?.bezeichnung?.trim() ||
            '—',
          flaeche: e?.wohnflaeche_m2 != null ? Number(e.wohnflaeche_m2) : null,
        }
      }),
    [rows, einheitById]
  )

  function splitName(full: string): { vor: string; nach: string } {
    const parts = full.trim().split(/\s+/).filter(Boolean)
    if (parts.length <= 1) return { vor: parts[0] ?? '', nach: '' }
    return { vor: parts[0], nach: parts.slice(1).join(' ') }
  }

  function openNeu() {
    setEdit(null)
    setVorname('')
    setNachname('')
    setWohnung('')
    setFlaeche('')
    setTelefon('')
    setEmail('')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openEdit(b: EinheitBewohner) {
    const { vor, nach } = splitName(b.name)
    const e = einheitById.get(b.objekt_einheit_id)
    setEdit(b)
    setVorname(vor)
    setNachname(nach)
    setWohnung(
      b.objekt_einheiten?.bezeichnung?.trim() || e?.bezeichnung?.trim() || ''
    )
    setFlaeche(e?.wohnflaeche_m2 != null ? String(e.wohnflaeche_m2) : '')
    setTelefon(b.telefon ?? '')
    setEmail(b.email ?? '')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openEditFromDrawer(b: EinheitBewohner) {
    setDrawer(null)
    requestAnimationFrame(() => openEdit(b))
  }

  function fullName() {
    return [vorname, nachname].map((s) => s.trim()).filter(Boolean).join(' ')
  }

  function speichern() {
    setErr(null)
    const name = fullName()
    if (!name) {
      setErr('Vor- und Nachname sind erforderlich.')
      return
    }
    const fl = Number(String(flaeche).replace(',', '.'))
    const flaecheVal = Number.isFinite(fl) && fl > 0 ? fl : null

    startTransition(async () => {
      if (edit) {
        const r = await updateEinheitBewohner(kundeId, objektId, edit.id, {
          name,
          telefon,
          email,
        })
        if (!r.ok) {
          setErr(r.message)
          return
        }
        const bez = wohnung.trim() || 'Allgemein'
        const ur = await updateObjektEinheit(kundeId, objektId, edit.objekt_einheit_id, {
          bezeichnung: bez,
          wohnflaeche_m2: flaecheVal,
        })
        if (!ur.ok) {
          setErr(ur.message)
          return
        }
        toast.success('Gespeichert')
        setModalOpen(false)
        onChanged()
        return
      }

      const r = await createObjektMieter(kundeId, objektId, {
        name,
        wohnung: wohnung.trim() || undefined,
        telefon,
        email,
        wohnflaeche_m2: flaecheVal,
      })
      if (!r.ok) {
        setErr(r.message)
        return
      }
      toast.success('Mieter angelegt')
      setModalOpen(false)
      onChanged()
    })
  }

  function loeschen(b: EinheitBewohner) {
    if (!confirm(`Mieter „${b.name}“ entfernen?`)) return
    startTransition(async () => {
      const r = await deleteEinheitBewohner(kundeId, objektId, b.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Entfernt')
      setDrawer(null)
      onChanged()
    })
  }

  const drawerEinheit = drawer ? einheitById.get(drawer.objekt_einheit_id) : null
  const drawerEinheitLabel =
    drawer?.objekt_einheiten?.bezeichnung?.trim() ||
    drawerEinheit?.bezeichnung?.trim() ||
    '—'

  const canSave = Boolean(vorname.trim() && nachname.trim())

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--fs-meta)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--text-3)',
          }}
        >
          Mieter
        </span>
        <div style={{ flex: 1 }} />
        <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
          Mieter hinzufügen
        </MockBtn>
      </div>

      {liste.length === 0 ? (
        <MockEmpty
          icon="users"
          title="Noch keine Mieter"
          hint="Mieter mit Einheit hinzufügen — auch aus dem HV-Portal"
        />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
            <div>Mieter</div>
            <div>Einheit</div>
            <div>Kontakt</div>
            <div />
          </div>
          {liste.map((b) => (
            <div
              key={b.id}
              role="button"
              tabIndex={0}
              className="list-row"
              style={{ gridTemplateColumns: COLS, alignItems: 'center' }}
              onClick={() => setDrawer(b)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault()
                  setDrawer(b)
                }
              }}
            >
              <div className="lc-title" style={{ fontWeight: 600 }}>
                {b.name}
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-text)' }}>
                {b.einheitLabel}
                {b.flaeche != null ? (
                  <span style={{ color: 'var(--text-3)' }}> · {b.flaeche} m²</span>
                ) : null}
              </div>
              <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-text)' }}>
                {[b.telefon, b.email].filter(Boolean).join(' · ') || '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-4)' }}>
                <MockIcon ctx="default" n="chevron-right" size={16} />
              </div>
            </div>
          ))}
        </div>
      )}

      <EditorSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={edit ? 'Mieter bearbeiten' : 'Mieter hinzufügen'}
        crumb="Mieter >"
        dirty={dirty}
        size="md"
        onConfirm={speichern}
        confirmDisabled={pending || !canSave}
        confirmBusy={pending}
      >
        <div className="kunde-create">
          {err ? <p className="kunde-create__err">{err}</p> : null}
          <MockFormSection title="Mieter" icon="users">
            <MockField label="Vorname" required>
              <input
                className="input"
                value={vorname}
                onChange={(e) => {
                  setVorname(e.target.value)
                  setDirty(true)
                }}
                placeholder="Max"
                autoComplete="given-name"
              />
            </MockField>
            <MockField label="Nachname" required>
              <input
                className="input"
                value={nachname}
                onChange={(e) => {
                  setNachname(e.target.value)
                  setDirty(true)
                }}
                placeholder="Mustermann"
                autoComplete="family-name"
              />
            </MockField>
            <MockField label="E-Mail" full>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setDirty(true)
                }}
                placeholder="max@example.de"
                autoComplete="email"
              />
            </MockField>
            <MockField label="Telefon" full>
              <input
                className="input"
                type="tel"
                value={telefon}
                onChange={(e) => {
                  setTelefon(e.target.value)
                  setDirty(true)
                }}
                placeholder="+49 …"
                autoComplete="tel"
              />
            </MockField>
          </MockFormSection>
          <MockFormSection title="Einheit" icon="building">
            <MockField label="Wohnung / Einheit" full>
              <input
                className="input"
                value={wohnung}
                onChange={(e) => {
                  setWohnung(e.target.value)
                  setDirty(true)
                }}
                placeholder="WE 01 · 3. OG li"
              />
            </MockField>
            <MockField label="Fläche (m²)" full>
              <input
                className="input"
                value={flaeche}
                onChange={(e) => {
                  setFlaeche(e.target.value)
                  setDirty(true)
                }}
                placeholder="72"
                inputMode="decimal"
              />
            </MockField>
          </MockFormSection>
        </div>
      </EditorSheet>

      <EditorSheet
        open={Boolean(drawer)}
        onClose={() => setDrawer(null)}
        title={drawer?.name ?? 'Mieter'}
        crumb="Mieter >"
        size="md"
        footer={
          <div className="kunde-create-footer">
            <button
              type="button"
              className="btn ghost"
              onClick={() => drawer && openEditFromDrawer(drawer)}
              disabled={!drawer}
            >
              Bearbeiten
            </button>
            <MockBtn
              kind="ghost"
              disabled={!drawer || pending}
              onClick={() => drawer && loeschen(drawer)}
            >
              Entfernen
            </MockBtn>
          </div>
        }
      >
        {drawer ? (
          <div className="space-y-3">
            <div className="form-section-h">Kontakt</div>
            <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', margin: 0 }}>
              {[drawer.telefon, drawer.email].filter(Boolean).join(' · ') || 'Keine Kontaktdaten'}
            </p>
            <div className="form-section-h">Einheit</div>
            <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', margin: 0 }}>
              {drawerEinheitLabel}
              {drawerEinheit?.wohnflaeche_m2 != null
                ? ` · ${drawerEinheit.wohnflaeche_m2} m²`
                : ''}
            </p>
          </div>
        ) : null}
      </EditorSheet>
    </div>
  )
}
