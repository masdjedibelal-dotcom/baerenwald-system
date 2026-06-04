'use client'

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
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        required={required}
      >
        <option value="">{loading ? 'Laden…' : 'Bitte wählen…'}</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.telefon ? ` · ${m.telefon}` : ''}
          </option>
        ))}
      </select>
      <p className="form-field-hint mt-1">
        Erscheint in der Kunden-Mail und im Kalender mit Kundendetails.
      </p>
    </label>
  )
}
