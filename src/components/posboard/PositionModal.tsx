'use client'

import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Toggle } from '@/components/ui/Toggle'
import { POSITION_MENGE_EINHEITEN } from '@/lib/dokument-einheiten'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { KostenVerteilung } from '@/lib/angebot-kosten-split'
import type { PosBoardLine } from '@/lib/posboard/pos-board-line'
import { posBoardLineNetto } from '@/lib/posboard/pos-board-line'
import { richTextToEditablePlain } from '@/lib/rich-text'
import { REGIE_BADGE_LABEL } from '@/lib/auftraege/regie-display'

const KOSTENART_OPTIONS: { value: KostenVerteilung; label: string }[] = [
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'lohn', label: 'Lohn' },
  { value: 'material', label: 'Material' },
]

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`field${full ? ' full' : ''}`} style={full ? { gridColumn: '1 / -1' } : undefined}>
      <div className="field-label">
        {label}
        {required ? <span className="req">*</span> : null}
      </div>
      {children}
      {hint ? <div className="field-hint">{hint}</div> : null}
    </div>
  )
}

export function PositionModal({
  position,
  onChange,
  onClose,
  onRemove,
  showUst = true,
  gewerke = [],
}: {
  position: PosBoardLine
  onChange: (patch: Partial<PosBoardLine>) => void
  onClose: () => void
  onRemove?: () => void
  showUst?: boolean
  gewerke?: string[]
}) {
  const p = position
  const kind = p.kind ?? 'position'
  const gewerkOptions = ['', ...Array.from(new Set([...gewerke, p.gewerk, 'Allgemein'].filter(Boolean)))]
  const line = posBoardLineNetto(p)

  const title =
    kind === 'freitext'
      ? p.name || 'Freitext'
      : kind === 'nachlass'
        ? p.name || 'Nachlass'
        : p.name || 'Position'

  return (
    <EditorSheet open onClose={onClose} title={title} context="canvas" size="lg" onConfirm={onClose}>
      {onRemove ? (
        <button
          type="button"
          className="mb-3 text-[length:var(--fs-text)] font-medium text-status-cancel-text"
          onClick={() => {
            onRemove()
            onClose()
          }}
        >
          Entfernen
        </button>
      ) : null}
      {kind === 'freitext' ? (
        <div className="form-grid">
          <Field label="Überschrift" full>
            <input
              className="txt"
              value={p.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="z. B. Wichtiger Hinweis"
              autoFocus={!p.name}
            />
          </Field>
          <Field label="Text" full hint="Erscheint ohne Preis auf dem Dokument">
            <textarea
              className="ta"
              value={richTextToEditablePlain(p.beschreibung)}
              onChange={(e) => onChange({ beschreibung: e.target.value })}
              rows={3}
              placeholder="z. B. Hinweis zu Ablauf oder Garantie"
            />
          </Field>
        </div>
      ) : kind === 'nachlass' ? (
        <div className="form-grid">
          <Field label="Bezeichnung" full required>
            <input
              className="txt"
              value={p.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Nachlass"
              autoFocus
            />
          </Field>
          <Field label="Art des Nachlasses">
            <select
              className="sel"
              value={p.nachlassModus ?? 'prozent'}
              onChange={(e) => {
                const modus = e.target.value as 'prozent' | 'betrag'
                onChange({
                  nachlassModus: modus,
                  einheit: modus === 'prozent' ? '%' : '€',
                })
              }}
            >
              <option value="prozent">Prozent vom Netto</option>
              <option value="betrag">Fester Betrag</option>
            </select>
          </Field>
          <Field label={(p.nachlassModus ?? 'prozent') === 'prozent' ? 'Prozent' : 'Betrag netto'}>
            <div className="txt-prefix">
              <span className="prefix">{(p.nachlassModus ?? 'prozent') === 'prozent' ? '%' : '€'}</span>
              <input
                className="txt"
                type="number"
                step={(p.nachlassModus ?? 'prozent') === 'prozent' ? '0.5' : '0.01'}
                min={0}
                value={p.preis}
                onChange={(e) => onChange({ preis: Number(e.target.value) || 0 })}
              />
            </div>
          </Field>
        </div>
      ) : (
        <div className="form-grid">
          <Field label="Gewerk">
            <select
              className="sel"
              value={p.gewerk || ''}
              onChange={(e) => onChange({ gewerk: e.target.value })}
            >
              <option value="">Gewerk wählen…</option>
              {gewerkOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <div />
          <Field label="Bezeichnung" full required>
            <input
              className="txt"
              value={p.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="z.B. Wandfliesen verlegen"
              autoFocus={!p.name}
            />
          </Field>
          <Field label="Beschreibung" full hint="Erscheint beim Kunden">
            <textarea
              className="ta"
              value={richTextToEditablePlain(p.beschreibung)}
              onChange={(e) => onChange({ beschreibung: e.target.value })}
              rows={2}
              placeholder="Details zur Leistung…"
            />
          </Field>
          <Field
            label="Kostenart"
            full
            hint="Allgemein = keine Aufteilung im PDF; Lohn bzw. Material = Ausweis in der Kostenaufstellung"
          >
            <div className="seg" role="group" aria-label="Kostenart">
              {KOSTENART_OPTIONS.map((opt) => {
                const active = (p.kostenverteilung ?? 'allgemein') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={active ? 'on' : undefined}
                    onClick={() => onChange({ kostenverteilung: opt.value })}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field
            label="Vergütung"
            full
            hint={
              p.regieSchein
                ? 'Im Angebot nur Schätzung (Stunden × Satz). Finaler Aufwand kommt vom Handwerker über Bautagebuch (Start-/Ende-Fotos, Stunden, Titel, Beschreibung — Pflicht).'
                : 'Festpreis: Menge × Einzelpreis. Für Aufwand/Regie Schalter aktivieren.'
            }
          >
            <Toggle
              checked={Boolean(p.regieSchein)}
              label={REGIE_BADGE_LABEL}
              hint="Stunden & Stundensatz statt Festpreis"
              onChange={(on) => {
                if (on) {
                  const einheit =
                    p.einheit === 'h' || p.einheit === 'Std.' ? p.einheit : 'h'
                  onChange({
                    regieSchein: true,
                    einheit,
                    notizExtern: p.notizExtern?.trim() || 'nach Aufwand',
                  })
                } else {
                  onChange({ regieSchein: false })
                }
              }}
            />
          </Field>
          <Field label={p.regieSchein ? 'Geschätzte Stunden' : 'Menge'}>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                className="txt"
                type="number"
                step="0.5"
                value={p.menge}
                onChange={(e) =>
                  onChange({
                    menge: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                style={{ flex: 1 }}
              />
              <select
                className="sel"
                value={p.einheit}
                onChange={(e) => onChange({ einheit: e.target.value })}
                style={{ width: 100 }}
                disabled={Boolean(p.regieSchein)}
              >
                {POSITION_MENGE_EINHEITEN.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <Field label={p.regieSchein ? 'Stundensatz (netto)' : 'Einzelpreis (netto)'}>
            <div className="txt-prefix">
              <span className="prefix">{p.regieSchein ? '€/h' : '€'}</span>
              <input
                className="txt"
                type="number"
                value={p.preis}
                onChange={(e) => onChange({ preis: Number(e.target.value) || 0 })}
              />
            </div>
          </Field>
          {showUst !== false ? (
            <Field label="USt.">
              <select
                className="sel"
                value={String(p.ust != null ? p.ust : 19)}
                onChange={(e) => onChange({ ust: Number(e.target.value) })}
              >
                <option value="19">19%</option>
                <option value="7">7%</option>
                <option value="0">0%</option>
              </select>
            </Field>
          ) : (
            <div />
          )}
          <Field label="Zeilensumme">
            <div style={{ fontSize: 'var(--fs-title)', fontWeight: 600, color: 'var(--green)' }}>
              {formatEurBetrag(line)}
            </div>
          </Field>
        </div>
      )}
    </EditorSheet>
  )
}
