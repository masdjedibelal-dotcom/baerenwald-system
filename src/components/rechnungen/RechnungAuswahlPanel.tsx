'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
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
import { formatDatum, cn } from '@/lib/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  function openBearbeiten(rechnungId: string) {
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
      if (selectedId === rechnungId) setSelectedId(null)
      router.refresh()
    })
  }

  function handleAuswahlBestaetigen() {
    if (!selectedId) return
    const row = rows.find((r) => r.id === selectedId)
    if (!row) return
    if (rechnungDarfImWizardBearbeitetWerden(row.status)) {
      openBearbeiten(row.id)
      return
    }
    onClose?.()
    router.push(`/rechnungen/${row.id}`)
  }

  function menuItems(r: RechnungAuswahlZeile): ActionsMenuItem[] {
    const bearbeitbar = rechnungDarfImWizardBearbeitetWerden(r.status)
    const items: ActionsMenuItem[] = [
      {
        label: 'Öffnen',
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
        onClick: () => openBearbeiten(r.id),
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

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : null
  const selectedBearbeitbar = selected
    ? rechnungDarfImWizardBearbeitetWerden(selected.status)
    : false

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bw-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        {variant === 'modal' && onClose ? (
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={pending}>
            Schließen
          </button>
        ) : (
          <Link href={`/auftraege/${auftragId}`} className="btn ghost sm">
            Zum Auftrag
          </Link>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn ghost sm inline-flex gap-1.5"
          onClick={onNeueRechnung}
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
        <div>
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">Auftrag</p>
          <h1 className="text-[length:var(--fs-head)] font-semibold text-bw-text">
            Rechnungen{auftragsReferenz ? ` · ${auftragsReferenz}` : ''}
          </h1>
        </div>
      ) : null}

      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
        Bestehende Rechnungen auswählen und bearbeiten — oder unten eine neue anlegen.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
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
                  title={rechnungListenTitel(r)}
                  line2={
                    r.rechnungsdatum
                      ? `${formatDatum(r.rechnungsdatum)}${r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}`
                      : label
                  }
                  line4={formatEurBetrag(r.brutto ?? 0)}
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
                      items={menuItems(r)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="m-0 list-none divide-y divide-bw-border overflow-hidden rounded-lg border border-bw-border p-0">
          {rows.map((r) => {
            const loading = pending && loadingId === r.id
            const label = RECHNUNG_STATUS_LABELS[r.status as RechnungStatus] ?? r.status
            const isSelected = selectedId === r.id
            const bearbeitbar = rechnungDarfImWizardBearbeitetWerden(r.status)
            const titel = rechnungListenTitel(r)

            return (
              <li key={r.id}>
                <div
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap',
                    isSelected && 'bg-bw-green-bg/35'
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    disabled={pending}
                    onClick={() => setSelectedId(r.id)}
                    onDoubleClick={() => {
                      if (bearbeitbar) openBearbeiten(r.id)
                      else {
                        onClose?.()
                        router.push(`/rechnungen/${r.id}`)
                      }
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          isSelected
                            ? 'border-bw-primary bg-bw-primary text-white'
                            : 'border-bw-border bg-white'
                        )}
                        aria-hidden
                      >
                        {isSelected ? (
                          <span className="block h-1.5 w-1.5 rounded-full bg-white" />
                        ) : null}
                      </span>
                      <span className="text-[length:var(--fs-text)] font-medium text-bw-text">{titel}</span>
                      <span className="rounded-full bg-bw-surface px-2 py-0.5 text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
                        {label}
                      </span>
                    </div>
                    <p className="mt-0.5 pl-6 text-[length:var(--fs-text)] text-bw-text-muted">
                      {r.rechnungsnummer?.trim() ? `${r.rechnungsnummer} · ` : ''}
                      {r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : '—'}
                      {r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}
                    </p>
                  </button>
                  <span className="text-[length:var(--fs-text)] font-medium tabular-nums text-bw-text">
                    {formatEurBetrag(r.brutto ?? 0)}
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
                        items={menuItems(r)}
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
