'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BOTTOM_NAV_ITEMS,navItemIsActive } from '@/lib/nav-config'
import { cn } from '@/lib/utils'
import { useWhatsAppStatus,useWhatsAppUngelesen } from '@/components/whatsapp/useWhatsAppStatus'

/**
 * Bottom-Nav Spec §3: Dashboard · Vorgänge | + | Kunden · Mehr
 * Browser-Mobil: nur Icons (schlank). PWA/Home-Screen: Labels + normale Höhe.
 */
export function BottomNav({ onNeuOpen }: { onNeuOpen?: () => void }) {
  const pathname = usePathname() ?? '/'
  const wa = useWhatsAppStatus()
  const ungelesen = useWhatsAppUngelesen(Boolean(wa?.sichtbar), pathname)
  const items = BOTTOM_NAV_ITEMS.filter((item) => !item.nurWhatsApp || wa?.sichtbar)
  const left = items.slice(0, 2)
  const right = items.slice(2)
  const mehrActive =
    pathname === '/mehr' ||
    pathname.startsWith('/mehr/') ||
    pathname.startsWith('/handwerker') ||
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
          <span className="bottomnav-item__lbl">{item.label}</span>
        </Link>
      ))}

      {/* Design 30.09.2026: „+“ sitzt oben in der Kopfleiste — Tab-Leiste nur Navigation */}

      {right.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn('bottomnav-item', navItemIsActive(item, pathname) && 'active')}
          aria-label={item.label}
          title={item.label}
        >
          <MockIcon ctx="sidebar" n={item.iconName} size={20} />
          {item.nurWhatsApp && ungelesen > 0 ? (
            <span className="nav-zaehler nav-zaehler--bottom">{ungelesen > 99 ? '99+' : ungelesen}</span>
          ) : null}
          <span className="bottomnav-item__lbl">{item.label}</span>
        </Link>
      ))}

      <Link
        href="/mehr"
        className={cn('bottomnav-item', mehrActive && 'active')}
        aria-label="Mehr"
        title="Mehr"
      >
        <MockIcon ctx="sidebar" n="dots" size={20} />
        <span className="bottomnav-item__lbl">Mehr</span>
      </Link>
    </nav>
  )
}
