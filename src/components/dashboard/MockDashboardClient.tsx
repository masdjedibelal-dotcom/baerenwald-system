'use client'

import { useRouter } from 'next/navigation'
import {
  MockBadge,
  MockBtn,
  MockCard,
  MockCardArrowAction,
  MockIcon,
} from '@/components/mock-ui'

export type MockDashboardKpi = {
  icon: string
  label: string
  value: number
  href: string
}

export type MockDashboardPhaseRow = {
  id: string
  title: string
  sub: string
  badgeKind?: string
  badgeLabel?: string
  href: string
}

export type MockDashboardPhase = {
  key: string
  title: string
  icon: string
  href: string
  rows: MockDashboardPhaseRow[]
}

export function MockDashboardClient({
  vorname,
  kpis,
  phasen,
}: {
  vorname: string
  kpis: MockDashboardKpi[]
  phasen: MockDashboardPhase[]
}) {
  const router = useRouter()

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend'
  })()

  const dateStr = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>{dateStr}</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 650,
            letterSpacing: '-0.02em',
            marginTop: 2,
          }}
        >
          {greeting}, {vorname}
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            className="kpi-card"
            onClick={() => router.push(k.href)}
          >
            <div className="kpi-ico">
              <MockIcon n={k.icon} size={19} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="kpi-val">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="phase-grid">
        {phasen.map((p) => (
          <MockCard
            key={p.key}
            title={p.title}
            icon={p.icon}
            actions={<MockCardArrowAction onClick={() => router.push(p.href)} />}
          >
            <div style={{ margin: -14 }}>
              {p.rows.length === 0 ? (
                <div style={{ padding: 14, fontSize: 12.5, color: 'var(--text-4)' }}>
                  Nichts offen
                </div>
              ) : (
                p.rows.map((r) => (
                  <div
                    key={r.id}
                    className="list-row"
                    style={{
                      gridTemplateColumns: '1fr auto',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onClick={() => router.push(r.href)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        router.push(r.href)
                      }
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--text-3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.sub}
                      </div>
                    </div>
                    {r.badgeLabel ? (
                      <MockBadge kind={r.badgeKind}>{r.badgeLabel}</MockBadge>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </MockCard>
        ))}
      </div>
    </div>
  )
}
