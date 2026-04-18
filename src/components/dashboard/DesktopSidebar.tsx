import Link from 'next/link'
import {
  CalendarDays,
  FileCheck,
  FileText,
  Home,
  Inbox,
  ListChecks,
  Receipt,
  Settings,
  Users,
  Wrench,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { LogoutButton } from '@/components/auth/LogoutButton'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/anfragen', label: 'Anfragen', icon: Inbox },
  { href: '/angebote', label: 'Angebote', icon: FileText },
  { href: '/auftraege', label: 'Aufträge', icon: Wrench },
  { href: '/rechnungen', label: 'Rechnungen', icon: Receipt },
  { href: '/handwerker', label: 'Handwerker', icon: Users },
  { href: '/preislisten', label: 'Preislisten', icon: ListChecks },
  { href: '/formulare', label: 'Formulare', icon: FileCheck },
  { href: '/kalender', label: 'Kalender', icon: CalendarDays },
] as const

export function DesktopSidebar({ user }: { user: User }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden w-[220px] flex-col bg-sidebar text-white md:flex'
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
          B
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Bärenwald</p>
          <p className="text-xs text-white/70">CRM</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 pb-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-white/10 px-2 pb-2">
        <Link
          href="/einstellungen"
          className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
        >
          <Settings className="h-5 w-5 shrink-0" aria-hidden />
          <span className="truncate">Einstellungen</span>
        </Link>
      </div>

      <div className="border-t border-white/10 px-3 py-4">
        <p className="mb-2 truncate px-1 text-xs text-white/70" title={user.email ?? ''}>
          {user.email ?? 'Angemeldet'}
        </p>
        <LogoutButton className="w-full justify-start text-white hover:bg-white/10" />
      </div>
    </aside>
  )
}
