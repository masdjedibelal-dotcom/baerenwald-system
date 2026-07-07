'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { MoreSheet } from './MoreSheet'
import { BOTTOM_NAV_ITEMS } from '@/lib/nav-config'

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
        className="z-header fixed inset-x-0 bottom-0 flex items-end justify-around border-t border-bw-border bg-bw-card md:hidden"
        style={{
          height: 'var(--mobile-bottom-nav-height)',
          paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5"
            >
              {active ? (
                <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-bw-primary" />
              ) : null}
              <Icon
                className={`h-[22px] w-[22px] transition-colors ${
                  active ? 'text-bw-primary' : 'text-bw-text-mid'
                }`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={`text-[10.5px] leading-none ${
                  active ? 'font-semibold text-bw-primary' : 'text-bw-text-subtle'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-1.5"
        >
          <MoreHorizontal className="h-[22px] w-[22px] text-bw-text-mid" strokeWidth={1.8} />
          <span className="text-[10.5px] leading-none text-bw-text-subtle">Mehr</span>
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
