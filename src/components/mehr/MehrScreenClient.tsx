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
  Handwerker: 'tool',
  Kalender: 'calendar',
  Einstellungen: 'settings',
  'KI Analytics': 'sparkles',
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
    await supabase.auth.signOut({ scope: "local" })
    router.replace('/login')
    router.refresh()
    setLogoutLoading(false)
  }

  return (
    <div className="mehr-screen">
      <div className="mehr-profile">
        <BrandAvatar size={44} aria-hidden />
        <div className="mehr-profile-meta">
          <div className="mehr-profile-name">{userName}</div>
          <div className="mehr-profile-role">{userRole}</div>
        </div>
        <Link href="/einstellungen/profil" className="mehr-profile-link">
          <MockBtn sm icon="settings" kind="ghost" title="Profil" aria-label="Profil" />
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

      <button
        type="button"
        className="mehr-logout"
        disabled={logoutLoading}
        onClick={() => void handleLogout()}
      >
        {logoutLoading ? 'Abmelden…' : 'Abmelden'}
      </button>
    </div>
  )
}
