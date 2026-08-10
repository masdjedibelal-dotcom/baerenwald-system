'use client'

import { useState } from 'react'
import { MockField } from '@/components/mock-ui/MockForm'
import { DateInput } from '@/components/ui/DateInput'
import { cn } from '@/lib/utils'

export type LeistungszeitraumModus = 'zeitraum' | 'tag'

function initialModus(von: string, bis: string): LeistungszeitraumModus {
  const v = von.trim()
  const b = bis.trim()
  if (v && b && v === b) return 'tag'
  return 'zeitraum'
}

/** Leistungszeitraum: Toggle Zeitraum | Ein Tag → zwei Datumsfelder oder eines. */
export function LeistungszeitraumFields({
  von,
  bis,
  onChange,
  hint,
  className,
}: {
  von: string
  bis: string
  onChange: (next: { von: string; bis: string }) => void
  hint?: string
  className?: string
}) {
  const [modus, setModus] = useState<LeistungszeitraumModus>(() => initialModus(von, bis))

  function setModusSafe(next: LeistungszeitraumModus) {
    setModus(next)
    if (next === 'tag') {
      const day = von.trim() || bis.trim()
      onChange({ von: day, bis: day })
    }
  }

  return (
    <div className={cn('wizard-zahlung-lz', className)}>
      <div className="wizard-zahlung-lz__head">
        <span className="wizard-zahlung-lz__label">Leistungszeitraum</span>
        <div className="seg" role="group" aria-label="Leistungszeitraum-Modus">
          <button
            type="button"
            className={modus === 'zeitraum' ? 'on' : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setModusSafe('zeitraum')}
          >
            Zeitraum
          </button>
          <button
            type="button"
            className={modus === 'tag' ? 'on' : undefined}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setModusSafe('tag')}
          >
            Ein Tag
          </button>
        </div>
      </div>
      {hint ? <p className="wizard-zahlung-lz__hint">{hint}</p> : null}
      <div
        className={cn(
          'wizard-zahlung-dates',
          modus === 'tag' && 'wizard-zahlung-dates--single'
        )}
      >
        <MockField label={modus === 'tag' ? 'Datum' : 'Von'}>
          <DateInput
            size="sm"
            value={von}
            onChange={(e) => {
              const v = e.target.value
              onChange(modus === 'tag' ? { von: v, bis: v } : { von: v, bis })
            }}
          />
        </MockField>
        {/* Immer gemountet — Unmount öffnet sonst iOS-Datepicker neu */}
        <MockField
          label="Bis"
          className={modus === 'tag' ? 'wizard-zahlung-dates__hidden' : undefined}
        >
          <DateInput
            size="sm"
            value={bis}
            onChange={(e) => onChange({ von, bis: e.target.value })}
            tabIndex={modus === 'tag' ? -1 : undefined}
          />
        </MockField>
      </div>
    </div>
  )
}
