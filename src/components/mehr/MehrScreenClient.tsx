'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandAvatar } from '@/components/brand/BrandAvatar'
import { abmelden } from '@/lib/auth/abmelden-client'
import { MEHR_TILE_NAV } from '@/lib/nav-config'

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
    setLogoutLoading(true)
    try {
      await abmelden(router)
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <div className="mehr-screen">
      <div className="mehr-profile">
        <BrandAvatar size={44} aria-hidden />
        <div className="mehr-profile-meta">
          <div className="mehr-profile-name">{userName}</div>
          <div className="mehr-profile-role">{userRole}</div>
        </div>
        <Link href="/einstellungen/firma" className="mehr-profile-link">
          <MockBtn sm icon="settings" kind="ghost" title="Einstellungen" aria-label="Einstellungen" />
        </Link>
      </div>

      <div className="mehr-grid">
        {MEHR_TILE_NAV.map((it) => (
          <Link key={it.href} href={it.href} className="mehr-tile">
            <div className="mehr-tile-icon">
              <MockIcon ctx="default" n={it.iconName} size={24} />
            </div>
            <div className="mehr-tile-label">{it.label}</div>
            <div className="mehr-tile-desc">{it.desc}</div>
          </Link>
        ))}
      </div>

      <MockBtn className="mehr-logout" type="button" disabled={logoutLoading} onClick={() => void handleLogout()}>
        {logoutLoading ? 'Abmelden…' : 'Abmelden'}
      </MockBtn>
    </div>
  )
}
