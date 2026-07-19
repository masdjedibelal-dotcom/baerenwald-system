'use client'

import { useState } from 'react'
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

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 14,
          paddingBottom: 8,
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.01em' }}>{title}</span>
        <div style={{ flex: 1 }} />
      </div>
      <div>{children}</div>
    </div>
  )
}

function SettingToggle({ row }: { row: ToggleRow }) {
  const [on, setOn] = useState(row.defaultOn ?? false)
  return (
    <div className="setting-row">
      <div>
        <div className="lbl">{row.label}</div>
        <div className="sub">{row.sub}</div>
      </div>
      <button
        type="button"
        className={`switch${on ? ' on' : ''}`}
        aria-pressed={on}
        onClick={() => {
          setOn((v) => !v)
          toast.success(`${row.label}: ${!on ? 'aktiviert' : 'deaktiviert'}`)
        }}
      />
    </div>
  )
}

/** Mock-Parität: Benachrichtigungen als Setting-Rows mit Switches. */
export function EinstellungenBenachrichtigungenCard() {
  return (
    <Sec title="Benachrichtigungen">
      {BENACHRICHTIGUNGEN.map((row) => (
        <SettingToggle key={row.id} row={row} />
      ))}
    </Sec>
  )
}
