'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Eye, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
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
}: {
  leadId: string
  angebote: AngebotAuswahlZeile[]
  onClose?: () => void
  onNeuesAngebot: () => void
  onWeiterbearbeiten: (bootstrap: AngebotWizardBootstrap) => void
  onKopie?: (bootstrap: AngebotWizardBootstrap) => void
  variant?: 'modal' | 'page'
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
        icon: <Eye className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => {
          onClose?.()
          router.push(`/angebote/${a.id}`)
        },
      },
    ]

    if (bearbeitbar) {
      items.push({
        label: a.status === 'entwurf' ? 'Weiterbearbeiten' : 'Bearbeiten',
        icon: <Pencil className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => openBearbeiten(a.id),
      })
    }

    items.push({
      label: 'Kopieren',
      icon: <Copy className="h-[15px] w-[15px]" aria-hidden />,
      onClick: () => handleKopieren(a.id),
    })

    items.push('sep', {
      label: 'Löschen',
      icon: <Trash2 className="h-[15px] w-[15px]" aria-hidden />,
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
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bw-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {variant === 'modal' && onClose ? (
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>
            Schließen
          </button>
        ) : (
          <Link href={`/anfragen/${leadId}`} className="btn ghost sm">
            Zur Anfrage
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn ghost sm inline-flex gap-1.5"
          onClick={handleNeuesAngebotClick}
          disabled={pending}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Neu erstellen
        </button>
        <button
          type="button"
          className="btn primary sm inline-flex gap-1.5"
          onClick={handleAuswahlBestaetigen}
          disabled={pending || !selectedId}
        >
          {selectedBearbeitbar ? (
            <>
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              Ausgewählt bearbeiten
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Ausgewählt öffnen
            </>
          )}
        </button>
      </div>
    </div>
  )

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

      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
        Bestehende Angebote auswählen und bearbeiten — oder unten ein neues anlegen.
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
                        <button type="button" className="btn ghost sm inline-flex gap-1.5" disabled={pending}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden />
                          Aktionen
                        </button>
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
        <ul className="m-0 list-none divide-y divide-bw-border overflow-hidden rounded-lg border border-bw-border p-0">
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
                    selected && 'bg-bw-green-bg/35'
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          selected
                            ? 'border-bw-primary bg-bw-primary text-white'
                            : 'border-bw-border bg-white'
                        )}
                        aria-hidden
                      >
                        {selected ? (
                          <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span className="font-mono text-[length:var(--fs-meta)] text-bw-text-muted">{nr}</span>
                      <AngebotStatusBadge status={a.status} />
                    </div>
                    <p className="mt-0.5 pl-6 text-[length:var(--fs-text)] text-bw-text-muted">
                      {a.created_at ? formatRelativeDate(a.created_at) : '—'}
                      {label ? ` · ${label}` : ''}
                    </p>
                  </button>
                  <span className="text-[length:var(--fs-text)] font-medium tabular-nums text-bw-text">
                    {betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                  </span>
                  <div className="flex shrink-0 items-center">
                    {loading ? (
                      <span className="btn ghost sm inline-flex gap-1.5" aria-busy="true">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Bitte warten…
                      </span>
                    ) : (
                      <ActionsMenu
                        align="right"
                        trigger={
                          <button
                            type="button"
                            className="btn ghost sm inline-flex gap-1.5"
                            disabled={pending}
                            aria-label="Aktionen"
                          >
                            <MoreHorizontal className="h-4 w-4" aria-hidden />
                          </button>
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

      {footer}
    </div>
  )
}
