'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPortalLoginHint } from '@/app/actions/kunden'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { formatDatum } from '@/lib/utils'

export type PortalZugangState = 'aktiv' | 'eingeladen' | 'nicht_registriert'

const INVITE_KEY = (id: string) => `bw-portal-invite:${id}`

/**
 * Portal-Zeile der Stammdaten-Identitätskarte (`.vgid-portal`).
 * Zustände: aktiv · eingeladen · nicht registriert (offen).
 */
export function StammdatenPortalZeile({
  kundeId,
  fallbackEmail,
  variant = 'vgid',
}: {
  kundeId?: string | null
  fallbackEmail?: string | null
  /** @deprecated immer vgid in Stammdaten */
  editing?: boolean
  variant?: 'field' | 'vgid'
}) {
  const id = kundeId?.trim() || null
  const [state, setState] = useState<PortalZugangState | null>(null)
  const [invitedAt, setInvitedAt] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setState(null)
      return
    }
    let cancelled = false
    const stored = typeof window !== 'undefined' ? localStorage.getItem(INVITE_KEY(id)) : null
    if (stored) setInvitedAt(stored)

    void getPortalLoginHint(id).then((hint) => {
      if (cancelled) return
      if (!hint.ok) {
        setState(stored ? 'eingeladen' : 'nicht_registriert')
        return
      }
      if (hint.hasAuthAccount) {
        setState('aktiv')
        return
      }
      setState(stored ? 'eingeladen' : 'nicht_registriert')
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id || variant === 'field') {
    // field-Variante entfällt in der Identitätskarte — nur vgid
    if (!id) return null
  }
  if (!id) return null

  const statusText =
    state === 'aktiv'
      ? 'Aktiv'
      : state === 'eingeladen'
        ? invitedAt
          ? `Eingeladen ${formatDatum(invitedAt)} · noch nicht angemeldet`
          : 'Eingeladen · noch nicht angemeldet'
        : state === 'nicht_registriert'
          ? 'Nicht registriert'
          : '…'

  const primaryAction =
    state === 'aktiv'
      ? { label: 'Zugang zurücksetzen', onClick: () => openInvite() }
      : state === 'eingeladen'
        ? { label: 'Erneut senden', onClick: () => openInvite() }
        : state === 'nicht_registriert'
          ? { label: 'Einladung senden', onClick: () => openInvite() }
          : null

  function openInvite() {
    if (!fallbackEmail?.trim()) {
      toast.error('Keine E-Mail — Portal-Link nicht möglich.')
      return
    }
    setModalOpen(true)
  }

  return (
    <>
      <div className="vgid-portal">
        <span className="k">Portal</span>
        <span
          className={
            state === 'aktiv' ? 'd is-on' : state === 'eingeladen' ? 'd is-warn' : 'd'
          }
          aria-hidden
        />
        <span className="t">{statusText}</span>
        {state && primaryAction ? (
          <span className="a">
            <button type="button" className="btn ghost sm" onClick={primaryAction.onClick}>
              <MockIcon
                ctx="default"
                n={state === 'aktiv' ? 'refresh' : 'send'}
                size={14}
              />
              {primaryAction.label}
            </button>
            {state === 'aktiv' ? (
              <Link href={`/kunden/${id}`} className="btn ghost sm" title="Als Kunde ansehen">
                <MockIcon ctx="default" n="external-link" size={14} />
                Als Kunde ansehen
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>
      <KundenportalLinkVersendenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kundeId={id}
        fallbackEmail={fallbackEmail}
        onSent={() => {
          const now = new Date().toISOString()
          try {
            localStorage.setItem(INVITE_KEY(id), now)
          } catch {
            /* ignore */
          }
          setInvitedAt(now)
          setState((s) => (s === 'aktiv' ? 'aktiv' : 'eingeladen'))
          setModalOpen(false)
        }}
      />
    </>
  )
}
