'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
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
import { formatAngebotEurKurzBrutto } from '@/lib/vorgang/projekt-kontext-labels'
import { findeNeuestenEntwurf } from '@/lib/angebote/angebot-lebenszyklus'
import { ANGEBOT_STATUS_LABELS, formatRelativeDate } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'
import { confirmAction } from '@/components/ui/confirm-action'
import { confirmDelete } from '@/components/ui/confirm-delete'

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

/**
 * Zwischenschritt Angebot: Liste/Leer oben, darunter nur „Neu“.
 */
export function AngebotAuswahlPanel({
  leadId,
  angebote,
  onClose,
  onNeuesAngebot,
  onWeiterbearbeiten,
  onKopie,
}: {
  leadId: string
  angebote: AngebotAuswahlZeile[]
  onClose?: () => void
  onNeuesAngebot: () => void
  onWeiterbearbeiten: (bootstrap: AngebotWizardBootstrap) => void
  onKopie?: (bootstrap: AngebotWizardBootstrap) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

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
      confirmAction({
        title: 'Neues Angebot anlegen?',
        body: `Es gibt bereits einen offenen Entwurf (${nr}). Wirklich ein neues Angebot anlegen? Der Entwurf wird dabei als „Ersetzt“ markiert, sobald das neue Angebot gespeichert wird.`,
        confirmLabel: 'Neues Angebot',
        cancelLabel: 'Abbrechen',
        onConfirm: () => {
          onNeuesAngebot()
        },
      })
      return
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

  function openRow(a: AngebotAuswahlZeile) {
    if (angebotDarfImWizardBearbeitetWerden(a.status)) {
      openBearbeiten(a.id)
      return
    }
    onClose?.()
    router.push(`/angebote/${a.id}`)
  }

  function handleLoeschen(angebotId: string) {
    confirmDelete('Angebot löschen?', async () => {
      setLoadingId(angebotId)
      try {
        const r = await deleteAngebot(angebotId)
        if ('error' in r) {
          toast.error(r.error)
          throw new Error(r.error)
        }
        toast.success('Angebot gelöscht')
        router.refresh()
      } finally {
        setLoadingId(null)
      }
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

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
          Noch keine Angebote zu dieser Anfrage.
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-bw-border overflow-hidden rounded-[10px] border border-bw-border p-0">
          {rows.map((a) => {
            const loading = pending && loadingId === a.id
            const label = ANGEBOT_STATUS_LABELS[a.status as AngebotStatus] ?? a.status
            const nr = a.angebotsnr?.trim() || `AN-${a.id.slice(0, 8).toUpperCase()}`

            return (
              <li key={a.id} className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left shadow-none"
                  disabled={pending}
                  onClick={() => openRow(a)}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
                      {nr}
                    </span>
                    <AngebotStatusBadge status={a.status} />
                  </span>
                  <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
                    {a.created_at ? formatRelativeDate(a.created_at) : '—'}
                    {label ? ` · ${label}` : ''}
                    {' · '}
                    {formatAngebotEurKurzBrutto(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                  </span>
                </button>
                <div className="shrink-0">
                  {loading ? (
                    <span className="inline-flex p-2" aria-busy="true">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    </span>
                  ) : (
                    <ActionsMenu
                      align="right"
                      trigger={
                        <button
                          type="button"
                          className="editor-sheet__icon-btn"
                          disabled={pending}
                          aria-label="Aktionen"
                          title="Aktionen"
                        >
                          <MockIcon ctx="default" n="dots" size={18} />
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
      )}

      <MockBtn
        kind="primary"
        icon="plus"
        onClick={handleNeuesAngebotClick}
        disabled={pending}
        className="w-full"
      >
        Neu
      </MockBtn>
    </div>
  )
}
