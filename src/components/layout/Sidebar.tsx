'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { LogOut, PanelLeftClose, PanelLeft, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { SIDEBAR_NAV_GROUPS, type NavItemDef } from '@/lib/nav-config'

const SIDEBAR_EXPANDED_KEY = 'bw-sidebar-expanded'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
      if (saved !== null) setExpanded(saved === 'true')
    } catch {
      /* ignore */
    }
  }, [])

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
      return next
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'hidden h-dvh max-h-dvh shrink-0 flex-col overflow-y-auto bg-sidebar-bg py-2 transition-[width] duration-200 ease-out md:flex',
        expanded ? 'w-56 px-2' : 'w-11 items-center gap-1 px-0'
      )}
    >
      <div
        className={cn(
          'mb-2 flex shrink-0',
          expanded ? 'items-center justify-between gap-1 px-0.5' : 'flex-col-reverse items-center gap-1'
        )}
      >
        {expanded ? (
          <Link
            href="/"
            title="Bärenwald CRM"
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-1 py-1 hover:bg-white/10"
          >
            <BrandLogo variant="white" height={22} priority />
            <span className="truncate text-[13px] font-semibold text-white">Bärenwald</span>
          </Link>
        ) : (
          <Link
            href="/"
            title="Bärenwald CRM"
            className="flex h-9 w-9 items-center justify-center rounded-md p-1 hover:bg-white/10"
          >
            <BrandLogo variant="white" height={22} priority />
          </Link>
        )}

        <button
          type="button"
          onClick={toggleExpanded}
          aria-label={expanded ? 'Navigation einklappen' : 'Navigation ausklappen'}
          aria-expanded={expanded}
          title={expanded ? 'Navigation einklappen' : 'Navigation ausklappen'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          {expanded ? (
            <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
          ) : (
            <PanelLeft className="h-[18px] w-[18px]" aria-hidden />
          )}
        </button>
      </div>

      <nav className={cn('flex flex-col', expanded ? 'w-full gap-3' : 'items-center gap-0.5')}>
        {SIDEBAR_NAV_GROUPS.map((group, gi) => (
          <div key={group.id} className={cn('flex flex-col gap-0.5', gi > 0 && !expanded && 'mt-1')}>
            {expanded ? (
              <p className="mb-0.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {group.label}
              </p>
            ) : gi > 0 ? (
              <div className="my-1 h-px w-5 bg-white/10" />
            ) : null}
            {group.items.map((item) => (
              <RailItem
                key={item.href}
                item={item}
                active={isActive(item.href, item.exact)}
                expanded={expanded}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      <div className={cn('flex flex-col gap-0.5', expanded ? 'w-full' : 'items-center')}>
        <RailItem
          item={{ href: '/einstellungen', icon: Settings, label: 'Einstellungen' }}
          active={isActive('/einstellungen')}
          expanded={expanded}
        />

        <button
          type="button"
          onClick={handleLogout}
          title="Abmelden"
          aria-label="Abmelden"
          className={cn(
            'group relative flex items-center rounded-md text-white/55 transition-colors hover:bg-white/10 hover:text-white',
            expanded ? 'h-9 w-full gap-2.5 px-2.5' : 'h-8 w-8 justify-center'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          {expanded ? <span className="truncate text-[13px] font-medium">Abmelden</span> : null}
          {!expanded ? (
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-bw-text px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
              Abmelden
            </span>
          ) : null}
        </button>
      </div>
    </aside>
  )
}

function RailItem({
  item,
  active,
  expanded,
}: {
  item: NavItemDef
  active: boolean
  expanded: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      title={expanded ? undefined : item.label}
      aria-label={item.label}
      className={cn(
        'group relative flex items-center rounded-md transition-colors',
        expanded ? 'h-9 w-full gap-2.5 px-2.5' : 'h-8 w-8 justify-center',
        active ? 'bg-white text-bw-dark shadow-sm' : 'text-white/55 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      {expanded ? (
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.label}</span>
      ) : null}
      {!expanded ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-bw-text px-2 py-1 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
          {item.label}
        </span>
      ) : null}
    </Link>
  )
}
