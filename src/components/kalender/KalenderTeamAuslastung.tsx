'use client'

import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { DetailVisual } from '@/components/layout/DetailHead'
import type { TeamAuslastungEintrag } from '@/lib/kalender-auslastung'

export function KalenderTeamAuslastung({ members }: { members: TeamAuslastungEintrag[] }) {
  if (!members.length) {
    return (
      <Card title="Diese Woche · Auslastung">
        <p className="text-sm text-bw-text-muted">Keine Teamdaten verfügbar.</p>
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
    </Card>
  )
}
