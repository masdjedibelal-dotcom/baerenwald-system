'use client'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'

import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { DetailVisual } from '@/components/layout/EntityDetailLayout'
import type { TeamAuslastungEintrag } from '@/lib/kalender-auslastung'

export function KalenderTeamAuslastung({ members }: { members: TeamAuslastungEintrag[] }) {
  if (!members.length) {
    return (
      <Card title="Diese Woche · Auslastung">
        <MockEmpty title="Keine Teamdaten verfügbar." />
      </Card>
    )
  }

  return (
    <Card title="Diese Woche · Auslastung">
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
              style={{ gridTemplateColumns: '2.25rem 1fr minmax(0, 1fr) 2.75rem' }}
            >
              <DetailVisual tone={m.load > 85 ? 'gold' : 'green'} initials={initials} />
              <span className="truncate text-fs-text text-bw-text">{m.name}</span>
              <ProgressBar value={m.load} color={m.load > 85 ? 'orange' : 'green'} />
              <span className="text-right text-xs font-medium tabular-nums text-bw-text">{m.load}%</span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
