'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Inbox, Wrench, HardHat, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { MoreSheet } from './MoreSheet'

const NAV_ITEMS: {
  href: string
  icon: typeof LayoutDashboard
  label: string
  exact?: boolean
}[] = [
  {
    href: '/',
    icon: LayoutDashboard,
    label: 'Home',
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
    href: '/handwerker',
    icon: HardHat,
    label: 'Handwerker',
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center justify-around border-t border-bw-border bg-bw-card md:hidden"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-2"
            >
              {active ? (
                <div className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-bw-link" />
              ) : null}
              <Icon className={`h-5 w-5 transition-colors ${active ? 'text-bw-link' : 'text-bw-light'}`} />
              <span className={`text-xs ${active ? 'font-medium text-bw-link' : 'text-bw-light'}`}>{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 px-3 py-2"
        >
          <MoreHorizontal className="h-5 w-5 text-bw-light" />
          <span className="text-xs text-bw-light">Mehr</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
