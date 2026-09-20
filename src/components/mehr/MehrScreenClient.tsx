'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { openActionConfirm } from '@/components/ui/ConfirmPopup'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { BrandAvatar } from '@/components/brand/BrandAvatar'
import { createClient } from '@/lib/supabase'
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

  function handleLogout() {
    openActionConfirm({
      title: 'Wirklich abmelden?',
      body: 'Du wirst aus dem CRM ausgeloggt.',
      confirmLabel: 'Abmelden',
      cancelLabel: 'Abbrechen',
      danger: true,
      busyLabel: null,
      onConfirm: async () => {
        setLogoutLoading(true)
        try {
          const supabase = createClient()
          await supabase.auth.signOut({ scope: 'local' })
          router.replace('/login')
          afterServerActionRefresh()
        } finally {
          setLogoutLoading(false)
        }
      },
    })
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
