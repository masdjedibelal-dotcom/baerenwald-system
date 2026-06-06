'use client'

import { Textarea } from '@/components/ui/Textarea'
import type { CustomFieldDefinition } from '@/lib/custom-fields'

type Props = {
  def: CustomFieldDefinition
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function CustomFieldRenderer({ def, value, onChange, disabled }: Props) {
  const opts =
    def.feld_typ === 'select' && def.optionen && Array.isArray(def.optionen)
      ? (def.optionen as { value: string; label: string }[])
      : []

  switch (def.feld_typ) {
    case 'textarea':
      return (
        <Textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={def.pflicht}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={def.pflicht}
        />
      )
    case 'date':
      return (
        <input
          type="date"
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={def.pflicht}
        />
      )
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value === 'true' || value === '1'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            disabled={disabled}
          />
          Ja
        </label>
      )
    case 'select':
      return (
        <select
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={def.pflicht}
        >
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    default:
      return (
        <input
          type="text"
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={def.pflicht}
        />
      )
  }
}
