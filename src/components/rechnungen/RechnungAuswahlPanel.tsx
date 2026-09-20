'use client'

import { MockBtn } from '@/components/mock-ui'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { useTransition } from '@/components/ui/action-busy'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import {
  deleteRechnungEntwurf,
  loadRechnungWizardBootstrap,
} from '@/app/(dashboard)/rechnungen/wizard-actions'
import type { RechnungWizardBootstrap } from '@/lib/rechnungen/rechnung-wizard-types'
import {
  rechnungDarfGeloeschtWerden,
  rechnungDarfImWizardBearbeitetWerden,
  type RechnungAuswahlZeile,
} from '@/lib/rechnungen/rechnung-wizard-types'
import { RECHNUNG_STATUS_LABELS, type RechnungStatus } from '@/lib/rechnung-config'
import { formatDatum } from '@/lib/utils'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { rechnungDokumentBezeichnung } from '@/lib/rechnungen/zahlungsplan'
import { toast } from '@/components/ui/app-toast'
import { TOAST } from '@/lib/copy'

export type { RechnungAuswahlZeile }

function rechnungListenTitel(r: RechnungAuswahlZeile): string {
  if (r.rechnung_art === 'schluss') return 'Schlussrechnung'
  if (r.rechnung_art === 'abschlag') {
    return rechnungDokumentBezeichnung('abschlag', r.abschlag_index)
  }
  return 'Rechnung'
}

/**
 * Zwischenschritt Rechnung: Liste/Leer oben, darunter nur „Neu“.
 * Tippen auf eine Zeile öffnet bzw. bearbeitet.
 */
export function RechnungAuswahlPanel({
  auftragId,
  rechnungen,
  onClose,
  onNeueRechnung,
  onWeiterbearbeiten,
}: {
  auftragId: string
  rechnungen: RechnungAuswahlZeile[]
  onClose?: () => void
  onNeueRechnung: () => void
  onWeiterbearbeiten: (bootstrap: RechnungWizardBootstrap) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    status: string
    label: string
  } | null>(null)

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
        toast.systemError(res)
        return
      }
      onClose?.()
      onWeiterbearbeiten(res.bootstrap)
    })
  }

  function openRow(r: RechnungAuswahlZeile) {
    if (rechnungDarfImWizardBearbeitetWerden(r.status)) {
      openBearbeiten(r.id)
      return
    }
    onClose?.()
    router.push(`/rechnungen/${r.id}`)
  }

  function handleLoeschen(rechnungId: string, status: string, label: string) {
    setDeleteTarget({ id: rechnungId, status, label })
  }

  function confirmLoeschen() {
    const target = deleteTarget
    if (!target) return
    setDeleteTarget(null)
    setLoadingId(target.id)
    startTransition(async () => {
      const r = await deleteRechnungEntwurf(target.id)
      setLoadingId(null)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.rechnung_geloescht)
      afterServerActionRefresh()
    })
  }

  function menuItems(r: RechnungAuswahlZeile): EntityMenuItem[] {
    const bearbeitbar = rechnungDarfImWizardBearbeitetWerden(r.status)
    const loeschbar = rechnungDarfGeloeschtWerden(r.status)
    const items: EntityMenuItem[] = [
      {
        label: 'Öffnen',
        icon: 'eye',
        onClick: () => {
          onClose?.()
          router.push(`/rechnungen/${r.id}`)
        },
      },
    ]

    if (bearbeitbar) {
      items.push({
        label: 'Weiterbearbeiten',
        icon: 'pencil',
        onClick: () => openBearbeiten(r.id),
      })
    }

    if (loeschbar) {
      items.push('sep', {
        label: 'Löschen',
        icon: 'trash',
        danger: true,
        onClick: () =>
          handleLoeschen(
            r.id,
            r.status,
            r.rechnungsnummer?.trim() || rechnungListenTitel(r)
          ),
      })
    }

    return items
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="m-0 rounded-sheet border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
          Noch keine Rechnungen zu diesem Auftrag.
        </p>
      ) : (
        <ul className="m-0 list-none divide-y divide-bw-border overflow-hidden rounded-[10px] border border-bw-border p-0">
          {rows.map((r) => {
            const loading = pending && loadingId === r.id
            const label = RECHNUNG_STATUS_LABELS[r.status as RechnungStatus] ?? r.status
            const titel = rechnungListenTitel(r)

            return (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2.5">
                <MockBtn className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left shadow-none" type="button" disabled={pending} onClick={() => openRow(r)}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[length:var(--fs-text)] font-semibold text-bw-text">
                      {titel}
                    </span>
                    <MockBadge kind="plain">{label}</MockBadge>
                  </span>
                  <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
                    {r.rechnungsnummer?.trim() ? `${r.rechnungsnummer} · ` : ''}
                    {r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : '—'}
                    {r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}
                    {' · '}
                    {formatEurBetrag(r.brutto ?? 0)}
                  </span>
                </MockBtn>
                <div className="shrink-0">
                  {loading ? (
                    <span className="inline-flex p-2" aria-busy="true">
                      <span className="page-loading__spinner page-loading__spinner--sm" aria-hidden />
                    </span>
                  ) : (
                    <MockEntityRowMenu items={menuItems(r)} title="Aktionen" />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <MockBtn kind="primary" icon="plus" onClick={onNeueRechnung} disabled={pending} className="w-full">
        Neu
      </MockBtn>

      <ConfirmPopup
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Rechnung löschen?"
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        danger
        onConfirm={confirmLoeschen}
      >
        {(() => {
          const st = String(deleteTarget?.status ?? '').toLowerCase()
          if (st === 'entwurf') {
            return (
              <p>
                Entwurf „{deleteTarget?.label ?? 'Rechnung'}“ wirklich löschen?
              </p>
            )
          }
          if (st === 'bezahlt' || st === 'storniert') {
            return (
              <p>
                Erledigte Rechnung „{deleteTarget?.label ?? 'Rechnung'}“ wirklich endgültig löschen?
                Das kann nicht rückgängig gemacht werden.
              </p>
            )
          }
          return (
            <p>
              „{deleteTarget?.label ?? 'Rechnung'}“ wirklich endgültig löschen?
            </p>
          )
        })()}
      </ConfirmPopup>
    </div>
  )
}
