'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  CalendarDays,
  FileCheck,
  FileText,
  Home,
  Inbox,
  ListChecks,
  LogOut,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useSearchModal } from '@/components/layout/SearchContext'

const mainNav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/anfragen', label: 'Anfragen', icon: Inbox },
  { href: '/angebote', label: 'Angebote', icon: FileText },
  { href: '/auftraege', label: 'Aufträge', icon: Wrench },
] as const

const moreLinks = [
  { href: '/rechnungen', label: 'Rechnungen', icon: Receipt },
  { href: '/handwerker', label: 'Handwerker', icon: Users },
  { href: '/preislisten', label: 'Preislisten', icon: ListChecks },
  { href: '/formulare', label: 'Formulare', icon: FileCheck },
  { href: '/kalender', label: 'Kalender', icon: CalendarDays },
  { href: '/einstellungen', label: 'Einstellungen', icon: Settings },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { open: openSearch } = useSearchModal()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function logout() {
    if (!window.confirm('Wirklich abmelden?')) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
    setLoggingOut(false)
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-surface/95 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm md:hidden"
        aria-label="Hauptnavigation"
      >
        {mainNav.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                active ? 'text-primary' : 'text-muted'
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            open && 'text-primary'
          )}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <MoreHorizontal className="h-6 w-6" aria-hidden />
          <span>Mehr</span>
        </button>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Menü schließen"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-2xl border border-border bg-surface p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-card [-webkit-overflow-scrolling:touch]">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold text-ink">Weitere Bereiche</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Schließen"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  openSearch()
                }}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-lg px-3 py-2 text-left text-base font-medium text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              >
                <Search className="h-5 w-5 text-primary" aria-hidden />
                Suche
              </button>
              {moreLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-ink hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  {label}
                </Link>
              ))}
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex w-full min-h-[48px] items-center gap-3 rounded-lg px-3 py-2 text-left text-base font-medium text-danger hover:bg-canvas disabled:opacity-60"
              >
                <LogOut className="h-5 w-5" aria-hidden />
                {loggingOut ? 'Abmelden …' : 'Abmelden'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
