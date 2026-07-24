'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandAvatar } from '@/components/brand/BrandAvatar'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { createClient } from '@/lib/supabase'
import { MEHR_TILE_NAV } from '@/lib/nav-config'

const ICON_MAP: Record<string, string> = {
  Kunden: 'users',
  Partner: 'tool',
  Netzwerk: 'building',
  Einstellungen: 'settings',
  'KI Intelligence': 'sparkles',
}

export function MehrScreenClient({
  userName = 'Beran Bärenwald',
  userRole = 'Inhaber · Bärenwald München',
}: {
  userName?: string
  userRole?: string
  /** @deprecated Immer Brand-Logo als Avatar */
  initials?: string
}) {
  const router = useRouter()
  const [logoutLoading, setLogoutLoading] = useState(false)

  async function handleLogout() {
    if (!window.confirm('Wirklich abmelden?')) return
    setLogoutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
    setLogoutLoading(false)
  }

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
        <BrandAvatar size={44} aria-hidden />
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
              <MockIcon ctx="default" n={ICON_MAP[it.label] ?? 'dots'} size={24} />
            </div>
            <div className="mehr-tile-label">{it.label}</div>
            <div className="mehr-tile-desc">{it.desc}</div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '0 4px' }}>
        <MockBtn
          kind="danger"
          disabled={logoutLoading}
          onClick={() => void handleLogout()}
          className="w-full"
        >
          {logoutLoading ? 'Abmelden…' : 'Abmelden'}
        </MockBtn>
      </div>
    </div>
  )
}
