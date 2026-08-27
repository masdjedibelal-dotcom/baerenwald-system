'use client'

import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
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
  showUst = true,
  gewerke = [],
}: {
  position: PosBoardLine
  onChange: (patch: Partial<PosBoardLine>) => void
  onClose: () => void
  showUst?: boolean
  gewerke?: string[]
}) {
  const p = position
  const kind = p.kind ?? 'position'
  const isFreitext = kind === 'freitext'
  const gewerkOptions = ['', ...Array.from(new Set([...gewerke, p.gewerk, 'Allgemein'].filter(Boolean)))]

  /** Freitext → freie Position, sobald Kalkulationsfelder genutzt werden. */
  function patch(next: Partial<PosBoardLine>) {
    const commercialKeys: (keyof PosBoardLine)[] = [
      'menge',
      'preis',
      'einheit',
      'ust',
      'gewerk',
      'kostenverteilung',
      'regieSchein',
    ]
    const touchesCommercial = commercialKeys.some((k) => k in next)
    if (isFreitext && touchesCommercial) {
      onChange({
        kind: 'position',
        position_quelle: 'frei',
        menge: p.menge > 0 ? p.menge : 1,
        einheit: p.einheit?.trim() || 'Stück',
        ust: p.ust != null ? p.ust : 19,
        preis: Number(p.preis) || 0,
        ...next,
      })
      return
    }
    onChange(next)
  }

  const editLine: PosBoardLine = isFreitext
    ? {
        ...p,
        menge: p.menge > 0 ? p.menge : 1,
        einheit: p.einheit?.trim() || 'Stück',
        ust: p.ust != null ? p.ust : 19,
        preis: Number(p.preis) || 0,
      }
    : p
  const line = posBoardLineNetto(editLine)

  const title =
    kind === 'nachlass'
      ? p.name || 'Nachlass'
      : isFreitext
        ? p.name || 'Freie Position'
        : p.name || 'Position'

  return (
    <EditorSheet open onClose={onClose} title={title} context="canvas" size="lg" onConfirm={onClose} confirmLabel="Übernehmen">
      {kind === 'nachlass' ? (
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
              <ClearableNumberInput
                className="txt"
                min={0}
                value={p.preis}
                onValueChange={(preis) => onChange({ preis })}
              />
            </div>
          </Field>
        </div>
      ) : (
        <div className="form-grid">
          <Field label="Gewerk">
            <select
              className="sel"
              value={editLine.gewerk || ''}
              onChange={(e) => patch({ gewerk: e.target.value })}
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
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="z.B. Wandfliesen verlegen"
              autoFocus={!p.name}
            />
          </Field>
          <SheetEditableField
            label="Beschreibung"
            value={richTextToEditablePlain(p.beschreibung)}
            onSave={(beschreibung) => patch({ beschreibung })}
            multiline
            rows={3}
            placeholder="Details zur Leistung…"
            sheetContext="detail"
          />
          <Field label="Kostenart" full>
            <div className="seg" role="group" aria-label="Kostenart">
              {KOSTENART_OPTIONS.map((opt) => {
                const active = (editLine.kostenverteilung ?? 'allgemein') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={active ? 'on' : undefined}
                    onClick={() => patch({ kostenverteilung: opt.value })}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="Vergütung" full>
            <Toggle
              checked={Boolean(editLine.regieSchein)}
              label={REGIE_BADGE_LABEL}
              onChange={(on) => {
                if (on) {
                  const einheit =
                    editLine.einheit === 'h' || editLine.einheit === 'Std.'
                      ? editLine.einheit
                      : 'h'
                  patch({
                    regieSchein: true,
                    einheit,
                    notizExtern: editLine.notizExtern?.trim() || 'nach Aufwand',
                  })
                } else {
                  patch({ regieSchein: false })
                }
              }}
            />
          </Field>
          <Field label={editLine.regieSchein ? 'Geschätzte Stunden' : 'Menge'}>
            <div style={{ display: 'flex', gap: 4 }}>
              <ClearableNumberInput
                className="txt"
                value={editLine.menge}
                onValueChange={(menge) => patch({ menge })}
                style={{ flex: 1 }}
              />
              <select
                className="sel"
                value={editLine.einheit}
                onChange={(e) => patch({ einheit: e.target.value })}
                style={{ width: 100 }}
                disabled={Boolean(editLine.regieSchein)}
              >
                {POSITION_MENGE_EINHEITEN.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </Field>
          <div className="field pos-add-preis-ust">
            <div className="pos-add-preis-ust__labels">
              <div className="field-label">
                {editLine.regieSchein ? 'Stundensatz (netto)' : 'Einzelpreis (netto)'}
              </div>
              {showUst !== false ? <div className="field-label">USt.</div> : null}
            </div>
            <div className="pos-add-preis-ust__row">
              <div className="txt-prefix pos-add-preis-ust__preis">
                <span className="prefix">{editLine.regieSchein ? '€/h' : '€'}</span>
                <ClearableNumberInput
                  className="txt"
                  value={editLine.preis}
                  onValueChange={(preis) => patch({ preis })}
                  min={0}
                />
              </div>
              {showUst !== false ? (
                <select
                  className="sel pos-add-preis-ust__ust"
                  value={String(editLine.ust != null ? editLine.ust : 19)}
                  onChange={(e) => patch({ ust: Number(e.target.value) })}
                  aria-label="USt."
                >
                  <option value="19">19%</option>
                  <option value="7">7%</option>
                  <option value="0">0%</option>
                </select>
              ) : null}
            </div>
          </div>
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
