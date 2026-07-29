'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { listKatalogPositionen } from '@/app/(dashboard)/katalog/actions'
import {
  katalogPreisLabel,
  katalogVarianteLabel,
  type KatalogPosition,
  type KatalogVariante,
} from '@/lib/katalog/katalog-types'
import { POSITION_MENGE_EINHEITEN } from '@/lib/dokument-einheiten'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'
import type { KatalogPickResult } from '@/components/posboard/KatalogPickModal'

export type PositionAddMode = 'preisliste' | 'frei'

export type FreiePositionDraft = {
  name: string
  beschreibung: string
  menge: number
  einheit: string
  preis: number
  ust: number
  gewerk: string
}

const emptyFrei = (gewerk: string): FreiePositionDraft => ({
  name: '',
  beschreibung: '',
  menge: 1,
  einheit: 'Stück',
  preis: 0,
  ust: 19,
  gewerk: gewerk.trim() || 'Allgemein',
})

/**
 * Position hinzufügen: Desktop Split-over · mobil Bottom Sheet.
 * Chips: Preisliste | Freie Position.
 */
export function PositionAddSheet({
  open,
  onClose,
  initialMode = 'preisliste',
  preferredGewerkName,
  gewerke = [],
  showUst = true,
  onPickKatalog,
  onAddFrei,
}: {
  open: boolean
  onClose: () => void
  initialMode?: PositionAddMode
  preferredGewerkName?: string | null
  gewerke?: string[]
  showUst?: boolean
  onPickKatalog: (result: KatalogPickResult) => void
  onAddFrei: (draft: FreiePositionDraft) => void
}) {
  const [mode, setMode] = useState<PositionAddMode>(initialMode)
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<KatalogPosition[]>([])
  const [q, setQ] = useState('')
  const [gewerkFilter, setGewerkFilter] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [picked, setPicked] = useState<{
    position: KatalogPosition
    variante: KatalogVariante
  } | null>(null)
  const [menge, setMenge] = useState('1')
  const [beschreibung, setBeschreibung] = useState('')
  const [frei, setFrei] = useState<FreiePositionDraft>(() =>
    emptyFrei(preferredGewerkName || '')
  )

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setQ('')
    setExpandedId(null)
    setPicked(null)
    setMenge('1')
    setBeschreibung('')
    setFrei(emptyFrei(preferredGewerkName || ''))
    setGewerkFilter(null)
    if (initialMode !== 'preisliste') return
    startTransition(async () => {
      const list = await listKatalogPositionen({ nurAktiv: true })
      setRows(list)
      if (preferredGewerkName?.trim()) {
        const hit = list.find(
          (p) =>
            (p.gewerk_name || '').toLowerCase() === preferredGewerkName.trim().toLowerCase()
        )
        if (hit) setGewerkFilter(hit.gewerk_id)
      }
    })
  }, [open, initialMode, preferredGewerkName])

  useEffect(() => {
    if (!open || mode !== 'preisliste' || rows.length) return
    startTransition(async () => {
      const list = await listKatalogPositionen({ nurAktiv: true })
      setRows(list)
    })
  }, [open, mode, rows.length])

  const katalogGewerke = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of rows) {
      if (!m.has(p.gewerk_id)) m.set(p.gewerk_id, p.gewerk_name || 'Gewerk')
    }
    return Array.from(m.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((p) => {
      if (gewerkFilter && p.gewerk_id !== gewerkFilter) return false
      if (!needle) return true
      const hay = `${p.titel} ${p.kategorie} ${p.gewerk_name ?? ''} ${p.varianten
        .map((v) => v.variante)
        .join(' ')}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, q, gewerkFilter])

  const grouped = useMemo(() => {
    const m = new Map<string, KatalogPosition[]>()
    for (const p of filtered) {
      const key = p.gewerk_name || 'Sonstige'
      const arr = m.get(key) ?? []
      arr.push(p)
      m.set(key, arr)
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [filtered])

  const gewerkOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...gewerke, preferredGewerkName || '', frei.gewerk, 'Allgemein'].filter(Boolean)
        )
      ),
    [gewerke, preferredGewerkName, frei.gewerk]
  )

  function selectVariante(position: KatalogPosition, variante: KatalogVariante) {
    setPicked({ position, variante })
    setBeschreibung(
      (variante.beschreibung || position.beschreibung_standard || '').trim()
    )
  }

  function tryPickPosition(position: KatalogPosition) {
    const aktive = position.varianten.filter((v) => v.aktiv)
    if (aktive.length === 1) {
      selectVariante(position, aktive[0]!)
      return
    }
    setExpandedId((cur) => (cur === position.id ? null : position.id))
  }

  function confirmKatalog() {
    if (!picked) return
    const m = Number(String(menge).replace(',', '.'))
    onPickKatalog({
      position: picked.position,
      variante: picked.variante,
      menge: Number.isFinite(m) && m > 0 ? m : 1,
      beschreibung: beschreibung.trim(),
    })
    onClose()
  }

  function confirmFrei() {
    if (!frei.name.trim()) return
    onAddFrei({
      ...frei,
      name: frei.name.trim(),
      beschreibung: frei.beschreibung.trim(),
      gewerk: frei.gewerk.trim() || preferredGewerkName?.trim() || 'Allgemein',
      menge: Number.isFinite(frei.menge) && frei.menge > 0 ? frei.menge : 1,
    })
    onClose()
  }

  const freiSumme = (Number(frei.menge) || 0) * (Number(frei.preis) || 0)
  const canConfirmFrei = Boolean(frei.name.trim())
  const canConfirmKatalog = Boolean(picked)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Position hinzufügen"
      context="canvas"
      size="lg"
      onConfirm={mode === 'frei' ? confirmFrei : confirmKatalog}
      confirmDisabled={mode === 'frei' ? !canConfirmFrei : !canConfirmKatalog}
      footer={
        mode === 'frei' ? (
          <div className="rate-drawer-cta">
            <MockBtn kind="primary" icon="check" disabled={!canConfirmFrei} onClick={confirmFrei}>
              Hinzufügen
            </MockBtn>
          </div>
        ) : picked ? (
          <div className="rate-drawer-cta">
            <MockBtn
              kind="primary"
              icon="check"
              disabled={!canConfirmKatalog || pending}
              onClick={confirmKatalog}
            >
              Übernehmen
            </MockBtn>
          </div>
        ) : undefined
      }
    >
      <div className="picker-sheet__chips" role="group" aria-label="Quelle">
        <button
          type="button"
          className={cn('picker-sheet__chip', mode === 'preisliste' && 'is-active')}
          onClick={() => setMode('preisliste')}
        >
          Preisliste
        </button>
        <button
          type="button"
          className={cn('picker-sheet__chip', mode === 'frei' && 'is-active')}
          onClick={() => setMode('frei')}
        >
          Freie Position
        </button>
      </div>

      {mode === 'preisliste' ? (
        <div className="space-y-3">
          <input
            className="sel w-full"
            placeholder="Leistung suchen…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />

          {katalogGewerke.length > 0 ? (
            <div className="picker-sheet__chips" role="group" aria-label="Gewerk">
              <button
                type="button"
                className={cn('picker-sheet__chip', !gewerkFilter && 'is-active')}
                onClick={() => setGewerkFilter(null)}
              >
                Alle
              </button>
              {katalogGewerke.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={cn('picker-sheet__chip', gewerkFilter === g.id && 'is-active')}
                  onClick={() => setGewerkFilter(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          ) : null}

          {pending && !rows.length ? (
            <p className="picker-sheet__empty">Lädt…</p>
          ) : !pending && !filtered.length ? (
            <p className="picker-sheet__empty">Keine Treffer.</p>
          ) : (
            <div className="max-h-[280px] overflow-y-auto rounded-md border border-bw-border">
              {grouped.map(([gewerkName, items]) => (
                <div key={gewerkName}>
                  <div className="sticky top-0 bg-bw-surface-2 px-3 py-1.5 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
                    {gewerkName}
                  </div>
                  <ul>
                    {items.map((p) => {
                      const expanded = expandedId === p.id
                      const selectedHere = picked?.position.id === p.id
                      return (
                        <li key={p.id} className="border-t border-bw-border/60">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[length:var(--fs-text)] hover:bg-bw-surface-2"
                            onClick={() => tryPickPosition(p)}
                          >
                            <span className="min-w-0 flex-1 font-medium">{p.titel}</span>
                            <MockBadge kind="fertig">{p.kategorie}</MockBadge>
                            <span className="shrink-0 text-[length:var(--fs-meta)] text-bw-text-muted">
                              {p.varianten.length} Var.
                            </span>
                          </button>
                          {(expanded || (selectedHere && p.varianten.length > 1)) && (
                            <ul className="bg-bw-surface-2/50 px-3 pb-2">
                              {p.varianten.map((v) => (
                                <li key={v.id}>
                                  <button
                                    type="button"
                                    className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-[length:var(--fs-meta)] ${
                                      picked?.variante.id === v.id
                                        ? 'bg-emerald-50 text-emerald-950'
                                        : 'hover:bg-white'
                                    }`}
                                    onClick={() => selectVariante(p, v)}
                                  >
                                    <span>{katalogVarianteLabel(v)}</span>
                                    <span className="tabular-nums text-bw-text-muted">
                                      {katalogPreisLabel(v)} / {v.einheit}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {picked ? (
            <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
              <p className="text-[length:var(--fs-meta)] font-medium text-emerald-950">
                {picked.position.titel}
                {picked.variante.variante?.trim()
                  ? ` · ${picked.variante.variante}`
                  : ''}{' '}
                · {formatEurBetrag(picked.variante.preis)} / {picked.variante.einheit}
              </p>
              <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
                Menge
                <input
                  className="sel mt-0.5 w-full"
                  value={menge}
                  onChange={(e) => setMenge(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <label className="block text-[length:var(--fs-meta)] text-bw-text-muted">
                Beschreibung
                <textarea
                  className="sel mt-0.5 w-full"
                  rows={3}
                  value={beschreibung}
                  onChange={(e) => setBeschreibung(e.target.value)}
                  placeholder="Projektspezifisch"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="form-grid">
          <div className="field">
            <div className="field-label">Gewerk</div>
            <select
              className="sel"
              value={frei.gewerk}
              onChange={(e) => setFrei((f) => ({ ...f, gewerk: e.target.value }))}
            >
              {gewerkOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div />
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <div className="field-label">
              Bezeichnung<span className="req">*</span>
            </div>
            <input
              className="txt"
              value={frei.name}
              onChange={(e) => setFrei((f) => ({ ...f, name: e.target.value }))}
              placeholder="z.B. Wandfliesen verlegen"
              autoFocus
            />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <div className="field-label">Beschreibung</div>
            <textarea
              className="ta"
              value={frei.beschreibung}
              onChange={(e) => setFrei((f) => ({ ...f, beschreibung: e.target.value }))}
              rows={2}
              placeholder="Details zur Leistung…"
            />
          </div>
          <div className="field">
            <div className="field-label">Menge</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                className="txt"
                type="number"
                step="0.5"
                value={frei.menge}
                onChange={(e) =>
                  setFrei((f) => ({
                    ...f,
                    menge: e.target.value === '' ? 0 : Number(e.target.value),
                  }))
                }
                style={{ flex: 1 }}
              />
              <select
                className="sel"
                value={frei.einheit}
                onChange={(e) => setFrei((f) => ({ ...f, einheit: e.target.value }))}
                style={{ width: 100 }}
              >
                {POSITION_MENGE_EINHEITEN.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <div className="field-label">Einzelpreis (netto)</div>
            <div className="txt-prefix">
              <span className="prefix">€</span>
              <input
                className="txt"
                type="number"
                value={frei.preis}
                onChange={(e) =>
                  setFrei((f) => ({ ...f, preis: Number(e.target.value) || 0 }))
                }
              />
            </div>
          </div>
          {showUst ? (
            <div className="field">
              <div className="field-label">USt.</div>
              <select
                className="sel"
                value={String(frei.ust)}
                onChange={(e) => setFrei((f) => ({ ...f, ust: Number(e.target.value) }))}
              >
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
            </div>
          ) : (
            <div />
          )}
          <div className="field">
            <div className="field-label">Zeilensumme</div>
            <div style={{ fontSize: 'var(--fs-title)', fontWeight: 600, color: 'var(--green)' }}>
              {formatEurBetrag(freiSumme)}
            </div>
          </div>
        </div>
      )}
    </EditorSheet>
  )
}
