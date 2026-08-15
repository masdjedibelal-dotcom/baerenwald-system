'use client'

import { useState } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { openPortalAsKunde, openPortalAsHandwerker } from '@/app/(dashboard)/impersonation/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { cn } from '@/lib/utils'

type Props = {
  kundeId?: string | null
  handwerkerId?: string | null
  className?: string
  /** aria/title — Standard: Portal öffnen */
  label?: string
  /** Desktop: Icon + „Login“-Text (z. B. neben Kundenakte) */
  withLabel?: boolean
}

/**
 * CRM-Admin: Portal-Login (Impersonation).
 * Mit `withLabel` als Chip neben Kundenakte (Desktop + Mobil).
 */
export function PortalLoginIconButton({
  kundeId,
  handwerkerId,
  className,
  label = 'Portal öffnen',
  withLabel = false,
}: Props) {
  const isCrmAdmin = useIsCrmAdmin()
  const [busy, setBusy] = useState(false)
  const kid = kundeId?.trim() || null
  const hid = handwerkerId?.trim() || null

  if (!isCrmAdmin || (!kid && !hid)) return null

  async function open() {
    if (busy) return
    setBusy(true)
    const popup = window.open('about:blank', '_blank')
    try {
      const r = hid
        ? await openPortalAsHandwerker(hid)
        : await openPortalAsKunde(kid!)
      if (!r.ok) {
        popup?.close()
        toast.error(r.message)
        return
      }
      if (popup) popup.location.href = r.url
      else window.location.assign(r.url)
    } catch {
      popup?.close()
      toast.error('Portal konnte nicht geöffnet werden.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={cn(
        withLabel ? 'vgid-chip ghost portal-login-chip' : 'qa-btn portal-login-icon',
        className
      )}
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={() => void open()}
    >
      <MockIcon
        ctx={withLabel ? 'default' : 'row'}
        n={hid ? 'users' : 'user'}
        size={withLabel ? 22 : 18}
      />
      {withLabel ? <span>Login</span> : null}
    </button>
  )
}
