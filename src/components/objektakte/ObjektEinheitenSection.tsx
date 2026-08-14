'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import {
  createObjektEinheit,
  deleteObjektEinheit,
  updateObjektEinheit,
} from '@/app/actions/objektakte-actions'
import type { EinheitBewohner, ObjektEinheit } from '@/lib/objektakte/types'
import { toast } from '@/components/ui/app-toast'

const COLS = 'minmax(0, 1.4fr) 90px 110px 100px 28px'

/** Mock: Einheiten-Tabelle Bezeichnung · Fläche · Status · Miete · Chevron */
export function ObjektEinheitenSection({
  kundeId,
  objektId,
  einheiten: initial,
  bewohner,
  onChanged,
}: {
  kundeId: string
  objektId: string
  einheiten: ObjektEinheit[]
  bewohner: EinheitBewohner[]
  onChanged: () => void
}) {
  const [rows, setRows] = useState(() => initial.filter((e) => e.aktiv !== false))
  const [modalOpen, setModalOpen] = useState(false)
  const [edit, setEdit] = useState<ObjektEinheit | null>(null)
  const [pending, startTransition] = useTransition()
  const [bezeichnung, setBezeichnung] = useState('')
  const [flaeche, setFlaeche] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [drawer, setDrawer] = useState<ObjektEinheit | null>(null)

  useEffect(() => {
    setRows(initial.filter((e) => e.aktiv !== false))
  }, [initial])

  const vermietetIds = useMemo(() => {
    const s = new Set<string>()
    for (const b of bewohner) {
      if (b.aktiv !== false) s.add(b.objekt_einheit_id)
    }
    return s
  }, [bewohner])

  function openNeu() {
    setEdit(null)
    setBezeichnung('')
    setFlaeche('')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  function openEdit(e: ObjektEinheit) {
    setEdit(e)
    setBezeichnung(e.bezeichnung)
    setFlaeche(e.wohnflaeche_m2 != null ? String(e.wohnflaeche_m2) : '')
    setErr(null)
    setDirty(false)
    setModalOpen(true)
  }

  /** Detail-Split-over → Edit-Split-over: erst schließen, dann öffnen (kein Discard-Dialog). */
  function openEditFromDrawer(e: ObjektEinheit) {
    setDrawer(null)
    requestAnimationFrame(() => openEdit(e))
  }

  function speichern() {
    setErr(null)
    const fl = Number(String(flaeche).replace(',', '.'))
    const flaecheVal = Number.isFinite(fl) && fl > 0 ? fl : null
    startTransition(async () => {
      if (edit) {
        const r = await updateObjektEinheit(kundeId, objektId, edit.id, {
          bezeichnung,
          wohnflaeche_m2: flaecheVal,
        })
        if (!r.ok) {
          setErr(r.message)
          return
        }
        toast.success('Gespeichert')
        setModalOpen(false)
        onChanged()
        return
      }
      const r = await createObjektEinheit(kundeId, objektId, {
        bezeichnung,
        wohnflaeche_m2: flaecheVal,
      })
      if (!r.ok) {
        setErr(r.message)
        return
      }
      toast.success('Einheit angelegt')
      setModalOpen(false)
      onChanged()
    })
  }

  function loeschen(e: ObjektEinheit) {
    if (!confirm(`Einheit „${e.bezeichnung}“ löschen?`)) return
    startTransition(async () => {
      const r = await deleteObjektEinheit(kundeId, objektId, e.id)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gelöscht')
      setDrawer(null)
      onChanged()
    })
  }

  const mieterDesDrawers = drawer
    ? bewohner.filter((b) => b.objekt_einheit_id === drawer.id && b.aktiv !== false)
    : []

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
          Einheiten
        </span>
        <div style={{ flex: 1 }} />
        <MockBtn sm kind="primary" icon="plus" onClick={openNeu}>
          Einheit
        </MockBtn>
      </div>

      {rows.length === 0 ? (
        <MockEmpty icon="building" title="Noch keine Einheiten" hint="Wohneinheit hinzufügen" />
      ) : (
        <div className="listcard">
          <div className="list-row head" style={{ gridTemplateColumns: COLS }} aria-hidden>
            <div>Bezeichnung</div>
            <div>Fläche</div>
            <div>Status</div>
            <div>Miete</div>
            <div />
          </div>
          {rows.map((e) => {
            const vermietet = vermietetIds.has(e.id)
            return (
              <div
                key={e.id}
                role="button"
                tabIndex={0}
                className="list-row"
                style={{ gridTemplateColumns: COLS, alignItems: 'center' }}
                onClick={() => setDrawer(e)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    setDrawer(e)
                  }
                }}
              >
                <div className="lc-title" style={{ fontWeight: 600 }}>
                  {e.bezeichnung}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-text)' }}>
                  {e.wohnflaeche_m2 != null ? `${e.wohnflaeche_m2} m²` : '—'}
                </div>
                <div>
                  {vermietet ? <MockBadge kind="aktiv">Vermietet</MockBadge> : null}
                </div>
                <div style={{ color: 'var(--text-2)', fontSize: 'var(--fs-text)' }}>—</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--text-4)' }}>
                  <MockIcon ctx="default" n="chevron-right" size={16} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EditorSheet
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={edit ? 'Einheit bearbeiten' : 'Neue Einheit'}
        crumb="Einheiten >"
        dirty={dirty}
        size="md"
        onConfirm={speichern}
        confirmDisabled={pending || !bezeichnung.trim()}
        confirmBusy={pending}
      >
        <div className="kunde-create">
          {err ? <p className="kunde-create__err">{err}</p> : null}
          <MockFormSection title="Einheit" icon="building">
            <MockField label="Bezeichnung" required full>
              <input
                className="input"
                value={bezeichnung}
                onChange={(e) => {
                  setBezeichnung(e.target.value)
                  setDirty(true)
                }}
                placeholder="WE 01"
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
        title={drawer?.bezeichnung ?? 'Einheit'}
        crumb="Einheiten >"
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
              Löschen
            </MockBtn>
          </div>
        }
      >
        {drawer ? (
          <div className="space-y-3">
            <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)' }}>
              {drawer.wohnflaeche_m2 != null ? `${drawer.wohnflaeche_m2} m²` : 'Keine Fläche'}
              {vermietetIds.has(drawer.id) ? ' · Vermietet' : ''}
            </p>
            <div className="form-section-h">Mieter-Daten</div>
            {mieterDesDrawers.length === 0 ? (
              <p style={{ fontSize: 'var(--fs-text)', color: 'var(--text-3)' }}>
                Noch keine Mieter hinterlegt.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {mieterDesDrawers.map((b) => (
                  <li
                    key={b.id}
                    style={{
                      padding: '10px 0',
                      borderBottom: '0.5px solid var(--border)',
                      fontSize: 'var(--fs-text)',
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 'var(--fs-meta)' }}>
                      {[b.telefon, b.email].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </EditorSheet>
    </div>
  )
}
