'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'

export type MockUebersichtStat = {
  icon: string
  label: string
  value: React.ReactNode
}

export function MockUebersichtCard({ stats }: { stats: MockUebersichtStat[] }) {
  return (
    <div className="ueber-grid">
      {stats.map((s, i) => (
        <div key={i} className="ueber-kpi">
          <div className="ueber-ico">
            <MockIcon n={s.icon} size={17} />
          </div>
          <div className="ueber-val">{s.value}</div>
          <div className="ueber-label">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
