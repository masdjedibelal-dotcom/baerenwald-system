'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  WIEDERKEHR_TURNUS_LABELS,
  WIEDERKEHR_TURNUS_VALUES,
  type WiederkehrTurnus,
  type VorgangWiederkehr,
} from '@/lib/vorgang/wiederkehrend'

type Props = {
  value: VorgangWiederkehr
  onChange: (next: VorgangWiederkehr) => void
  /** Kurzer Kontext-Hinweis unter der Überschrift */
  hint?: string
  className?: string
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
}: Props) {
  const ist = value.ist_wiederkehrend
  const turnus = value.wiederkehr_turnus ?? 'monatlich'

  return (
    <div className={className} style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
          Art des Vorgangs
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 2 }}>{hint}</div>
      </div>
      <div className="doctype-row">
        <label
          className={`doctype-radio-opt${!ist ? ' on' : ''}`}
          onClick={() =>
            onChange({ ist_wiederkehrend: false, wiederkehr_turnus: null })
          }
        >
          <span className="dot" />
          <MockIcon ctx="default" n="file-text" size={16} />
          <span className="lbl">Einmalig</span>
          <span className="hint">Klassischer Auftrag mit Abschluss</span>
        </label>
        <label
          className={`doctype-radio-opt${ist ? ' on' : ''}`}
          onClick={() =>
            onChange({
              ist_wiederkehrend: true,
              wiederkehr_turnus: value.wiederkehr_turnus ?? 'monatlich',
            })
          }
        >
          <span className="dot" />
          <MockIcon ctx="default" n="refresh" size={16} />
          <span className="lbl">Wiederkehrend</span>
          <span className="hint">Bestand — erzeugt regelmäßige Einsätze</span>
        </label>
      </div>
      {ist ? (
        <div style={{ marginTop: 12, maxWidth: 360 }}>
          <label className="field">
            <span className="field-label">Zeitintervall</span>
            <select
              className="sel"
              value={turnus}
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
