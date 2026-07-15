'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { BOTTOM_NAV_ITEMS } from '@/lib/nav-config'
import { cn } from '@/lib/utils'
import { MockNeuPopover } from '@/components/layout/MockNeuPopover'

export function BottomNav({ onNeuOpen }: { onNeuOpen?: () => void }) {
  const pathname = usePathname() ?? '/'
  const [neuOpen, setNeuOpen] = useState(false)

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const isMoreActive =
    pathname === '/mehr' ||
    (!BOTTOM_NAV_ITEMS.some((n) => isActive(n.href, n.exact)) &&
      !['/vorgaenge', '/'].includes(pathname) &&
      pathname !== '/kalender')

  const firstTwo = BOTTOM_NAV_ITEMS.slice(0, 2)
  const rest = BOTTOM_NAV_ITEMS.slice(2)

  return (
    <>
      <nav className="bottomnav" aria-label="Mobile Navigation">
        {firstTwo.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('bottomnav-item', isActive(item.href, item.exact) && 'active')}
            aria-label={item.label}
          >
            <MockIcon
              n={
                item.label === 'Dashboard'
                  ? 'layout-dashboard'
                  : item.label === 'Vorgänge'
                    ? 'folders'
                    : 'calendar'
              }
              size={22}
            />
            <span>{item.label}</span>
          </Link>
        ))}

        <button
          type="button"
          className="bottomnav-cta"
          onClick={() => (onNeuOpen ? onNeuOpen() : setNeuOpen(true))}
          aria-label="Neu erstellen"
        >
          <span className="bottomnav-cta-fab">
            <MockIcon n="plus" size={26} />
          </span>
        </button>

        {rest.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('bottomnav-item', isActive(item.href, item.exact) && 'active')}
            aria-label={item.label}
          >
            <MockIcon n="calendar" size={22} />
            <span>{item.label}</span>
          </Link>
        ))}

        <Link
          href="/mehr"
          className={cn('bottomnav-item', (pathname === '/mehr' || isMoreActive) && 'active')}
          aria-label="Mehr"
        >
          <MockIcon n="dots" size={22} />
          <span>Mehr</span>
        </Link>
      </nav>

      <MockNeuPopover open={neuOpen} onClose={() => setNeuOpen(false)} />
    </>
  )
}
