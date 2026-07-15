'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Copy, Eye, FileText, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { deleteAngebot } from '@/app/(dashboard)/angebote/actions'
import { loadAngebotWizardBootstrap, loadAngebotWizardBootstrapKopie } from '@/app/(dashboard)/angebote/wizard-actions'
import { AngebotBearbeitenWahlModal } from '@/components/angebote/AngebotBearbeitenWahlModal'
import type { AngebotWizardBootstrap } from '@/lib/angebote/angebot-wizard-types'
import { angebotDarfImWizardBearbeitetWerden } from '@/lib/angebote/angebot-wizard-types'
import type { AngebotStatus } from '@/lib/types'
import { betragAnzeige, resolveStatusEinfach } from '@/lib/angebot-einfach'
import { findeNeuestenEntwurf } from '@/lib/angebote/angebot-lebenszyklus'
import { ANGEBOT_STATUS_LABELS, formatRelativeDate } from '@/lib/utils'
import { toast } from '@/components/ui/app-toast'

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
  const [bearbeitenWahlId, setBearbeitenWahlId] = useState<string | null>(null)

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

  const bearbeitbarCount = rows.filter((a) => angebotDarfImWizardBearbeitetWerden(a.status)).length
  const offenerEntwurf = useMemo(() => findeNeuestenEntwurf(rows), [rows])

  function handleEntwurfFortsetzen() {
    if (!offenerEntwurf) return
    handleBearbeiten(offenerEntwurf.id, offenerEntwurf.status)
  }

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

  function handleBearbeiten(angebotId: string, status: string) {
    const st = resolveStatusEinfach(
      rows.find((r) => r.id === angebotId) ?? { status, status_einfach: null }
    )
    if (st !== 'entwurf') {
      setBearbeitenWahlId(angebotId)
      return
    }
    setLoadingId(angebotId)
    startTransition(async () => {
      const res = await loadAngebotWizardBootstrap(angebotId, leadId)
      setLoadingId(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
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

  function menuItems(a: AngebotAuswahlZeile): ActionsMenuItem[] {
    const bearbeitbar = angebotDarfImWizardBearbeitetWerden(a.status)
    const items: ActionsMenuItem[] = [
      {
        label: 'Ansehen',
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
        icon:
          a.status === 'entwurf' ? (
            <FileText className="h-[15px] w-[15px]" aria-hidden />
          ) : (
            <Pencil className="h-[15px] w-[15px]" aria-hidden />
          ),
        onClick: () => handleBearbeiten(a.id, a.status),
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

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {variant === 'modal' && onClose ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>
          Schließen
        </button>
      ) : (
        <Link href={`/anfragen/${leadId}`} className="btn btn-ghost btn-sm">
          Zur Anfrage
        </Link>
      )}
      <button
        type="button"
        className="btn btn-secondary btn-sm inline-flex gap-1.5"
        onClick={handleNeuesAngebotClick}
        disabled={pending}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Neues Angebot
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {variant === 'page' ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-bw-text-muted">Anfrage</p>
            <h1 className="text-lg font-semibold text-bw-text">Angebote</h1>
          </div>
        </div>
      ) : null}

      <p className="text-sm text-bw-text-muted">
        {offenerEntwurf
          ? 'Offener Entwurf vorhanden — am besten dort weitermachen. Ein neues Angebot nur bei echter neuer Variante.'
          : bearbeitbarCount > 0
            ? 'Bestehende Angebote über „Aktionen“ öffnen, kopieren oder löschen — oder ein neues Angebot anlegen.'
            : 'Bestehende Angebote ansehen, kopieren oder löschen — oder ein neues Angebot anlegen.'}
      </p>

      {offenerEntwurf ? (
        <div className="rounded-xl border border-bw-primary/30 bg-bw-green-bg/40 p-4">
          <p className="text-sm font-semibold text-bw-text">Entwurf fortsetzen</p>
          <p className="mt-1 text-[13px] leading-relaxed text-bw-text-muted">
            {offenerEntwurf.angebotsnr?.trim() ||
              `AN-${offenerEntwurf.id.slice(0, 8).toUpperCase()}`}
            {' · '}
            zuletzt {offenerEntwurf.created_at ? formatRelativeDate(offenerEntwurf.created_at) : '—'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3 inline-flex gap-1.5"
            disabled={pending}
            onClick={handleEntwurfFortsetzen}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Entwurf weiterbearbeiten
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-sm text-bw-text-muted">
          Noch keine Angebote zu dieser Anfrage.
        </p>
      ) : variant === 'page' ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.map((a) => {
            const loading = pending && loadingId === a.id
            const label = ANGEBOT_STATUS_LABELS[a.status as AngebotStatus] ?? a.status
            const nr = `AN-${a.id.slice(0, 8).toUpperCase()}`

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
                    <span className="btn btn-secondary btn-sm inline-flex gap-1.5" aria-busy="true">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Bitte warten…
                    </span>
                  ) : (
                    <ActionsMenu
                      align="right"
                      trigger={
                        <button type="button" className="btn btn-secondary btn-sm inline-flex gap-1.5" disabled={pending}>
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
        <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
          {rows.map((a) => {
            const loading = pending && loadingId === a.id
            const label = ANGEBOT_STATUS_LABELS[a.status as AngebotStatus] ?? a.status

            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-bw-text-muted">
                      AN-{a.id.slice(0, 8).toUpperCase()}
                    </span>
                    <AngebotStatusBadge status={a.status} />
                  </div>
                  <p className="mt-0.5 text-[13px] text-bw-text-muted">
                    {a.created_at ? formatRelativeDate(a.created_at) : '—'}
                    {label ? ` · ${label}` : ''}
                  </p>
                </div>
                <span className="text-[13px] font-medium tabular-nums text-bw-text">
                  {betragAnzeige(a.gesamt_fix ?? null, a.gesamt_min, a.gesamt_max)}
                </span>
                <div className="flex shrink-0 items-center">
                  {loading ? (
                    <span className="btn btn-secondary btn-sm inline-flex gap-1.5" aria-busy="true">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      Bitte warten…
                    </span>
                  ) : (
                    <ActionsMenu
                      align="right"
                      trigger={
                        <button type="button" className="btn btn-secondary btn-sm inline-flex gap-1.5" disabled={pending}>
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
      )}

      {footer}

      {bearbeitenWahlId ? (
        <AngebotBearbeitenWahlModal
          open
          onClose={() => setBearbeitenWahlId(null)}
          angebotId={bearbeitenWahlId}
          leadId={leadId}
          onBearbeiten={(bootstrap) => {
            setBearbeitenWahlId(null)
            onClose?.()
            onWeiterbearbeiten(bootstrap)
          }}
        />
      ) : null}
    </div>
  )
}
