'use client'

import Link from 'next/link'
import { LogOut, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { MORE_SHEET_NAV } from '@/lib/nav-config'

export function MoreSheet({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const supabase = createClient()

  if (!open) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <div className="z-sidepanel fixed inset-0 bg-black/40 md:hidden" onClick={onClose} role="presentation" />

      <div
        className="z-modal fixed bottom-0 left-0 right-0 animate-slide-up rounded-t-2xl bg-bw-card md:hidden"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pb-2 pt-3">
          <div className="h-1 w-10 rounded-full bg-bw-border" />
        </div>

        <div className="flex items-center justify-between border-b border-bw-border px-4 py-2">
          <span className="font-medium text-bw-text">Mehr</span>
          <button type="button" onClick={onClose} aria-label="Schließen">
            <X className="h-5 w-5 text-bw-light" />
          </button>
        </div>

        <div className="p-3">
          {MORE_SHEET_NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-sm text-bw-text transition-colors hover:bg-bw-hover"
              >
                <Icon className="h-5 w-5 text-bw-mid" />
                {item.label}
              </Link>
            )
          })}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-sm text-status-cancel-text transition-colors hover:bg-bw-hover"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </div>
      </div>
    </>
  )
}
