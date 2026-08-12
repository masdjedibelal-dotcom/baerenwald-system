'use client'
import { useTransition } from '@/components/ui/action-busy'

import {
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { deleteAngebot } from '@/app/(dashboard)/angebote/actions'
import {
  loadAngebotWizardBootstrap,
  loadAngebotWizardBootstrapKopie,
} from '@/app/(dashboard)/angebote/wizard-actions'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { angebotDarfImWizardBearbeitetWerden } from '@/lib/angebote/angebot-wizard-types'
import type { AngebotStatus } from '@/lib/types'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { findeNeuestenEntwurf } from '@/lib/angebote/angebot-lebenszyklus'
import { ANGEBOT_STATUS_LABELS, formatRelativeDate } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'

export type AngebotAuswahlZeile = {
  id: string
  status: string
  status_einfach?: string | null
  gesamt_fix?: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at: string
  angebotsnr?: string | null
}

export function AngebotAuswahlPanel({
  leadId,
  angebote,
  onClose,
  onNeuesAngebot,
  onWeiterbearbeiten,
  onKopie,
  variant = 'modal',
  onFooterChange,
}: {
  leadId: string
  angebote: AngebotAuswahlZeile[]
  onClose?: () => void
  onNeuesAngebot: () => void
  onWeiterbearbeiten: (bootstrap: AngebotWizardBootstrap) => void
  onKopie?: (bootstrap: AngebotWizardBootstrap) => void
  variant?: 'modal' | 'page'
  /** Modal: Footer an Parent (`.modal-f`) — nicht im Body. */
  onFooterChange?: (footer: ReactNode | null) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      [...angebote].sort((a, b) => {
        const aBearbeitbar = angebotDarfImWizardBearbeitetWerden(a.status) ? 0 : 1
        const bBearbeitbar = angebotDarfImWizardBearbeitetWerden(b.status) ? 0 : 1
        if (aBearbeitbar !== bBearbeitbar) return aBearbeitbar - bBearbeitbar
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }),
    [angebote]
  )

  const offenerEntwurf = useMemo(() => findeNeuestenEntwurf(rows), [rows])

  function handleNeuesAngebotClick() {
    if (offenerEntwurf) {
      const nr =
        offenerEntwurf.angebotsnr?.trim() ||
        `AN-${offenerEntwurf.id.slice(0, 8).toUpperCase()}`
      const ok = window.confirm(
        `Es gibt bereits einen offenen Entwurf (${nr}). Wirklich ein neues Angebot anlegen? Der Entwurf wird dabei als „Ersetzt“ markiert, sobald das neue Angebot gespeichert wird.`
      )
      if (!ok) return
    }
    onNeuesAngebot()
  }

  function openBearbeiten(angebotId: string) {
    setLoadingId(angebotId)
    startTransition(async () => {
      const res = await loadAngebotWizardBootstrap(angebotId, leadId)
      setLoadingId(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      onClose?.()
      onWeiterbearbeiten(res.bootstrap)
    })
  }

  function handleLoeschen(angebotId: string) {
    if (!window.confirm('Angebot wirklich löschen?')) return
    setLoadingId(angebotId)
    startTransition(async () => {
      const r = await deleteAngebot(angebotId)
      setLoadingId(null)
      if ('error' in r) {
        toast.error(r.error)
        return
      }
      toast.success('Angebot gelöscht')
      if (selectedId === angebotId) setSelectedId(null)
      router.refresh()
    })
  }

  function handleKopieren(angebotId: string) {
    setLoadingId(angebotId)
    startTransition(async () => {
      const res = await loadAngebotWizardBootstrapKopie(angebotId, leadId)
      setLoadingId(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      onClose?.()
      onKopie?.(res.bootstrap)
    })
  }

  function handleAuswahlBestaetigen() {
    if (!selectedId) return
    const row = rows.find((r) => r.id === selectedId)
    if (!row) return
    if (angebotDarfImWizardBearbeitetWerden(row.status)) {
      openBearbeiten(row.id)
      return
    }
    onClose?.()
    router.push(`/angebote/${row.id}`)
  }

  function menuItems(a: AngebotAuswahlZeile): ActionsMenuItem[] {
    const bearbeitbar = angebotDarfImWizardBearbeitetWerden(a.status)
    const items: ActionsMenuItem[] = [
      {
        label: 'Öffnen',
        icon: <MockIcon ctx="btn" n="eye" size={15} />,
        onClick: () => {
          onClose?.()
          router.push(`/angebote/${a.id}`)
        },
      },
    ]

    if (bearbeitbar) {
      items.push({
        label: a.status === 'entwurf' ? 'Weiterbearbeiten' : 'Bearbeiten',
        icon: <MockIcon ctx="btn" n="pencil" size={15} />,
        onClick: () => openBearbeiten(a.id),
      })
    }

    items.push({
      label: 'Kopieren',
      icon: <MockIcon ctx="btn" n="copy" size={15} />,
      onClick: () => handleKopieren(a.id),
    })

    items.push('sep', {
      label: 'Löschen',
      icon: <MockIcon ctx="btn" n="trash" size={15} />,
      danger: true,
      onClick: () => handleLoeschen(a.id),
    })

    return items
  }

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : null
  const selectedBearbeitbar = selected
    ? angebotDarfImWizardBearbeitetWerden(selected.status)
    : false

  const footer = (
    <>
      {variant === 'modal' && onClose ? (
        <MockBtn kind="ghost" onClick={onClose} disabled={pending}>
          Schließen
        </MockBtn>
      ) : (
        <Link href={`/anfragen/${leadId}`} className="btn ghost">
          Zur Anfrage
        </Link>
      )}
      <div style={{ flex: 1 }} />
      <MockBtn kind="ghost" icon="plus" onClick={handleNeuesAngebotClick} disabled={pending}>
        Neu
      </MockBtn>
      <MockBtn
        kind="primary"
        icon={selectedBearbeitbar ? 'pencil' : 'eye'}
        onClick={handleAuswahlBestaetigen}
        disabled={pending || !selectedId}
      >
        {selectedBearbeitbar ? 'Bearbeiten' : 'Öffnen'}
      </MockBtn>
    </>
  )

  useLayoutEffect(() => {
    if (!onFooterChange) return
    onFooterChange(footer)
    return () => onFooterChange(null)
    // footer JSX intentionally rebuilt when deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync footer into Modal
  }, [onFooterChange, pending, selectedId, selectedBearbeitbar, variant, leadId])

  return (
    <div className="space-y-4">
      {variant === 'page' ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">Anfrage</p>
            <h1 className="text-[length:var(--fs-head)] font-semibold text-bw-text">Angebote</h1>
          </div>
        </div>
      ) : null}

      <p className="text-[length:var(--fs-meta)]" style={{ color: 'var(--text-3)', margin: 0 }}>
        Bestehendes Angebot wählen — oder neu anlegen.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
          Noch keine Angebote zu dieser Anfrage.
        </p>
      ) : variant === 'page' ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.map((a) => {
            const loading = pending && loadingId === a.id
            const label = ANGEBOT_STATUS_LABELS[a.status as AngebotStatus] ?? a.status
            const nr = a.angebotsnr?.trim() || `AN-${a.id.slice(0, 8).toUpperCase()}`

            return (
              <li key={a.id} className="space-y-2">
                <AppEntityListRow
                  href={`/angebote/${a.id}`}
                  avatar={<ListAvatar name={nr} tone="soft" />}
                  eyebrow={nr}
                  title={label}
                  line2={a.created_at ? formatRelativeDate(a.created_at) : '—'}
                  line4={betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                  badge={<AngebotStatusBadge status={a.status} />}
                />
                <div className="flex justify-end px-1">
                  {loading ? (
                    <span className="btn ghost sm inline-flex gap-1.5" aria-busy="true">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Bitte warten…
                    </span>
                  ) : (
                    <ActionsMenu
                      align="right"
                      trigger={
                        <MockBtn sm kind="ghost" icon="dots" disabled={pending} title="Aktionen" />
                      }
                      items={menuItems(a)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="m-0 list-none divide-y divide-bw-border overflow-hidden rounded-[10px] border border-bw-border p-0">
          {rows.map((a) => {
            const loading = pending && loadingId === a.id
            const label = ANGEBOT_STATUS_LABELS[a.status as AngebotStatus] ?? a.status
            const nr = a.angebotsnr?.trim() || `AN-${a.id.slice(0, 8).toUpperCase()}`
            const selected = selectedId === a.id
            const bearbeitbar = angebotDarfImWizardBearbeitetWerden(a.status)

            return (
              <li key={a.id}>
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap',
                    selected && 'bg-[var(--green-50)]'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'doctype-radio-opt min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none',
                      selected && 'on'
                    )}
                    style={{ border: 'none', background: 'transparent', padding: 0 }}
                    disabled={pending}
                    onClick={() => setSelectedId(a.id)}
                    onDoubleClick={() => {
                      if (bearbeitbar) openBearbeiten(a.id)
                      else {
                        onClose?.()
                        router.push(`/angebote/${a.id}`)
                      }
                    }}
                  >
                    <span className="dot" />
                    <span className="doctype-radio-opt__copy">
                      <span className="lbl" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <span className="font-mono text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
                          {nr}
                        </span>
                        <AngebotStatusBadge status={a.status} />
                      </span>
                      <span className="hint">
                        {a.created_at ? formatRelativeDate(a.created_at) : '—'}
                        {label ? ` · ${label}` : ''}
                        {' · '}
                        {betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center">
                    {loading ? (
                      <span className="btn ghost sm inline-flex gap-1.5" aria-busy="true">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      </span>
                    ) : (
                      <ActionsMenu
                        align="right"
                        trigger={
                          <MockBtn sm kind="ghost" icon="dots" disabled={pending} title="Aktionen" />
                        }
                        items={menuItems(a)}
                      />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {variant === 'page' || !onFooterChange ? (
        <div className="modal-f" style={{ margin: '0 -4px', paddingLeft: 0, paddingRight: 0, borderTop: '0.5px solid var(--border)' }}>
          {footer}
        </div>
      ) : null}
    </div>
  )
}
