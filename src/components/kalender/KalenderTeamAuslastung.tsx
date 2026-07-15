'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { DetailVisual } from '@/components/layout/DetailHead'
import type { TeamAuslastungEintrag } from '@/lib/kalender-auslastung'

export function KalenderTeamAuslastung({ members }: { members: TeamAuslastungEintrag[] }) {
  if (!members.length) {
    return (
      <MockCard title="Diese Woche · Auslastung" icon="users">
        <MockEmpty icon="users" title="Keine Teamdaten" hint="Noch keine Auslastungsdaten verfügbar." />
      </MockCard>
    )
  }

  return (
    <MockCard title="Diese Woche · Auslastung" icon="users">
      <ul className="space-y-3">
        {members.map((m) => {
          const initials = m.name
            .split(/\s+/)
            .map((s) => s[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          return (
            <li
              key={m.id}
              className="grid items-center gap-3"
              style={{ gridTemplateColumns: '36px 1fr minmax(0, 1fr) 44px' }}
            >
              <DetailVisual tone={m.load > 85 ? 'gold' : 'green'} initials={initials} />
              <span className="truncate text-[13px] text-bw-text">{m.name}</span>
              <ProgressBar value={m.load} color={m.load > 85 ? 'orange' : 'green'} />
              <span className="text-right text-xs font-medium tabular-nums text-bw-text">{m.load}%</span>
            </li>
          )
        })}
      </ul>
    </MockCard>
  )
}
