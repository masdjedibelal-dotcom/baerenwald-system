'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { SIDEBAR_NAV_GROUPS, navItemIsActive } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

const SIDEBAR_EXPANDED_KEY = 'bw-sidebar-expanded'

export function Sidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  /** @deprecated Profil sitzt in der TopBar */
  user?: unknown
}) {
  const pathname = usePathname() ?? '/'
  const [expanded, setExpanded] = useState(true)

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
          <div className="sidebar-logo">
            <BrandLogo variant="white" height={18} />
          </div>
          <span className="sidebar-brandname">Bärenwald</span>
        </Link>
        <button
          type="button"
          className="sidebar-toggle"
          title={expanded ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
          aria-label={expanded ? 'Sidebar einklappen' : 'Sidebar ausklappen'}
          aria-expanded={expanded}
          onClick={toggleExpanded}
        >
          <MockIcon
            ctx="sidebar"
            n={expanded ? 'layout-sidebar-left-collapse' : 'layout-sidebar-left-expand'}
            size={18}
          />
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
    </nav>
  )
}
