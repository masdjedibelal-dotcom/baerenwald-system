'use client'

import { Shield } from 'lucide-react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { FreigabeModus } from '@/lib/types'

export type FreigabeRegelnValue = {
  freigabe_modus: FreigabeModus
  freigabe_schwelle_eur: string
  notfall_direkt: boolean
}

const FREIGABE_MODUS_OPTS = [
  { value: 'direkt', label: 'Direkt — ohne Org-Freigabe' },
  { value: 'freigabe', label: 'Freigabe — Organisation muss freigeben' },
]

/** Spec Phase D — HV-Freigaberegeln (Autopass/Schwelle/Notfall). */
export function FreigabeRegelnEditor({
  value,
  onChange,
  disabled,
  compact,
}: {
  value: FreigabeRegelnValue
  onChange: (next: FreigabeRegelnValue) => void
  disabled?: boolean
  compact?: boolean
}) {
  const freigabeAktiv = value.freigabe_modus === 'freigabe'

  return (
    <MockCard
      title={
        <span className="inline-flex items-center gap-2">
          <Shield className="h-4 w-4 text-bw-primary" aria-hidden />
          Freigabe-Regeln
        </span>
      }
      bodyClassName={compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}
    >
      <Select
        label="Freigabe-Modus"
        name="freigabe_modus"
        value={value.freigabe_modus}
        disabled={disabled}
        onChange={(e) =>
          onChange({
            ...value,
            freigabe_modus: e.target.value as FreigabeModus,
          })
        }
        options={FREIGABE_MODUS_OPTS}
      />
      {freigabeAktiv ? (
        <>
          <Input
            label="Freigabe-Schwelle (€ netto)"
            type="number"
            min={0}
            step={100}
            disabled={disabled}
            value={value.freigabe_schwelle_eur}
            onChange={(e) => onChange({ ...value, freigabe_schwelle_eur: e.target.value })}
            hint="Leer = immer Freigabe nötig. Darüber = Freigabe, darunter = direkt."
          />
          <label className="flex cursor-pointer items-start gap-2 text-sm text-bw-text">
            <input
              type="checkbox"
              className="mt-0.5"
              disabled={disabled}
              checked={value.notfall_direkt}
              onChange={(e) => onChange({ ...value, notfall_direkt: e.target.checked })}
            />
            <span>
              <span className="font-medium">Notfall bypass</span>
              <span className="mt-0.5 block text-xs text-bw-text-muted">
                Notfall-Meldungen (HV) ohne Org-Freigabe — auch über Schwelle.
              </span>
            </span>
          </label>
        </>
      ) : null}
    </MockCard>
  )
}
