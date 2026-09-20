'use client'
import { DateInput } from '@/components/ui/DateInput'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import type { CustomFieldDefinition } from '@/lib/custom-fields'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
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
        <MockField required={def.pflicht}><RichTextEditor value={typeof (value) === 'string' ? (value) : ''} onChange={(__v) => onChange(__v)} disabled={disabled} minHeight={120} /></MockField>
      )
    case 'number':
      return (
        <MockInput type="number" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={def.pflicht} />
      )
    case 'date':
      return (
        <DateInput value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={def.pflicht} />
      )
    case 'boolean':
      return (
        <label className="flex items-center gap-2 text-sm">
          <MockCheckbox
            checked={value === 'true' || value === '1'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            disabled={disabled}
          />
          Ja
        </label>
      )
    case 'select':
      return (
        <MockSelect value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={def.pflicht}>
          <option value="">—</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </MockSelect>
      )
    default:
      return (
        <MockInput type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} required={def.pflicht} />
      )
  }
}
