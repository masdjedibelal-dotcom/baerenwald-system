'use client'

import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { WerkzeugPanel } from '@/components/crm/WerkzeugPanel'
import { cn } from '@/lib/utils'
import type { FreigabeModus } from '@/lib/types'

export type FreigabeRegelnValue = {
  freigabe_modus: FreigabeModus
  freigabe_schwelle_eur: string
  notfall_direkt: boolean
  kleinreparaturen_ohne_angebot: boolean
}

/** UI-Auswahl für Angebots-Freigabe oberhalb der Schwelle */
export type FreigabeBehandlung = 'freigabe' | 'direkt' | 'notfall'

type Props = {
  value: FreigabeRegelnValue
  onChange: (next: FreigabeRegelnValue) => void
  disabled?: boolean
  className?: string
}

const SCHWELLE_CHIPS = [
  { label: '250 €', value: '250' },
  { label: '500 €', value: '500' },
  { label: '1k €', value: '1000' },
  { label: '2k €', value: '2000' },
] as const

export function freigabeBehandlungFromValue(
  freigabeModus: FreigabeModus,
  notfallDirekt: boolean
): FreigabeBehandlung {
  if (freigabeModus === 'direkt') return 'direkt'
  if (notfallDirekt) return 'notfall'
  return 'freigabe'
}

export function patchFromFreigabeBehandlung(
  behandlung: FreigabeBehandlung
): Pick<FreigabeRegelnValue, 'freigabe_modus' | 'notfall_direkt'> {
  if (behandlung === 'direkt') {
    return { freigabe_modus: 'direkt', notfall_direkt: false }
  }
  if (behandlung === 'notfall') {
    return { freigabe_modus: 'freigabe', notfall_direkt: true }
  }
  return { freigabe_modus: 'freigabe', notfall_direkt: false }
}

function formatSchwelleLabel(raw: string): string {
  const n = Number(String(raw).replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `${Math.round(n).toLocaleString('de-DE')} €`
}

/** HV-Freigaberegeln — Werkzeug-Panel: Schwelle + 3 Modi, Rest unter Erweitert. */
export function FreigabeRegelnEditor({ value, onChange, disabled, className }: Props) {
  const behandlung = freigabeBehandlungFromValue(value.freigabe_modus, value.notfall_direkt)
  const schwelleLabel = formatSchwelleLabel(value.freigabe_schwelle_eur)
  const schwelleNum = Number(String(value.freigabe_schwelle_eur).replace(',', '.'))
  const hatSchwelle = Number.isFinite(schwelleNum) && schwelleNum > 0

  function patch(partial: Partial<FreigabeRegelnValue>) {
    if (disabled) return
    onChange({ ...value, ...partial })
  }

  const purpose =
    behandlung === 'direkt'
      ? 'Alle Angebote werden ohne Freigabe direkt beauftragt.'
      : hatSchwelle
        ? `Bis ${schwelleLabel} automatisch beauftragen — darüber braucht die Organisation Freigabe.`
        : 'Angebote brauchen die Freigabe der Organisation (keine Betrags-Schwelle gesetzt).'

  const tiles = [
    {
      id: 'freigabe' as const,
      lbl: 'Freigabe nötig',
      hint: 'Über der Schwelle manuell freigeben.',
    },
    {
      id: 'direkt' as const,
      lbl: 'Immer direkt',
      hint: 'Ohne Freigabe beauftragen.',
    },
    {
      id: 'notfall' as const,
      lbl: 'Nur Notfälle',
      hint: 'Notfall sofort, sonst Freigabe.',
    },
  ] as const

  return (
    <WerkzeugPanel
      className={className}
      title="Freigabe-Regeln"
      icon="shield-check"
      purpose={purpose}
      advanced={
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Kleinreparaturen ohne Angebot
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-3)', margin: '4px 0 0' }}>
              Kleine Reparaturen bis zum Grenzbetrag sofort erledigen — ohne vorheriges Angebot.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={value.kleinreparaturen_ohne_angebot}
            disabled={disabled}
            className={cn('switch', value.kleinreparaturen_ohne_angebot && 'on')}
            onClick={() =>
              patch({ kleinreparaturen_ohne_angebot: !value.kleinreparaturen_ohne_angebot })
            }
            title={
              value.kleinreparaturen_ohne_angebot
                ? 'Kleinreparaturen ohne Angebot: an'
                : 'Kleinreparaturen ohne Angebot: aus'
            }
            style={{ marginTop: 2, opacity: disabled ? 0.6 : 1 }}
          />
        </div>
      }
    >
      <MockFormSection>
        <MockField
          label="Automatisch beauftragen bis"
          full
          hint="Gilt für alle Objekte ohne eigene Ausnahme."
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 140 }}>
              <input
                className="txt"
                type="number"
                min={0}
                step={50}
                placeholder="500"
                disabled={disabled}
                value={value.freigabe_schwelle_eur}
                onChange={(e) => patch({ freigabe_schwelle_eur: e.target.value })}
                style={{ paddingRight: 28 }}
              />
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 13,
                  color: 'var(--text-3)',
                  pointerEvents: 'none',
                }}
              >
                €
              </span>
            </div>
            <div className="chiprow">
              {SCHWELLE_CHIPS.map((c) => (
                <MockChip
                  key={c.value}
                  active={value.freigabe_schwelle_eur === c.value}
                  onClick={() => {
                    if (disabled) return
                    patch({ freigabe_schwelle_eur: c.value })
                  }}
                >
                  {c.label}
                </MockChip>
              ))}
            </div>
          </div>
        </MockField>

        <MockField label="Oberhalb der Schwelle" full>
          <div className="werkzeug-tiles" role="radiogroup" aria-label="Freigabe-Modus">
            {tiles.map((opt) => {
              const on = behandlung === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={disabled}
                  className={cn('werkzeug-tile', on && 'is-on')}
                  onClick={() => patch(patchFromFreigabeBehandlung(opt.id))}
                >
                  <span className="werkzeug-tile__lbl">{opt.lbl}</span>
                  <span className="werkzeug-tile__hint">{opt.hint}</span>
                </button>
              )
            })}
          </div>
        </MockField>

        <div
          className="listcard full"
          style={{
            padding: '10px 12px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            background: 'var(--bg-soft)',
            border: '0.5px solid var(--border)',
          }}
        >
          <MockIcon ctx="default" n="info-circle" size={14} />
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-2)', margin: 0 }}>
            {purpose}
          </p>
        </div>
      </MockFormSection>
    </WerkzeugPanel>
  )
}
