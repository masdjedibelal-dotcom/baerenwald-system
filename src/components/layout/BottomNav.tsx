'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { MoreSheet } from './MoreSheet'
import { BOTTOM_NAV_ITEMS } from '@/lib/nav-config'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { cn } from '@/lib/utils'

export function BottomNav({ onNeuOpen }: { onNeuOpen?: () => void }) {
  const pathname = usePathname() ?? '/'
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string, exact = false) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const mid = Math.ceil(BOTTOM_NAV_ITEMS.length / 2)
  const left = BOTTOM_NAV_ITEMS.slice(0, mid)
  const right = BOTTOM_NAV_ITEMS.slice(mid)

  return (
    <>
      <nav className="bottomnav" aria-label="Mobile Navigation">
        {left.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('bottomnav-item', isActive(item.href, item.exact) && 'active')}
          >
            <MockIcon n={item.iconName} size={20} />
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
            <MockIcon n="plus" size={24} />
          </span>
        </button>

        {right.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('bottomnav-item', isActive(item.href, item.exact) && 'active')}
          >
            <MockIcon n={item.iconName} size={20} />
            <span>{item.label}</span>
          </Link>
        ))}

        <button type="button" className="bottomnav-item" onClick={() => setMoreOpen(true)}>
          <MockIcon n="dots" size={20} />
          <span>Mehr</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
