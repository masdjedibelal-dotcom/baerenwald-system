'use client'

import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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

/** HV-Freigaberegeln — Mock „Organisation & Portal“ (Standard-Regel + Freigabe + Kleinreparaturen). */
export function FreigabeRegelnEditor({ value, onChange, disabled, className }: Props) {
  const behandlung = freigabeBehandlungFromValue(value.freigabe_modus, value.notfall_direkt)
  const schwelleLabel = formatSchwelleLabel(value.freigabe_schwelle_eur)
  const schwelleNum = Number(String(value.freigabe_schwelle_eur).replace(',', '.'))
  const hatSchwelle = Number.isFinite(schwelleNum) && schwelleNum > 0

  function patch(partial: Partial<FreigabeRegelnValue>) {
    if (disabled) return
    onChange({ ...value, ...partial })
  }

  const infoText =
    behandlung === 'direkt'
      ? 'Alle Angebote werden ohne Freigabe direkt beauftragt.'
      : hatSchwelle
        ? `Angebote bis ${schwelleLabel} werden automatisch beauftragt. Ab ${schwelleLabel} ist die Freigabe der Organisation nötig.`
        : 'Angebote brauchen die Freigabe der Organisation (keine Betrags-Schwelle gesetzt).'

  return (
    <div className={cn('space-y-5', className)}>
      <MockFormSection title="Standard-Regel" icon="shield-check">
        <MockField
          label="Automatisch beauftragen bis"
          full
          hint="Gilt für alle Objekte ohne eigene Ausnahme. Legen Sie fest, bis zu welchem Betrag Angebote automatisch beauftragt werden."
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
            {infoText}
          </p>
        </div>
      </MockFormSection>

      <MockFormSection title="Angebots-Freigabe" icon="shield-check">
        <MockField
          label="Wie sollen Angebote oberhalb der Schwelle behandelt werden?"
          full
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(
              [
                {
                  id: 'freigabe' as const,
                  lbl: 'Freigabe erforderlich',
                  hint: 'Angebote über der Schwelle geben Sie manuell frei.',
                },
                {
                  id: 'direkt' as const,
                  lbl: 'Automatisch beauftragen',
                  hint: 'Alle Angebote werden ohne Freigabe direkt beauftragt.',
                },
                {
                  id: 'notfall' as const,
                  lbl: 'Nur Notfälle automatisch',
                  hint: 'Reguläre Angebote brauchen Freigabe, Notfälle laufen sofort.',
                },
              ] as const
            ).map((opt) => {
              const on = behandlung === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  className={cn('doctype-radio-opt', on && 'on')}
                  onClick={() => patch(patchFromFreigabeBehandlung(opt.id))}
                  style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '12px 14px',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="dot" style={{ marginTop: 2 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span className="lbl">{opt.lbl}</span>
                    <span className="hint">{opt.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </MockField>
      </MockFormSection>

      <MockFormSection title="Meldungen ohne Angebot" icon="tool">
        <div
          className="full"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '4px 0',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              Kleinreparaturen ohne Angebot ausführen
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-3)', margin: '4px 0 0' }}>
              Bärenwald darf kleine Reparaturen bis zum Grenzbetrag sofort erledigen — ohne vorheriges
              Angebot.
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
      </MockFormSection>
    </div>
  )
}
