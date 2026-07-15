'use client'

import Link from 'next/link'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MEHR_TILE_NAV } from '@/lib/nav-config'

const ICON_MAP: Record<string, string> = {
  Kunden: 'users',
  Handwerker: 'tool',
  Partner: 'building',
  Einstellungen: 'settings',
}

export function MehrScreenClient({
  userName = 'Beran Bärenwald',
  userRole = 'Inhaber · Bärenwald München',
  initials = 'BB',
}: {
  userName?: string
  userRole?: string
  initials?: string
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          marginBottom: 16,
          background: 'var(--card)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--r)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--green)',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{userName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{userRole}</div>
        </div>
        <Link href="/einstellungen/profil">
          <MockBtn sm icon="settings" kind="ghost">
            Profil
          </MockBtn>
        </Link>
      </div>

      <div className="mehr-grid">
        {MEHR_TILE_NAV.map((it) => (
          <Link key={it.href} href={it.href} className="mehr-tile">
            <div className="mehr-tile-icon">
              <MockIcon n={ICON_MAP[it.label] ?? 'dots'} size={24} />
            </div>
            <div className="mehr-tile-label">{it.label}</div>
            <div className="mehr-tile-desc">{it.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
