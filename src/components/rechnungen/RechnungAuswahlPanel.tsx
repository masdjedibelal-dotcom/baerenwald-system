'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
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

  function openRow(r: RechnungAuswahlZeile) {
    if (rechnungDarfImWizardBearbeitetWerden(r.status)) {
      openBearbeiten(r.id)
      return
    }
    onClose?.()
    router.push(`/rechnungen/${r.id}`)
  }

  function handleLoeschen(rechnungId: string, status: string) {
    const st = String(status ?? '').toLowerCase()
    const msg =
      st === 'entwurf'
        ? 'Rechnungs-Entwurf wirklich löschen?'
        : st === 'bezahlt' || st === 'storniert'
          ? 'Erledigte Rechnung wirklich endgültig löschen? Das kann nicht rückgängig gemacht werden.'
          : 'Rechnung wirklich endgültig löschen?'
    if (!window.confirm(msg)) return
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
    const loeschbar = rechnungDarfGeloeschtWerden(r.status)
    const items: ActionsMenuItem[] = [
      {
        label: 'Öffnen',
        icon: <MockIcon ctx="btn" n="eye" size={15} />,
        onClick: () => {
          onClose?.()
          router.push(`/rechnungen/${r.id}`)
        },
      },
    ]

    if (bearbeitbar) {
      items.push({
        label: 'Weiterbearbeiten',
        icon: <MockIcon ctx="btn" n="pencil" size={15} />,
        onClick: () => openBearbeiten(r.id),
      })
    }

    if (loeschbar) {
      items.push('sep', {
        label: 'Löschen',
        icon: <MockIcon ctx="btn" n="trash" size={15} />,
        danger: true,
        onClick: () => handleLoeschen(r.id, r.status),
      })
    }

    return items
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-bw-border bg-[var(--app-card)] px-4 py-8 text-center text-[length:var(--fs-text)] text-bw-text-muted">
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
                <button
                  type="button"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-left shadow-none"
                  disabled={pending}
                  onClick={() => openRow(r)}
                >
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
                      items={menuItems(r)}
                    />
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
    </div>
  )
}
