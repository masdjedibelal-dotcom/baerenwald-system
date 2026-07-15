'use client'

import { useState } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { toast } from '@/components/ui/app-toast'

type ToggleRow = {
  id: string
  label: string
  sub: string
  defaultOn?: boolean
}

const BENACHRICHTIGUNGEN: ToggleRow[] = [
  { id: 'notif_leads', label: 'Neue Anfragen', sub: 'Sofortige Benachrichtigung bei Web-Leads', defaultOn: true },
  { id: 'notif_abnahme', label: 'Anstehende Abnahmen', sub: '24h vor jedem Abnahmetermin', defaultOn: true },
  { id: 'notif_rechnung', label: 'Überfällige Rechnungen', sub: 'Wöchentlich · jeden Montag 09:00', defaultOn: false },
  { id: 'notif_system', label: 'System-Updates', sub: 'Wartung, neue Funktionen', defaultOn: true },
]

function MockSettingToggle({ row }: { row: ToggleRow }) {
  const [on, setOn] = useState(row.defaultOn ?? false)
  return (
    <div className="setting-row">
      <div>
        <div className="lbl">{row.label}</div>
        <div className="sub">{row.sub}</div>
      </div>
      <button
        type="button"
        className={`sw${on ? ' on' : ''}`}
        aria-pressed={on}
        onClick={() => {
          setOn((v) => !v)
          toast.success(`${row.label}: ${!on ? 'aktiviert' : 'deaktiviert'}`)
        }}
      />
    </div>
  )
}

export function EinstellungenBenachrichtigungenCard() {
  return (
    <MockCard title="Benachrichtigungen" icon="bell">
      {BENACHRICHTIGUNGEN.map((row) => (
        <MockSettingToggle key={row.id} row={row} />
      ))}
    </MockCard>
  )
}
