'use client'

import { MockSegment } from '@/components/mock-ui/MockSegment'

export type DokFuer = 'intern' | 'kunde'

/** Pflichtwahl beim Upload: „Intern“ oder „Kunde“ (sieht es im Kundenportal) — keine Vorauswahl. */
export function DokFuerWahl({
  value,
  onChange,
  className,
}: {
  value: DokFuer | null
  onChange: (v: DokFuer) => void
  className?: string
}) {
  return (
    <div className={className ?? 'dok-art-wahl'}>
      <span className="dok-sort__label">Für</span>
      <MockSegment
        value={value ?? ''}
        onChange={(v) => onChange(v as DokFuer)}
        options={[
          { value: 'intern', label: 'Intern' },
          { value: 'kunde', label: 'Kunde' },
        ]}
        aria-label="Sichtbar für"
      />
    </div>
  )
}

export const DOK_FUER_FEHLT = 'Bitte zuerst wählen: Intern oder Kunde.'
