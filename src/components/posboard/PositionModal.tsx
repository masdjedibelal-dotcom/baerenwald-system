'use client'

import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockModal } from '@/components/mock-ui/MockModal'
import { POSITION_MENGE_EINHEITEN } from '@/lib/dokument-einheiten'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { PosBoardLine } from '@/lib/posboard/pos-board-line'
import { posBoardLineNetto } from '@/lib/posboard/pos-board-line'

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
  const gewerkOptions = ['', ...Array.from(new Set([...gewerke, p.gewerk, 'Allgemein'].filter(Boolean)))]
  const line = posBoardLineNetto(p)

  return (
    <MockModal
      open
      onClose={onClose}
      icon="list-numbers"
      title={p.name || 'Neue Position'}
      sub="Position bearbeiten"
      footer={
        <>
          {onRemove ? (
            <MockBtn
              sm
              kind="danger"
              icon="trash"
              onClick={() => {
                onRemove()
                onClose()
              }}
            >
              Entfernen
            </MockBtn>
          ) : null}
          <div style={{ flex: 1 }} />
          <MockBtn sm kind="primary" icon="check" onClick={onClose}>
            Fertig
          </MockBtn>
        </>
      }
    >
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
            value={p.beschreibung ?? ''}
            onChange={(e) => onChange({ beschreibung: e.target.value })}
            rows={2}
            placeholder="Details zur Leistung…"
          />
        </Field>
        <Field label="Menge">
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
            >
              {POSITION_MENGE_EINHEITEN.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Einzelpreis (netto)">
          <div className="txt-prefix">
            <span className="prefix">€</span>
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
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>
            {formatEurBetrag(line)}
          </div>
        </Field>
      </div>
    </MockModal>
  )
}
