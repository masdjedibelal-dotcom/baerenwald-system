'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Inbox,
  Wrench,
  Receipt,
  HardHat,
  Search,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'

const NAV_ITEMS: {
  href: string
  icon: typeof LayoutDashboard
  label: string
  exact?: boolean
}[] = [
  {
    href: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
    exact: true,
  },
  {
    href: '/anfragen',
    icon: Inbox,
    label: 'Anfragen',
  },
  {
    href: '/auftraege',
    icon: Wrench,
    label: 'Aufträge',
  },
  {
    href: '/rechnungen',
    icon: Receipt,
    label: 'Rechnungen',
  },
  {
    href: '/handwerker',
    icon: HardHat,
    label: 'Handwerker',
  },
]

const MORE_ITEMS = [
  { href: '/kunden', label: 'Kunden' },
  { href: '/preislisten', label: 'Preislisten' },
  { href: '/partner', label: 'Partner' },
  { href: '/kalender', label: 'Kalender' },
  { href: '/formulare', label: 'Formulare' },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const openSearch = () => {
    document.dispatchEvent(new CustomEvent('open-search'))
  }

  return (
    <aside className="hidden h-screen w-56 flex-shrink-0 flex-col overflow-y-auto bg-sidebar-bg md:flex">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-bw-accent text-sm font-semibold text-white">
            B
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-white">Bärenwald</div>
            <div className="text-xs text-sidebar-text opacity-70">München</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3">
        <button
          type="button"
          onClick={openSearch}
          className="flex w-full items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm text-sidebar-text transition-colors hover:bg-white/10"
        >
          <Search className="h-4 w-4 opacity-60" />
          <span className="opacity-60">Suchen...</span>
          <span className="ml-auto hidden text-xs opacity-40 lg:block">⌘K</span>
        </button>
      </div>

      <nav className="flex-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                active
                  ? 'bg-sidebar-active text-white shadow-inner'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
              {active ? <div className="ml-auto h-4 w-1 flex-shrink-0 rounded-full bg-bw-accent" /> : null}
            </Link>
          )
        })}

        <div className="mb-2 mt-3 px-3 text-xs font-medium uppercase tracking-wide text-sidebar-text opacity-40">Mehr</div>

        {MORE_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150 ${
                active
                  ? 'bg-sidebar-active text-white'
                  : 'text-sidebar-text opacity-80 hover:bg-sidebar-hover hover:opacity-100'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/einstellungen"
          className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-text opacity-70 transition-colors hover:bg-white/10 hover:opacity-100"
        >
          <Settings className="h-4 w-4" />
          Einstellungen
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-text opacity-70 transition-colors hover:bg-white/10 hover:opacity-100"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
