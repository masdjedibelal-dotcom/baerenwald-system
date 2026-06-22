'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import {
  deleteRechnungEntwurf,
  loadRechnungWizardBootstrap,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import {
  rechnungDarfImWizardBearbeitetWerden,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import { RECHNUNG_STATUS_LABELS, type RechnungStatus } from '@/lib/rechnung-config'
import { formatDatum } from '@/lib/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { DetailAccordion } from '@/components/ui/DetailAccordion'
import { rechnungDokumentBezeichnung } from '@/lib/rechnungen/zahlungsplan'
import { toast } from '@/components/ui/app-toast'

export type { RechnungAuswahlZeile }

function rechnungListenTitel(r: RechnungAuswahlZeile): string {
  if (r.rechnung_art === 'schluss') return 'Schlussrechnung'
  if (r.rechnung_art === 'abschlag') {
    return rechnungDokumentBezeichnung('abschlag', r.abschlag_index)
  }
  return 'Rechnung'
}

function RechnungListenZeile({
  r,
  loading,
  pending,
  menuItems,
}: {
  r: RechnungAuswahlZeile
  loading: boolean
  pending: boolean
  menuItems: (r: RechnungAuswahlZeile) => ActionsMenuItem[]
}) {
  const label = RECHNUNG_STATUS_LABELS[r.status as RechnungStatus] ?? r.status
  const titel = rechnungListenTitel(r)

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-bw-text">{titel}</span>
          <span className="rounded-full bg-bw-surface px-2 py-0.5 text-[11px] font-medium text-bw-text-muted">
            {label}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] text-bw-text-muted">
          {r.rechnungsnummer?.trim() ? `${r.rechnungsnummer} · ` : ''}
          {r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : '—'}
          {r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}
        </p>
      </div>
      <span className="text-[13px] font-medium tabular-nums text-bw-text">
        {formatEurBetrag(r.brutto ?? 0)}
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
            items={menuItems(r)}
          />
        )}
      </div>
    </div>
  )
}

export function RechnungAuswahlPanel({
  auftragId,
  rechnungen,
  auftragsReferenz,
  onClose,
  onNeueRechnung,
  onWeiterbearbeiten,
  variant = 'modal',
}: {
  auftragId: string
  rechnungen: RechnungAuswahlZeile[]
  auftragsReferenz?: string | null
  onClose?: () => void
  onNeueRechnung: () => void
  onWeiterbearbeiten: (bootstrap: RechnungWizardBootstrap) => void
  variant?: 'modal' | 'page'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const rows = useMemo(
    () =>
      [...rechnungen].sort((a, b) => {
        const aBearbeitbar = rechnungDarfImWizardBearbeitetWerden(a.status) ? 0 : 1
        const bBearbeitbar = rechnungDarfImWizardBearbeitetWerden(b.status) ? 0 : 1
        if (aBearbeitbar !== bBearbeitbar) return aBearbeitbar - bBearbeitbar
        const da = a.rechnungsdatum ? new Date(a.rechnungsdatum).getTime() : 0
        const db = b.rechnungsdatum ? new Date(b.rechnungsdatum).getTime() : 0
        return db - da
      }),
    [rechnungen]
  )

  const bearbeitbarCount = rows.filter((r) => rechnungDarfImWizardBearbeitetWerden(r.status)).length

  function handleBearbeiten(rechnungId: string) {
    setLoadingId(rechnungId)
    startTransition(async () => {
      const res = await loadRechnungWizardBootstrap(rechnungId, auftragId)
      setLoadingId(null)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      onClose?.()
      onWeiterbearbeiten(res.bootstrap)
    })
  }

  function handleLoeschen(rechnungId: string) {
    if (!window.confirm('Rechnungs-Entwurf wirklich löschen?')) return
    setLoadingId(rechnungId)
    startTransition(async () => {
      const r = await deleteRechnungEntwurf(rechnungId)
      setLoadingId(null)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Rechnung gelöscht')
      router.refresh()
    })
  }

  function menuItems(r: RechnungAuswahlZeile): ActionsMenuItem[] {
    const bearbeitbar = rechnungDarfImWizardBearbeitetWerden(r.status)
    const items: ActionsMenuItem[] = [
      {
        label: 'Ansehen',
        icon: <Eye className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => {
          onClose?.()
          router.push(`/rechnungen/${r.id}`)
        },
      },
    ]

    if (bearbeitbar) {
      items.push({
        label: 'Weiterbearbeiten',
        icon: <Pencil className="h-[15px] w-[15px]" aria-hidden />,
        onClick: () => handleBearbeiten(r.id),
      })
      items.push('sep', {
        label: 'Löschen',
        icon: <Trash2 className="h-[15px] w-[15px]" aria-hidden />,
        danger: true,
        onClick: () => handleLoeschen(r.id),
      })
    }

    return items
  }

  const abschlagRows = rows.filter((r) => r.rechnung_art === 'abschlag' || r.rechnung_art === 'schluss')
  const andereRows = rows.filter((r) => r.rechnung_art !== 'abschlag' && r.rechnung_art !== 'schluss')
  const gruppiert = abschlagRows.length > 0

  const footer = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {variant === 'modal' && onClose ? (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={pending}>
          Schließen
        </button>
      ) : (
        <Link href={`/auftraege/${auftragId}`} className="btn btn-ghost btn-sm">
          Zum Auftrag
        </Link>
      )}
      <button
        type="button"
        className="btn btn-primary btn-sm inline-flex gap-1.5"
        onClick={onNeueRechnung}
        disabled={pending}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Neue Rechnung
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {variant === 'page' ? (
        <div>
          <p className="text-xs text-bw-text-muted">Auftrag</p>
          <h1 className="text-lg font-semibold text-bw-text">Rechnungen</h1>
        </div>
      ) : null}

      <p className="text-sm text-bw-text-muted">
        {bearbeitbarCount > 0
          ? 'Bestehende Rechnungen über „Aktionen“ öffnen oder löschen — oder eine neue Rechnung anlegen.'
          : 'Bestehende Rechnungen ansehen oder eine neue Rechnung anlegen.'}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-sm text-bw-text-muted">
          Noch keine Rechnungen zu diesem Auftrag.
        </p>
      ) : variant === 'page' ? (
        <ul className="m-0 list-none space-y-3 p-0">
          {rows.map((r) => {
            const loading = pending && loadingId === r.id
            const label = RECHNUNG_STATUS_LABELS[r.status as RechnungStatus] ?? r.status

            return (
              <li key={r.id} className="space-y-2">
                <AppEntityListRow
                  href={`/rechnungen/${r.id}`}
                  avatar={<ListAvatar name="Rechnung" tone="muted" />}
                  title={label}
                  line2={
                    r.rechnungsdatum
                      ? `${formatDatum(r.rechnungsdatum)}${r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}`
                      : '—'
                  }
                  line4={formatEurBetrag(r.brutto ?? 0)}
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
                      items={menuItems(r)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="space-y-3">
          {andereRows.map((r) => {
            const loading = pending && loadingId === r.id
            return (
              <div key={r.id} className="rounded-lg border border-bw-border">
                <RechnungListenZeile r={r} loading={loading} pending={pending} menuItems={menuItems} />
              </div>
            )
          })}

          {gruppiert ? (
            <DetailAccordion
              sections={[
                {
                  id: 'abschlag-plan',
                  title: `Abschlagsrechnungen${auftragsReferenz ? ` · ${auftragsReferenz}` : ''}`,
                  defaultOpen: true,
                  content: (
                    <ul className="divide-y divide-bw-border">
                      {abschlagRows.map((r) => {
                        const loading = pending && loadingId === r.id
                        return (
                          <li key={r.id}>
                            <RechnungListenZeile
                              r={r}
                              loading={loading}
                              pending={pending}
                              menuItems={menuItems}
                            />
                          </li>
                        )
                      })}
                    </ul>
                  ),
                },
              ]}
            />
          ) : null}

          {!gruppiert
            ? rows.map((r) => {
                const loading = pending && loadingId === r.id
                return (
                  <div key={r.id} className="rounded-lg border border-bw-border">
                    <RechnungListenZeile r={r} loading={loading} pending={pending} menuItems={menuItems} />
                  </div>
                )
              })
            : null}
        </div>
      )}

      {footer}
    </div>
  )
}
