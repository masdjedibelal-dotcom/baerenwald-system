'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileCheck, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/einstellungen', label: 'Allgemein', icon: Settings, exact: true },
  { href: '/handwerker', label: 'Compliance-Dokumente', icon: FileCheck, exact: false },
  { href: '/einstellungen/datenschutz', label: 'Datenschutz', icon: Shield, exact: false },
] as const

export function EinstellungenSubNav() {
  const pathname = usePathname()

  return (
    <nav
      className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3"
      aria-label="Einstellungen Unterseiten"
    >
      {tabs.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-ink hover:bg-canvas'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
