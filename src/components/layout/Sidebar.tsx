'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { SIDEBAR_NAV_GROUPS, navItemIsActive } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

const SIDEBAR_EXPANDED_KEY = 'bw-sidebar-expanded'

function userDisplayName(user?: User): { name: string; initials: string } {
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined
  const raw =
    meta?.full_name?.trim() ||
    meta?.name?.trim() ||
    user?.email?.split('@')[0]?.trim() ||
    'Beran Bärenwald'
  const parts = raw.split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
      : raw.slice(0, 2).toUpperCase()
  return { name: raw, initials: initials || 'BB' }
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  user,
}: {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  user?: User
}) {
  const pathname = usePathname() ?? '/'
  const [expanded, setExpanded] = useState(true)
  const { name, initials } = userDisplayName(user)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
      if (saved !== null) {
        const exp = saved === 'true'
        setExpanded(exp)
        onCollapsedChange?.(!exp)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, [])

  useEffect(() => {
    if (collapsed !== undefined) setExpanded(!collapsed)
  }, [collapsed])

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next))
      } catch {
        /* ignore */
      }
      onCollapsedChange?.(!next)
      return next
    })
  }

  return (
    <nav className="sidebar" aria-label="Hauptnavigation">
      <div className="sidebar-top">
        <Link href="/" className="sidebar-brand" title="Bärenwald CRM">
          <div className="sidebar-logo">B</div>
          <span className="sidebar-brandname">Bärenwald</span>
        </Link>
        <button
          type="button"
          className="sidebar-toggle"
          title={expanded ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
          aria-label="Sidebar umschalten"
          aria-expanded={expanded}
          onClick={toggleExpanded}
        >
          <MockIcon ctx="sidebar" n={expanded ? 'chevron-left' : 'chevron-right'} size={18} />
        </button>
      </div>

      <div className="sidebar-nav">
        {SIDEBAR_NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="sidebar-section">{group.label}</div>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-label={item.label}
                aria-label={item.label}
                className={cn('sidebar-icon', navItemIsActive(item, pathname) && 'active')}
              >
                <MockIcon ctx="sidebar" n={item.iconName} size={18} />
                <span className="sidebar-label">{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="sidebar-spacer" />

      <Link
        href="/einstellungen"
        data-label="Einstellungen"
        aria-label="Einstellungen"
        className={cn('sidebar-icon', pathname.startsWith('/einstellungen') && 'active')}
      >
        <MockIcon ctx="sidebar" n="settings" size={18} />
        <span className="sidebar-label">Einstellungen</span>
      </Link>

      <Link
        href="/einstellungen/profil"
        data-label={name}
        aria-label={`Profil · ${name}`}
        className={cn('sidebar-icon', pathname.startsWith('/einstellungen/profil') && 'active')}
      >
        <div
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: '50%',
            background: 'var(--green)',
            color: 'white',
            display: 'grid',
            placeItems: 'center',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {initials}
        </div>
        <span className="sidebar-label">{name}</span>
      </Link>
    </nav>
  )
}
