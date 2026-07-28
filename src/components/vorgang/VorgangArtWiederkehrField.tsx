'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  WIEDERKEHR_TURNUS_LABELS,
  WIEDERKEHR_TURNUS_VALUES,
  type WiederkehrTurnus,
  type VorgangWiederkehr,
} from '@/lib/vorgang/wiederkehrend'
import { cn } from '@/lib/utils'

type Props = {
  value: VorgangWiederkehr
  onChange: (next: VorgangWiederkehr) => void
  /** Kurzer Kontext-Hinweis unter der Überschrift */
  hint?: string
  className?: string
  disabled?: boolean
}

/**
 * Art des Vorgangs: Einmalig vs. Wiederkehrend (+ Turnus).
 * Für Anfrage, Angebot, Auftrag, Rechnung.
 */
export function VorgangArtWiederkehrField({
  value,
  onChange,
  hint = 'Einmalig oder wiederkehrend (Wartung, Winterdienst, Hausmeisterservice)',
  className,
  disabled = false,
}: Props) {
  const ist = value.ist_wiederkehrend
  const turnus = value.wiederkehr_turnus ?? 'monatlich'

  return (
    <div className={className} style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 'var(--fs-title)', fontWeight: 600, letterSpacing: '-0.01em' }}>
          Art der Leistung
        </div>
        <div style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)', marginTop: 2 }}>{hint}</div>
      </div>
      <div className="doctype-row">
        <button
          type="button"
          disabled={disabled}
          className={cn('doctype-radio-opt', !ist && 'on')}
          onClick={() => onChange({ ist_wiederkehrend: false, wiederkehr_turnus: null })}
        >
          <span className="dot" aria-hidden />
          <MockIcon ctx="default" n="file-text" size={16} />
          <span className="lbl">Einmalig</span>
          <span className="hint">Klassischer Auftrag mit Abschluss</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          className={cn('doctype-radio-opt', ist && 'on')}
          onClick={() =>
            onChange({
              ist_wiederkehrend: true,
              wiederkehr_turnus: value.wiederkehr_turnus ?? 'monatlich',
            })
          }
        >
          <span className="dot" aria-hidden />
          <MockIcon ctx="default" n="refresh" size={16} />
          <span className="lbl">Monatlich / wiederkehrend</span>
          <span className="hint">Bestand — regelmäßige Einsätze</span>
        </button>
      </div>
      {ist ? (
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <label className="field">
            <span className="field-label">Zeitintervall</span>
            <select
              className="sel"
              value={turnus}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ist_wiederkehrend: true,
                  wiederkehr_turnus: e.target.value as WiederkehrTurnus,
                })
              }
            >
              {WIEDERKEHR_TURNUS_VALUES.map((v) => (
                <option key={v} value={v}>
                  {WIEDERKEHR_TURNUS_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  )
}
