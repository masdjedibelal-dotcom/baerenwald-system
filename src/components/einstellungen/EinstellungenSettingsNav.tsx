'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string }

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Allgemein',
    items: [
      { href: '/einstellungen/firma', label: 'Firma & Branding' },
      { href: '/einstellungen/benutzer', label: 'Benutzer' },
    ],
  },
  {
    title: 'Vertrieb',
    items: [
      { href: '/einstellungen/gewerke', label: 'Gewerke' },
      { href: '/einstellungen/preisliste', label: 'Preisliste' },
      { href: '/einstellungen/vorlagen', label: 'Angebot-Vorlagen' },
    ],
  },
  {
    title: 'Kommunikation',
    items: [
      { href: '/einstellungen/email', label: 'E-Mail Templates' },
      { href: '/einstellungen/formulare', label: 'Formular-Templates' },
    ],
  },
  {
    title: 'Verwaltung',
    items: [
      { href: '/einstellungen/felder', label: 'Custom Fields' },
      { href: '/einstellungen/compliance', label: 'Compliance' },
      { href: '/einstellungen/datenschutz', label: 'Datenschutz' },
    ],
  },
]

const FLAT: NavItem[] = GROUPS.flatMap((g) => g.items)

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function EinstellungenSettingsNav() {
  const pathname = usePathname()
  const router = useRouter()
  const currentHref = FLAT.find((i) => isActive(pathname, i.href))?.href ?? '/einstellungen/firma'

  return (
    <>
      <div className="lg:hidden">
        <label className="mb-1 block text-xs font-medium text-bw-text-muted">Einstellungen</label>
        <select
          className="input w-full"
          value={currentHref}
          onChange={(e) => router.push(e.target.value)}
        >
          {GROUPS.map((g) => (
            <optgroup key={g.title} label={g.title}>
              {g.items.map((item) => (
                <option key={item.href} value={item.href}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <aside className="hidden w-[220px] shrink-0 lg:block">
        <nav
          className="sticky top-24 rounded-xl border border-bw-border bg-bw-card p-3 shadow-sm"
          aria-label="Einstellungen"
        >
          {GROUPS.map((g) => (
            <div key={g.title} className="mb-4 last:mb-0">
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-bw-text-muted">
                {g.title}
              </p>
              <ul className="space-y-0.5">
                {g.items.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'block rounded-r-md border-l-2 border-transparent py-2 pl-3 pr-2 text-sm transition-colors',
                          active
                            ? 'border-bw-primary bg-bw-green-bg font-medium text-bw-primary'
                            : 'text-bw-text hover:bg-bw-hover'
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
