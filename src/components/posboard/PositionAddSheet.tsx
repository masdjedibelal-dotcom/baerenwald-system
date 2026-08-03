'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { KiAssistIconButton } from '@/components/assistent/KiAssistIconButton'
import { useKiAssistDraftConsumer } from '@/components/assistent/useKiAssistDraftConsumer'
import { listKatalogPositionen } from '@/app/(dashboard)/katalog/actions'
import {
  katalogPreisLabel,
  katalogVarianteLabel,
  type KatalogPosition,
  type KatalogVariante,
} from '@/lib/katalog/katalog-types'
import { POSITION_MENGE_EINHEITEN } from '@/lib/dokument-einheiten'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { REGIE_BADGE_LABEL } from '@/lib/auftraege/regie-display'
import { Toggle } from '@/components/ui/Toggle'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { cn } from '@/lib/utils'
import type { KatalogPickResult } from '@/components/posboard/KatalogPickModal'

export type PositionAddMode = 'preisliste' | 'frei' | 'freitext' | 'nachlass' | 'gewerk'

export type FreiePositionDraft = {
  name: string
  beschreibung: string
  menge: number
  einheit: string
  preis: number
  ust: number
  gewerk: string
  /** Regie / nach Aufwand */
  regie?: boolean
}

export type FreitextDraft = {
  name: string
  beschreibung: string
  gewerk: string
}

export type NachlassDraft = {
  name: string
  nachlassModus: 'prozent' | 'betrag'
  preis: number
}

const emptyFrei = (gewerk: string): FreiePositionDraft => ({
  name: '',
  beschreibung: '',
  menge: 1,
  einheit: 'Stück',
  preis: 0,
  ust: 19,
  gewerk: gewerk.trim() || 'Allgemein',
  regie: false,
})

const emptyFreitext = (gewerk: string): FreitextDraft => ({
  name: '',
  beschreibung: '',
  gewerk: gewerk.trim() || 'Allgemein',
})

const emptyNachlass = (): NachlassDraft => ({
  name: 'Nachlass',
  nachlassModus: 'prozent',
  preis: 0,
})

/**
 * Position hinzufügen: Desktop Split-over · mobil Bottom Sheet.
 * Chips: Preisliste | Frei | Freitext | Nachlass | (optional) Gewerk.
 */
export function PositionAddSheet({
  open,
  onClose,
  initialMode = 'preisliste',
  preferredGewerkName,
  gewerke = [],
  showUst = true,
  allowGewerk = true,
  allowNachlass = true,
  onPickKatalog,
  onAddFrei,
  onAddFreitext,
  onAddNachlass,
  onAddGewerk,
}: {
  open: boolean
  onClose: () => void
  initialMode?: PositionAddMode
  preferredGewerkName?: string | null
  gewerke?: string[]
  showUst?: boolean
  /** Gewerk-Chip (komplexe Dokumente) */
  allowGewerk?: boolean
  allowNachlass?: boolean
  onPickKatalog: (result: KatalogPickResult) => void
  onAddFrei: (draft: FreiePositionDraft) => void
  onAddFreitext?: (draft: FreitextDraft) => void
  onAddNachlass?: (draft: NachlassDraft) => void
  /** Neuer Gewerk-Abschnitt — Sheet bleibt offen und wechselt zu Preisliste */
  onAddGewerk?: (name: string) => void
}) {
  const [mode, setMode] = useState<PositionAddMode>(initialMode)
  const [pending, startTransition] = useTransition()
  const [rows, setRows] = useState<KatalogPosition[]>([])
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
  const [freitext, setFreitext] = useState<FreitextDraft>(() =>
    emptyFreitext(preferredGewerkName || '')
  )
  const [nachlass, setNachlass] = useState<NachlassDraft>(emptyNachlass)
  const [gewerkPick, setGewerkPick] = useState('')
  const [gewerkCustom, setGewerkCustom] = useState('')
  const [activeGewerk, setActiveGewerk] = useState(preferredGewerkName?.trim() || '')

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setExpandedId(null)
    setPicked(null)
    setMenge('1')
    setBeschreibung('')
    const g = preferredGewerkName || ''
    setActiveGewerk(g.trim())
    setFrei(emptyFrei(g))
    setFreitext(emptyFreitext(g))
    setNachlass(emptyNachlass())
    setGewerkPick('')
    setGewerkCustom('')
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
    return rows.filter((p) => {
      if (gewerkFilter && p.gewerk_id !== gewerkFilter) return false
      return true
    })
  }, [rows, gewerkFilter])

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
          [
            ...gewerke,
            preferredGewerkName || '',
            activeGewerk,
            frei.gewerk,
            freitext.gewerk,
            'Allgemein',
          ].filter(Boolean)
        )
      ),
    [gewerke, preferredGewerkName, activeGewerk, frei.gewerk, freitext.gewerk]
  )

  const stammdatenGewerke = useMemo(
    () =>
      Array.from(new Set(gewerke.map((g) => g.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'de')
      ),
    [gewerke]
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
      gewerk: frei.gewerk.trim() || activeGewerk || preferredGewerkName?.trim() || 'Allgemein',
      menge: Number.isFinite(frei.menge) && frei.menge > 0 ? frei.menge : 1,
    })
    onClose()
  }

  function confirmFreitext() {
    if (!onAddFreitext) return
    if (!freitext.name.trim() && !freitext.beschreibung.trim()) return
    onAddFreitext({
      name: freitext.name.trim() || 'Hinweis',
      beschreibung: freitext.beschreibung.trim(),
      gewerk:
        freitext.gewerk.trim() || activeGewerk || preferredGewerkName?.trim() || 'Allgemein',
    })
    onClose()
  }

  function confirmNachlass() {
    if (!onAddNachlass) return
    onAddNachlass({
      name: nachlass.name.trim() || 'Nachlass',
      nachlassModus: nachlass.nachlassModus,
      preis: Number.isFinite(nachlass.preis) ? Math.max(0, nachlass.preis) : 0,
    })
    onClose()
  }

  function confirmGewerk() {
    const name = gewerkCustom.trim() || gewerkPick.trim()
    if (!name || !onAddGewerk) return
    onAddGewerk(name)
    setActiveGewerk(name)
    setFrei((f) => ({ ...f, gewerk: name }))
    setFreitext((f) => ({ ...f, gewerk: name }))
    setGewerkPick('')
    setGewerkCustom('')
    setMode('preisliste')
  }

  const freiSumme = (Number(frei.menge) || 0) * (Number(frei.preis) || 0)
  const canConfirmFrei = Boolean(frei.name.trim())
  const canConfirmKatalog = Boolean(picked)
  const canConfirmFreitext = Boolean(
    freitext.name.trim() || freitext.beschreibung.trim()
  )
  const canConfirmNachlass = true
  const canConfirmGewerk = Boolean(gewerkCustom.trim() || gewerkPick.trim())

  const chips: { mode: PositionAddMode; label: string; show?: boolean }[] = [
    { mode: 'preisliste', label: 'Preisliste' },
    { mode: 'frei', label: 'Frei' },
    { mode: 'freitext', label: 'Freitext', show: Boolean(onAddFreitext) },
    { mode: 'nachlass', label: 'Nachlass', show: allowNachlass && Boolean(onAddNachlass) },
    { mode: 'gewerk', label: 'Gewerk', show: allowGewerk && Boolean(onAddGewerk) },
  ]

  function onConfirm() {
    if (mode === 'frei') confirmFrei()
    else if (mode === 'freitext') confirmFreitext()
    else if (mode === 'nachlass') confirmNachlass()
    else if (mode === 'gewerk') confirmGewerk()
    else confirmKatalog()
  }

  const confirmDisabled =
    mode === 'frei'
      ? !canConfirmFrei
      : mode === 'freitext'
        ? !canConfirmFreitext
        : mode === 'nachlass'
          ? !canConfirmNachlass
          : mode === 'gewerk'
            ? !canConfirmGewerk
            : !canConfirmKatalog

  useKiAssistDraftConsumer(open, ['position', 'text'], (d) => {
    // KI-Übernahme: immer auf Frei-Karte schreiben und vorhandene Werte überschreiben
    if (d.type === 'position') {
      if (mode === 'freitext') {
        setFreitext({
          name: d.name || '',
          beschreibung: d.beschreibung?.trim() || d.name || '',
          gewerk: (preferredGewerkName || freitext.gewerk || 'Allgemein').trim() || 'Allgemein',
        })
        setMode('freitext')
      } else {
        setFrei((f) => ({
          ...emptyFrei(preferredGewerkName || f.gewerk || ''),
          name: d.name || '',
          beschreibung: d.beschreibung ?? '',
          menge: d.menge && d.menge > 0 ? d.menge : 1,
          einheit: d.einheit?.trim() || 'Stück',
          preis: d.preis != null && d.preis >= 0 ? d.preis : 0,
          gewerk: (preferredGewerkName || f.gewerk || 'Allgemein').trim() || 'Allgemein',
        }))
        setMode('frei')
      }
    } else if (d.type === 'text') {
      if (mode === 'freitext') {
        setFreitext({
          name: d.titel?.trim() || '',
          beschreibung: d.text || '',
          gewerk: (preferredGewerkName || freitext.gewerk || 'Allgemein').trim() || 'Allgemein',
        })
        setMode('freitext')
      } else {
        setFrei((f) => ({
          ...emptyFrei(preferredGewerkName || f.gewerk || ''),
          name: d.titel?.trim() || '',
          beschreibung: d.text || '',
          gewerk: (preferredGewerkName || f.gewerk || 'Allgemein').trim() || 'Allgemein',
        }))
        setMode('frei')
      }
    }
  })

  // Nur Text aus Titel/Beschreibung an KI — nicht die Default-Menge „1 Stück“
  const kiDraftSeed = (() => {
    if (mode === 'freitext') {
      const name = freitext.name.trim()
      const desc = freitext.beschreibung.trim()
      if (!name && !desc) return null
      return [name, desc].filter(Boolean).join(' — ')
    }
    if (mode === 'frei') {
      const name = frei.name.trim()
      const desc = frei.beschreibung.trim()
      if (!name && !desc) return null
      return [
        name,
        desc,
        frei.menge > 0 ? `${frei.menge} ${frei.einheit}` : '',
        frei.preis > 0 ? `${frei.preis} €` : '',
      ]
        .filter(Boolean)
        .join(' — ')
    }
    return null
  })()

  const headerConfirmDisabled = confirmDisabled || (mode === 'preisliste' && pending)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Position hinzufügen"
      context="canvas"
      size="lg"
      headerEnd={
        <div className="pos-add-sheet__header-actions">
          {mode !== 'nachlass' && mode !== 'gewerk' ? (
            <KiAssistIconButton
              overSheet
              scope="position"
              title="Position mit KI formulieren"
              extraHint={
                preferredGewerkName
                  ? `Gewerk-Kontext: ${preferredGewerkName}. Eine freie Kalkulationsposition für Angebot/Rechnung.`
                  : 'Eine freie Kalkulationsposition für Angebot/Rechnung (Handwerk).'
              }
              draftInput={kiDraftSeed}
              onBeforeOpen={() => {
                // Preisliste → Frei, damit Übernahme sichtbare Felder hat
                if (mode === 'preisliste') setMode('frei')
              }}
            />
          ) : null}
          <button
            type="button"
            className="editor-sheet__confirm"
            disabled={headerConfirmDisabled}
            onClick={onConfirm}
            aria-label="Übernehmen"
            title="Übernehmen"
          >
            <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
          </button>
        </div>
      }
    >
      <div className="picker-sheet__chips" role="group" aria-label="Art">
        {chips
          .filter((c) => c.show !== false)
          .map((c) => (
            <button
              key={c.mode}
              type="button"
              className={cn('picker-sheet__chip', mode === c.mode && 'is-active')}
              onClick={() => setMode(c.mode)}
            >
              {c.label}
            </button>
          ))}
      </div>

      {activeGewerk && mode !== 'gewerk' && mode !== 'nachlass' ? (
        <p className="mb-2 text-[length:var(--fs-text)] text-bw-text-muted">
          Gewerk: <span className="font-medium text-bw-text">{activeGewerk}</span>
        </p>
      ) : null}

      {mode === 'preisliste' ? (
        <div className="space-y-3">
          {katalogGewerke.length > 0 ? (
            <div className="field">
              <div className="field-label">Gewerk</div>
              <select
                className="sel"
                value={gewerkFilter ?? ''}
                onChange={(e) => setGewerkFilter(e.target.value || null)}
                aria-label="Gewerk"
              >
                <option value="">Alle Gewerke</option>
                {katalogGewerke.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
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
                                    className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-[length:var(--fs-text)] ${
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
              <p className="text-[length:var(--fs-text)] font-medium text-emerald-950">
                {picked.position.titel}
                {picked.variante.variante?.trim()
                  ? ` · ${picked.variante.variante}`
                  : ''}{' '}
                · {formatEurBetrag(picked.variante.preis)} / {picked.variante.einheit}
              </p>
              <label className="block text-[length:var(--fs-text)] text-bw-text-muted">
                Menge
                <input
                  className="sel mt-0.5 w-full"
                  value={menge}
                  onChange={(e) => setMenge(e.target.value)}
                  inputMode="decimal"
                />
              </label>
              <SheetEditableField
                label="Beschreibung"
                value={beschreibung}
                onSave={setBeschreibung}
                multiline
                rows={3}
                placeholder="Projektspezifisch"
                sheetContext="detail"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === 'frei' ? (
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
            />
          </div>
          <SheetEditableField
            label="Beschreibung"
            value={frei.beschreibung}
            onSave={(beschreibung) => setFrei((f) => ({ ...f, beschreibung }))}
            multiline
            rows={3}
            placeholder="Details zur Leistung…"
            sheetContext="detail"
          />
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <Toggle
              checked={Boolean(frei.regie)}
              label={REGIE_BADGE_LABEL}
              hint="Nur Schätzung — Final kommt vom Handwerker (Bautagebuch Pflicht)"
              onChange={(on) =>
                setFrei((f) => ({
                  ...f,
                  regie: on,
                  einheit: on ? (f.einheit === 'h' || f.einheit === 'Std.' ? f.einheit : 'h') : f.einheit,
                }))
              }
            />
          </div>
          <div className="field">
            <div className="field-label">{frei.regie ? 'Geschätzte Stunden' : 'Menge'}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <ClearableNumberInput
                className="txt"
                value={frei.menge}
                onValueChange={(menge) => setFrei((f) => ({ ...f, menge }))}
                style={{ flex: 1 }}
              />
              <select
                className="sel"
                value={frei.einheit}
                onChange={(e) => setFrei((f) => ({ ...f, einheit: e.target.value }))}
                style={{ width: 100 }}
                disabled={Boolean(frei.regie)}
              >
                {POSITION_MENGE_EINHEITEN.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field pos-add-preis-ust">
            <div className="pos-add-preis-ust__labels">
              <div className="field-label">
                {frei.regie ? 'Stundensatz (netto)' : 'Einzelpreis (netto)'}
              </div>
              {showUst ? <div className="field-label">USt.</div> : null}
            </div>
            <div className="pos-add-preis-ust__row">
              <div className="txt-prefix pos-add-preis-ust__preis">
                <span className="prefix">{frei.regie ? '€/h' : '€'}</span>
                <ClearableNumberInput
                  className="txt"
                  value={frei.preis}
                  onValueChange={(preis) => setFrei((f) => ({ ...f, preis }))}
                  min={0}
                />
              </div>
              {showUst ? (
                <select
                  className="sel pos-add-preis-ust__ust"
                  value={String(frei.ust)}
                  onChange={(e) => setFrei((f) => ({ ...f, ust: Number(e.target.value) }))}
                  aria-label="USt."
                >
                  <option value="19">19%</option>
                  <option value="7">7%</option>
                  <option value="0">0%</option>
                </select>
              ) : null}
            </div>
          </div>
          <div className="field">
            <div className="field-label">Zeilensumme</div>
            <div style={{ fontSize: 'var(--fs-title)', fontWeight: 600, color: 'var(--green)' }}>
              {formatEurBetrag(freiSumme)}
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'freitext' ? (
        <div className="form-grid">
          <div className="field">
            <div className="field-label">Gewerk</div>
            <select
              className="sel"
              value={freitext.gewerk}
              onChange={(e) => setFreitext((f) => ({ ...f, gewerk: e.target.value }))}
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
            <div className="field-label">Überschrift</div>
            <input
              className="txt"
              value={freitext.name}
              onChange={(e) => setFreitext((f) => ({ ...f, name: e.target.value }))}
              placeholder="z. B. Wichtiger Hinweis"
            />
          </div>
          <SheetEditableField
            label="Text"
            value={freitext.beschreibung}
            onSave={(beschreibung) => setFreitext((f) => ({ ...f, beschreibung }))}
            multiline
            rows={3}
            placeholder="Erscheint ohne Preis auf dem Dokument"
            sheetContext="detail"
          />
        </div>
      ) : null}

      {mode === 'nachlass' ? (
        <div className="form-grid">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <div className="field-label">Bezeichnung</div>
            <input
              className="txt"
              value={nachlass.name}
              onChange={(e) => setNachlass((n) => ({ ...n, name: e.target.value }))}
              placeholder="Nachlass"
            />
          </div>
          <div className="field">
            <div className="field-label">Art</div>
            <select
              className="sel"
              value={nachlass.nachlassModus}
              onChange={(e) =>
                setNachlass((n) => ({
                  ...n,
                  nachlassModus: e.target.value as 'prozent' | 'betrag',
                }))
              }
            >
              <option value="prozent">Prozent vom Netto</option>
              <option value="betrag">Fester Betrag</option>
            </select>
          </div>
          <div className="field">
            <div className="field-label">
              {nachlass.nachlassModus === 'prozent' ? 'Prozent' : 'Betrag netto'}
            </div>
            <div className="txt-prefix">
              <span className="prefix">{nachlass.nachlassModus === 'prozent' ? '%' : '€'}</span>
              <ClearableNumberInput
                className="txt"
                min={0}
                value={nachlass.preis}
                onValueChange={(preis) => setNachlass((n) => ({ ...n, preis }))}
              />
            </div>
          </div>
        </div>
      ) : null}

      {mode === 'gewerk' ? (
        <div className="space-y-3">
          {stammdatenGewerke.length > 0 ? (
            <div className="field">
              <div className="field-label">Aus Stammdaten</div>
              <select
                className="sel"
                value={gewerkPick}
                onChange={(e) => {
                  setGewerkPick(e.target.value)
                  if (e.target.value) setGewerkCustom('')
                }}
              >
                <option value="">Gewerk wählen…</option>
                {stammdatenGewerke.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-[length:var(--fs-text)] text-bw-text-muted">
              Keine Gewerke in den Stammdaten — bitte freie Bezeichnung nutzen.
            </p>
          )}
          <div className="field">
            <div className="field-label">Oder freie Bezeichnung</div>
            <input
              className="txt"
              value={gewerkCustom}
              onChange={(e) => {
                setGewerkCustom(e.target.value)
                if (e.target.value.trim()) setGewerkPick('')
              }}
              placeholder="z.B. Trockenbau · 1. OG"
            />
          </div>
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            Anschließend kannst du direkt Positionen für dieses Gewerk hinzufügen.
          </p>
        </div>
      ) : null}
    </EditorSheet>
  )
}
