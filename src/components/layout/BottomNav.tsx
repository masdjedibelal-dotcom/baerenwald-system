'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_NAV_ITEMS, navItemIsActive } from '@/lib/nav-config'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/**
 * Bottom-Nav Spec §3: Dashboard · Vorgänge | + | Kunden · Mehr
 * Mobil: nur Icons (Labels als aria-label) — schlankere Leiste.
 */
export function BottomNav({ onNeuOpen }: { onNeuOpen?: () => void }) {
  const pathname = usePathname() ?? '/'
  const left = BOTTOM_NAV_ITEMS.slice(0, 2)
  const right = BOTTOM_NAV_ITEMS.slice(2)
  const mehrActive =
    pathname === '/mehr' ||
    pathname.startsWith('/mehr/') ||
    pathname.startsWith('/kalender') ||
    pathname.startsWith('/handwerker') ||
    pathname.startsWith('/ki-analytics') ||
    pathname.startsWith('/einstellungen')

  return (
    <nav className="bottomnav" aria-label="Mobile Navigation">
      {left.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn('bottomnav-item', navItemIsActive(item, pathname) && 'active')}
          aria-label={item.label}
          title={item.label}
        >
          <MockIcon ctx="sidebar" n={item.iconName} size={20} />
        </Link>
      ))}

      <button
        type="button"
        className="bottomnav-cta"
        aria-label="Neu erstellen"
        title="Neu erstellen"
        onClick={() => onNeuOpen?.()}
      >
        <span className="bottomnav-cta-fab">
          <MockIcon ctx="sidebar" n="plus" size={22} />
        </span>
      </button>

      {right.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn('bottomnav-item', navItemIsActive(item, pathname) && 'active')}
          aria-label={item.label}
          title={item.label}
        >
          <MockIcon ctx="sidebar" n={item.iconName} size={20} />
        </Link>
      ))}

      <Link
        href="/mehr"
        className={cn('bottomnav-item', mehrActive && 'active')}
        aria-label="Mehr"
        title="Mehr"
      >
        <MockIcon ctx="sidebar" n="dots" size={20} />
      </Link>
    </nav>
  )
}
