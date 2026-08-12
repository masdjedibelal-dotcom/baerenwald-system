'use client'
import { useTransition } from '@/components/ui/action-busy'

import {
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppEntityListRow } from '@/components/layout/app'
import { ListAvatar } from '@/components/ui/ListAvatar'
import { ActionsMenu, type ActionsMenuItem } from '@/components/ui/actions-menu'
import { MockBtn, MockBadge } from '@/components/mock-ui/MockPrimitives'
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
  onFooterChange,
}: {
  auftragId: string
  rechnungen: RechnungAuswahlZeile[]
  auftragsReferenz?: string | null
  onClose?: () => void
  onNeueRechnung: () => void
  onWeiterbearbeiten: (bootstrap: RechnungWizardBootstrap) => void
  variant?: 'modal' | 'page'
  onFooterChange?: (footer: ReactNode | null) => void
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

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : null
  const selectedBearbeitbar = selected
    ? rechnungDarfImWizardBearbeitetWerden(selected.status)
    : false

  const footer = (
    <>
      {variant === 'modal' && onClose ? (
        <MockBtn kind="ghost" onClick={onClose} disabled={pending}>
          Schließen
        </MockBtn>
      ) : (
        <Link href={`/auftraege/${auftragId}`} className="btn ghost">
          Zum Auftrag
        </Link>
      )}
      <div style={{ flex: 1 }} />
      <MockBtn kind="ghost" icon="plus" onClick={onNeueRechnung} disabled={pending}>
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync footer into Modal
  }, [onFooterChange, pending, selectedId, selectedBearbeitbar, variant, auftragId])

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

      <p className="text-[length:var(--fs-meta)]" style={{ color: 'var(--text-3)', margin: 0 }}>
        Bestehende Rechnung wählen — oder neu anlegen.
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
                        <MockBtn sm kind="ghost" icon="dots" disabled={pending} title="Aktionen" />
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
        <ul className="m-0 list-none divide-y divide-bw-border overflow-hidden rounded-[10px] border border-bw-border p-0">
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
                    isSelected && 'bg-[var(--green-50)]'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'doctype-radio-opt min-w-0 flex-1 border-0 bg-transparent p-0 shadow-none',
                      isSelected && 'on'
                    )}
                    style={{ border: 'none', background: 'transparent', padding: 0 }}
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
                    <span className="dot" />
                    <span className="doctype-radio-opt__copy">
                      <span
                        className="lbl"
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
                      >
                        {titel}
                        <MockBadge kind="plain">{label}</MockBadge>
                      </span>
                      <span className="hint">
                        {r.rechnungsnummer?.trim() ? `${r.rechnungsnummer} · ` : ''}
                        {r.rechnungsdatum ? formatDatum(r.rechnungsdatum) : '—'}
                        {r.faellig_am ? ` · fällig ${formatDatum(r.faellig_am)}` : ''}
                        {' · '}
                        {formatEurBetrag(r.brutto ?? 0)}
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

      {variant === 'page' || !onFooterChange ? (
        <div
          className="modal-f"
          style={{
            margin: '0 -4px',
            paddingLeft: 0,
            paddingRight: 0,
            borderTop: '0.5px solid var(--border)',
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
}
