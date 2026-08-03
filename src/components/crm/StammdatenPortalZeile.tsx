'use client'

import { useEffect, useState } from 'react'
import { getPortalLoginHint } from '@/app/actions/kunden'
import { getPartnerPortalLoginHint } from '@/app/(dashboard)/handwerker/actions'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { openPortalAsKunde, openPortalAsHandwerker } from '@/app/(dashboard)/impersonation/actions'
import { useIsCrmAdmin } from '@/hooks/useIsCrmAdmin'
import { cn } from '@/lib/utils'

/**
 * Einheitliche Portal-Zeile in Stammdaten (Kunde · Handwerker · Vorgang):
 * - Aktiv: grüner Dot + „Portal aktiv“ · rechts Login (Icon + Label)
 * - Nicht registriert: roter Dot + „Noch nicht registriert“ · rechts „Einladen“
 */
export function StammdatenPortalZeile({
  kundeId,
  handwerkerId,
  fallbackEmail,
  gesperrt = false,
  /** Handwerker: Eltern öffnet Partner-Einladungs-Modal */
  onInvite,
}: {
  kundeId?: string | null
  handwerkerId?: string | null
  fallbackEmail?: string | null
  gesperrt?: boolean
  onInvite?: () => void
  /** @deprecated */
  editing?: boolean
  /** @deprecated */
  variant?: 'field' | 'vgid'
}) {
  const kid = kundeId?.trim() || null
  const hid = handwerkerId?.trim() || null
  const isCrmAdmin = useIsCrmAdmin()
  const [registered, setRegistered] = useState<boolean | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)

  useEffect(() => {
    if (!kid && !hid) {
      setRegistered(null)
      return
    }
    let cancelled = false
    void (async () => {
      if (hid) {
        const hint = await getPartnerPortalLoginHint(hid)
        if (cancelled) return
        setRegistered(hint.ok ? Boolean(hint.hasAuthAccount) : false)
        return
      }
      const hint = await getPortalLoginHint(kid!)
      if (cancelled) return
      setRegistered(hint.ok ? Boolean(hint.hasAuthAccount) : false)
    })()
    return () => {
      cancelled = true
    }
  }, [kid, hid])

  if (!kid && !hid) return null

  function openInvite() {
    if (onInvite) {
      onInvite()
      return
    }
    if (!fallbackEmail?.trim()) {
      toast.error('Keine E-Mail — Portal-Einladung nicht möglich.')
      return
    }
    setModalOpen(true)
  }

  async function openLogin() {
    if (loginBusy || (!kid && !hid)) return
    setLoginBusy(true)
    const popup = window.open('about:blank', '_blank')
    try {
      const r = hid ? await openPortalAsHandwerker(hid) : await openPortalAsKunde(kid!)
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
      setLoginBusy(false)
    }
  }

  const statusLabel = gesperrt
    ? 'Portal gesperrt'
    : registered === true
      ? 'Portal aktiv'
      : registered === false
        ? 'Noch nicht registriert'
        : '…'

  const dotClass = gesperrt
    ? 'd is-off'
    : registered === true
      ? 'd is-on'
      : registered === false
        ? 'd is-off'
        : 'd'

  const showInvite = !gesperrt && registered === false
  const showLogin = !gesperrt && registered === true && isCrmAdmin

  return (
    <>
      <div className="vgid-portal">
        <span className={cn(dotClass)} aria-hidden />
        <span className="t">{statusLabel}</span>
        {showInvite ? (
          <span className="a">
            <button
              type="button"
              className="vgid-portal__invite"
              onClick={openInvite}
              aria-label="Portal-Einladung senden"
              title="Portal-Einladung erneut senden"
            >
              <MockIcon ctx="default" n="send" size={15} />
              <span>Einladen</span>
            </button>
          </span>
        ) : null}
        {showLogin ? (
          <span className="a">
            <button
              type="button"
              className="vgid-portal__login"
              onClick={() => void openLogin()}
              disabled={loginBusy}
              aria-label={hid ? 'Partner-Portal Login' : 'Kundenportal Login'}
              title={hid ? 'Als Partner im Portal anmelden' : 'Als Kunde im Portal anmelden'}
            >
              <MockIcon ctx="btn" n="log-in" size={15} />
              <span>Login</span>
            </button>
          </span>
        ) : null}
      </div>
      {kid ? (
        <KundenportalLinkVersendenModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          kundeId={kid}
          fallbackEmail={fallbackEmail}
          onSent={() => setModalOpen(false)}
        />
      ) : null}
    </>
  )
}
