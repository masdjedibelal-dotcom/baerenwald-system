'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/einstellungen', label: 'Allgemein', icon: 'settings', exact: true },
  { href: '/handwerker', label: 'Compliance-Dokumente', icon: 'file-text', exact: false },
  { href: '/einstellungen/datenschutz', label: 'Datenschutz', icon: 'shield-check', exact: false },
] as const

export function EinstellungenSubNav() {
  const pathname = usePathname()

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
      aria-label="Einstellungen Unterseiten"
    >
      {tabs.map(({ href, label, icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 rounded-card border px-3 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-ink hover:bg-canvas'
            )}
          >
            <MockIcon n={icon} ctx={active ? 'nav' : 'default'} size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
