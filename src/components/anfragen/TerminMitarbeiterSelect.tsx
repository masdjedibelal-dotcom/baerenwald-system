'use client'

import { MockSelect } from '@/components/mock-ui/MockForm'
import type { CrmTeamMitglied } from '@/lib/crm-team'

type Props = {
  team: CrmTeamMitglied[]
  value: string
  onChange: (id: string) => void
  loading?: boolean
  required?: boolean
}

export function TerminMitarbeiterSelect({ team, value, onChange, loading, required }: Props) {
  return (
    <label className="md:col-span-2">
      <span className="input-label">
        Vor-Ort Mitarbeiter{required ? ' *' : ''}
      </span>
      <MockSelect value={value} onChange={(e) => onChange(e.target.value)} disabled={loading} required={required}>
        <option value="">{loading ? 'Laden…' : 'Bitte wählen…'}</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.telefon ? ` · ${m.telefon}` : ''}
          </option>
        ))}
      </MockSelect>
    </label>
  )
}
