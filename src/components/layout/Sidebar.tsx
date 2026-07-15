'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { SIDEBAR_NAV_GROUPS } from '@/lib/nav-config'
import { cn } from '@/lib/utils'

const SIDEBAR_EXPANDED_KEY = 'bw-sidebar-expanded'

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
  const router = useRouter()
  const supabase = createClient()
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

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
          <MockIcon n={expanded ? 'chevron-left' : 'chevron-right'} size={18} />
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
                className={cn('sidebar-icon', isActive(item.href, item.exact) && 'active')}
              >
                <MockIcon n={item.iconName} size={18} />
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
        className={cn('sidebar-icon', isActive('/einstellungen') && 'active')}
      >
        <MockIcon n="settings" size={18} />
        <span className="sidebar-label">Einstellungen</span>
      </Link>

      {user ? (
        <button
          type="button"
          data-label="Abmelden"
          aria-label="Abmelden"
          className="sidebar-icon"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
          <span className="sidebar-label">Abmelden</span>
        </button>
      ) : null}
    </nav>
  )
}
