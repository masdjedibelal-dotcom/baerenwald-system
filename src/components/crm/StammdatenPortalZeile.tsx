'use client'

import { useEffect, useState } from 'react'
import { getPortalLoginHint } from '@/app/actions/kunden'
import { KundenportalLinkVersendenModal } from '@/components/crm/KundenportalLinkVersendenModal'
import { InlineEditField } from '@/components/ui/InlineEditSection'
import { toast } from '@/components/ui/app-toast'

export type PortalZugangState = 'aktiv' | 'eingeladen' | 'nicht_registriert'

/**
 * Phase 5c: Portal-Zustand in der Stammdaten-Karte (nicht im ⋯-Menü).
 * aktiv · eingeladen · nicht registriert + passende Aktion.
 */
export function StammdatenPortalZeile({
  kundeId,
  fallbackEmail,
  editing,
}: {
  kundeId?: string | null
  fallbackEmail?: string | null
  editing?: boolean
}) {
  const id = kundeId?.trim() || null
  const [state, setState] = useState<PortalZugangState | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      setState(null)
      return
    }
    let cancelled = false
    void getPortalLoginHint(id).then((hint) => {
      if (cancelled) return
      if (!hint.ok) {
        setState('nicht_registriert')
        return
      }
      setState(hint.hasAuthAccount ? 'aktiv' : 'nicht_registriert')
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id || editing) return null

  const label =
    state === 'aktiv'
      ? 'Aktiv'
      : state === 'eingeladen'
        ? 'Eingeladen'
        : state === 'nicht_registriert'
          ? 'Nicht registriert'
          : '…'

  const actionLabel =
    state === 'aktiv' ? 'Link senden' : state === 'eingeladen' ? 'Erneut senden' : 'Einladen'

  return (
    <>
      <InlineEditField
        label="Portal"
        editing={false}
        value={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span
              className={
                state === 'aktiv'
                  ? 'text-bw-primary'
                  : state === 'eingeladen'
                    ? 'text-amber-800'
                    : 'text-bw-text-muted'
              }
            >
              {label}
            </span>
            {state ? (
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => {
                  if (!fallbackEmail?.trim()) {
                    toast.error('Keine E-Mail — Portal-Link nicht möglich.')
                    return
                  }
                  setModalOpen(true)
                }}
              >
                {actionLabel}
              </button>
            ) : null}
          </span>
        }
      />
      <KundenportalLinkVersendenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        kundeId={id}
        fallbackEmail={fallbackEmail}
        onSent={() => {
          setState((s) => (s === 'aktiv' ? 'aktiv' : 'eingeladen'))
          setModalOpen(false)
        }}
      />
    </>
  )
}
