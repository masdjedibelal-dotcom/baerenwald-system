'use client'

import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import { WerkzeugPanel } from '@/components/crm/WerkzeugPanel'
import { cn } from '@/lib/utils'
import type { FreigabeModus } from '@/lib/types'

export type FreigabeRegelnValue = {
  freigabe_modus: FreigabeModus
  freigabe_schwelle_eur: string
  notfall_direkt: boolean
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

/** HV-Freigaberegeln: immer Angebot; unter Schwelle Auto-Auftrag; darüber Freigabe/Annahme. */
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
      ? 'Immer Angebot — unter und über der Schwelle wird ohne Freigabe automatisch beauftragt.'
      : hatSchwelle
        ? `Immer Angebot. Bis ${schwelleLabel} automatisch Auftrag (ohne Annahme) — darüber wartet Freigabe/Annahme.`
        : 'Immer Angebot. Ohne gesetzte Schwelle braucht jedes Angebot Freigabe/Annahme.'

  const tiles = [
    {
      id: 'freigabe' as const,
      title: 'Freigabe oberhalb',
      desc: hatSchwelle
        ? `Über ${schwelleLabel}: Freigabe nötig. Darunter: Auto-Auftrag.`
        : 'Jedes Angebot braucht Freigabe.',
    },
    {
      id: 'direkt' as const,
      title: 'Immer automatisch',
      desc: 'Kein Warten auf Freigabe — Angebot wird direkt zum Auftrag.',
    },
    {
      id: 'notfall' as const,
      title: 'Akut ohne Angebot',
      desc: 'Nur Notfall/Akut: Direktauftrag möglich. Sonst wie Freigabe oberhalb.',
    },
  ]

  return (
    <WerkzeugPanel
      className={className}
      title="Freigabe-Regeln"
      icon="shield-check"
      purpose={purpose}
    >
      <MockFormSection>
        <MockField
          label="Automatisch beauftragen bis"
          full
          hint="Gilt für alle Objekte ohne eigene Ausnahme. Immer zuerst Angebot — darunter Auto-Auftrag."
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
                  fontSize: 'var(--fs-text)',
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
                  className={cn('werkzeug-tile', on && 'on')}
                  onClick={() => patch(patchFromFreigabeBehandlung(opt.id))}
                >
                  <span className="werkzeug-tile-title">{opt.title}</span>
                  <span className="werkzeug-tile-desc">{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </MockField>
      </MockFormSection>
    </WerkzeugPanel>
  )
}
