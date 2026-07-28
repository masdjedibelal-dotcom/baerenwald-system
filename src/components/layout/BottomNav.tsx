'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_NAV_ITEMS, navItemIsActive } from '@/lib/nav-config'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

/**
 * Bottom-Nav Spec §3: Dashboard · Vorgänge | + | Kunden · Mehr
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
        >
          <MockIcon ctx="sidebar" n={item.iconName} size={22} />
          <span>{item.label}</span>
        </Link>
      ))}

      <button
        type="button"
        className="bottomnav-cta"
        aria-label="Neu erstellen"
        onClick={() => onNeuOpen?.()}
      >
        <span className="bottomnav-cta-fab">
          <MockIcon ctx="sidebar" n="plus" size={26} />
        </span>
      </button>

      {right.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn('bottomnav-item', navItemIsActive(item, pathname) && 'active')}
        >
          <MockIcon ctx="sidebar" n={item.iconName} size={22} />
          <span>{item.label}</span>
        </Link>
      ))}

      <Link href="/mehr" className={cn('bottomnav-item', mehrActive && 'active')}>
        <MockIcon ctx="sidebar" n="dots" size={22} />
        <span>Mehr</span>
      </Link>
    </nav>
  )
}
