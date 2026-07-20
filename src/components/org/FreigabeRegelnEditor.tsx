'use client'

import { MockField, MockFormSection } from '@/components/mock-ui/MockForm'
import { MockChip } from '@/components/mock-ui/MockPrimitives'
import type { FreigabeModus } from '@/lib/types'

export type FreigabeRegelnValue = {
  freigabe_modus: FreigabeModus
  freigabe_schwelle_eur: string
  notfall_direkt: boolean
}

type Props = {
  value: FreigabeRegelnValue
  onChange: (next: FreigabeRegelnValue) => void
  disabled?: boolean
  className?: string
}

/** HV-Freigaberegeln — eingebettet in Organisation & Portal (Mock-Form-Stil). */
export function FreigabeRegelnEditor({ value, onChange, disabled, className }: Props) {
  const freigabeAktiv = value.freigabe_modus === 'freigabe'

  function patch(partial: Partial<FreigabeRegelnValue>) {
    if (disabled) return
    onChange({ ...value, ...partial })
  }

  return (
    <MockFormSection title="Freigabe-Regeln" icon="shield-check" className={className}>
      <MockField
        label="Freigabe-Modus"
        full
        hint={
          freigabeAktiv
            ? 'Organisation muss Angebote/Aufträge freigeben — optional ab einer Betragsschwelle.'
            : 'Angebote und Aufträge starten ohne Freigabe durch die Organisation.'
        }
      >
        <div className="chiprow">
          <MockChip
            active={value.freigabe_modus === 'direkt'}
            onClick={() => patch({ freigabe_modus: 'direkt' })}
          >
            Direkt
          </MockChip>
          <MockChip
            active={freigabeAktiv}
            onClick={() => patch({ freigabe_modus: 'freigabe' })}
          >
            Mit Freigabe
          </MockChip>
        </div>
      </MockField>

      {freigabeAktiv ? (
        <>
          <MockField
            label="Schwelle (€ netto)"
            hint="Leer = immer Freigabe nötig. Darüber Freigabe, darunter direkt."
          >
            <input
              className="txt"
              type="number"
              min={0}
              step={100}
              placeholder="z. B. 500"
              disabled={disabled}
              value={value.freigabe_schwelle_eur}
              onChange={(e) => patch({ freigabe_schwelle_eur: e.target.value })}
            />
          </MockField>
          <MockField
            label="Notfall"
            full
            hint="Gilt für Notfall-Meldungen über den HV-Melde-Link."
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                cursor: disabled ? 'not-allowed' : 'pointer',
                minHeight: 36,
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={value.notfall_direkt}
                onChange={(e) => patch({ notfall_direkt: e.target.checked })}
              />
              Notfall umgeht Freigabe
            </label>
          </MockField>
        </>
      ) : null}
    </MockFormSection>
  )
}
