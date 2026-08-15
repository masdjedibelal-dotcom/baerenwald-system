'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { EinstellungenSectionHeading } from '@/components/einstellungen/EinstellungenUi'

const INTEGRATIONEN = [
  { name: 'DATEV Export', desc: 'Buchhaltungs-Schnittstelle', on: true },
  { name: 'GMX / Web.de Mail', desc: 'SMTP für Rechnungsversand', on: true },
  { name: 'Webformular Lead-Sync', desc: 'baerenwald-bau.de Kontaktformular', on: true },
  { name: 'Telekom CallCenter', desc: 'Anruf-Logging & Anrufnotizen', on: false },
  { name: 'Google Calendar', desc: 'Termine synchronisieren', on: true },
  { name: 'WhatsApp Business', desc: 'Kundenkommunikation', on: false },
]

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <EinstellungenSectionHeading className="mb-3.5">{title}</EinstellungenSectionHeading>
      <div>{children}</div>
    </div>
  )
}

/** Mock-Parität: Integrationen als Setting-Rows mit Switches. */
export function EinstellungenIntegrationenMock() {
  const [state, setState] = useState(() =>
    Object.fromEntries(INTEGRATIONEN.map((it) => [it.name, it.on])) as Record<string, boolean>
  )

  return (
    <Sec title="Integrationen">
      {INTEGRATIONEN.map((it) => {
        const on = state[it.name] ?? it.on
        return (
          <div key={it.name} className="setting-row">
            <div>
              <div className="lbl">{it.name}</div>
              <div className="sub">{it.desc}</div>
            </div>
            <button
              type="button"
              className={`switch${on ? ' on' : ''}`}
              aria-pressed={on}
              onClick={() => {
                setState((s) => ({ ...s, [it.name]: !on }))
                toast.success(`${it.name}${on ? ' deaktiviert' : ' aktiviert'} (Demo)`)
              }}
            />
          </div>
        )
      })}
    </Sec>
  )
}
