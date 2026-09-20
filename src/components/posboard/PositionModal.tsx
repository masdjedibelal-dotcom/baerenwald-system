'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { ClearableNumberInput } from '@/components/ui/ClearableNumberInput'
import { Toggle } from '@/components/ui/Toggle'
import { NachlassModusFields } from '@/components/posboard/NachlassModusFields'
import { POSITION_MENGE_EINHEITEN } from '@/lib/dokument-einheiten'
import { formatEurBetrag, type GesamtrabattModus } from '@/lib/dokument-zeilen'
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
  artikelNetto = 0,
  artikelBrutto = 0,
}: {
  position: PosBoardLine
  onChange: (patch: Partial<PosBoardLine>) => void
  onClose: () => void
  showUst?: boolean
  gewerke?: string[]
  /** Summe der Positionen vor Nachlass (für Zielbetrag) */
  artikelNetto?: number
  artikelBrutto?: number
}) {
  const p = position
  const kind = p.kind ?? 'position'
  const isFreitext = kind === 'freitext'
  const gewerkOptions = ['', ...Array.from(new Set([...gewerke, p.gewerk, 'Allgemein'].filter(Boolean)))]

  const line = posBoardLineNetto(p)

  const title =
    kind === 'nachlass'
      ? p.name || 'Nachlass'
      : isFreitext
        ? p.name || 'Freitext'
        : p.name || 'Position'

  return (
    <EditorSheet open onClose={onClose} title={title} context="canvas" size="lg" onConfirm={onClose} confirmLabel="Speichern">
      {kind === 'nachlass' ? (
        <div className="form-grid">
          <Field label="Bezeichnung" full required>
            <MockInput className="txt" value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Nachlass" autoFocus />
          </Field>
          <NachlassModusFields
            modus={(p.nachlassModus ?? 'prozent') as GesamtrabattModus}
            wert={p.preis}
            artikelNetto={artikelNetto}
            artikelBrutto={artikelBrutto}
            onChange={(next) => {
              const modus = (next.nachlassModus ?? p.nachlassModus ?? 'prozent') as GesamtrabattModus
              onChange({
                ...next,
                nachlassModus: modus,
                einheit: modus === 'prozent' ? '%' : '€',
              })
            }}
          />
        </div>
      ) : isFreitext ? (
        <div className="form-grid">
          <Field label="Gewerk">
            <MockSelect className="sel" value={p.gewerk || ''} onChange={(e) => onChange({ gewerk: e.target.value })}>
              <option value="">Gewerk wählen…</option>
              {gewerkOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </MockSelect>
          </Field>
          <div />
          <Field label="Überschrift" full>
            <MockInput className="txt" value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="z. B. Wichtiger Hinweis" autoFocus={!p.name} />
          </Field>
          <SheetEditableField
            label="Text"
            value={richTextToEditablePlain(p.beschreibung)}
            onSave={(beschreibung) => onChange({ beschreibung })}
            multiline
            rows={4}
            placeholder="Hinweis ohne Preis — z. B. Ablauf oder Garantie"
            sheetContext="canvas"
          />
        </div>
      ) : (
        <div className="form-grid">
          <Field label="Gewerk">
            <MockSelect className="sel" value={p.gewerk || ''} onChange={(e) => onChange({ gewerk: e.target.value })}>
              <option value="">Gewerk wählen…</option>
              {gewerkOptions.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </MockSelect>
          </Field>
          <div />
          <Field label="Bezeichnung" full required>
            <MockInput className="txt" value={p.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="z.B. Wandfliesen verlegen" autoFocus={!p.name} />
          </Field>
          <SheetEditableField
            label="Beschreibung"
            value={richTextToEditablePlain(p.beschreibung)}
            onSave={(beschreibung) => onChange({ beschreibung })}
            multiline
            rows={3}
            placeholder="Details zur Leistung…"
            sheetContext="canvas"
          />
          <Field label="Kostenart" full>
            <div className="seg" role="group" aria-label="Kostenart">
              {KOSTENART_OPTIONS.map((opt) => {
                const active = (p.kostenverteilung ?? 'allgemein') === opt.value
                return (
                  <MockBtn className={active ? 'on' : undefined} key={opt.value} type="button" onClick={() => onChange({ kostenverteilung: opt.value })}>
                    {opt.label}
                  </MockBtn>
                )
              })}
            </div>
          </Field>
          <Field label="Vergütung" full>
            <Toggle
              checked={Boolean(p.regieSchein)}
              label={REGIE_BADGE_LABEL}
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
              <ClearableNumberInput
                className="txt"
                value={p.menge}
                onValueChange={(menge) => onChange({ menge })}
                style={{ flex: 1 }}
              />
              <MockSelect className="sel" value={p.einheit} onChange={(e) => onChange({ einheit: e.target.value })} style={{ width: 100 }} disabled={Boolean(p.regieSchein)}>
                {POSITION_MENGE_EINHEITEN.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </MockSelect>
            </div>
          </Field>
          <div className="field pos-add-preis-ust">
            <div className="field-label">
              {p.regieSchein ? 'Stundensatz (netto)' : 'Einzelpreis (netto)'}
            </div>
            <div className="pos-add-preis-ust__row">
              <div className="input-prefix">
                <span className="prefix">{p.regieSchein ? '€/h' : '€'}</span>
                <ClearableNumberInput
                  className="txt"
                  value={p.preis}
                  onValueChange={(preis) => onChange({ preis })}
                />
              </div>
              {showUst ? (
                <MockSelect className="sel" value={String(p.ust ?? 19)} onChange={(e) => onChange({ ust: Number(e.target.value) })} aria-label="USt %">
                  <option value="19">19 %</option>
                  <option value="7">7 %</option>
                  <option value="0">0 %</option>
                </MockSelect>
              ) : null}
            </div>
          </div>
          <div className="field full">
            <div className="field-hint">
              Zeilensumme netto: <strong>{formatEurBetrag(line)}</strong>
            </div>
          </div>
        </div>
      )}
    </EditorSheet>
  )
}
