'use client'

import Link from 'next/link'
import { SidePanel } from '@/components/ui/SidePanel'
import { formatRelativeDate, cn } from '@/lib/utils'
import type { KundeListeZeile } from '@/lib/kunden/load-kunden-liste'

function typBadgeClass(typ: string) {
  if (typ === 'gewerbe') return 'badge badge-order'
  if (typ === 'hausverwaltung') return 'badge badge-offer'
  return 'badge badge-new'
}

function typBadgeLabel(typ: string) {
  if (typ === 'gewerbe') return 'Gewerbe'
  if (typ === 'hausverwaltung') return 'Hausverwaltung'
  return 'Privat'
}

export function KundeSidePanel({
  open,
  onClose,
  kundeId,
  summary,
  onBearbeiten,
}: {
  open: boolean
  onClose: () => void
  kundeId: string | null
  summary: KundeListeZeile | null
  onBearbeiten: () => void
}) {
  if (!summary || !kundeId) return null

  const aktiv = summary.letzte_aktivitaet ?? summary.created_at

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={summary.name}
      subtitle={summary.kundennummer ?? undefined}
      width="md"
      badge={<span className={cn(typBadgeClass(summary.typ))}>{typBadgeLabel(summary.typ)}</span>}
      actions={null}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-bw-primary text-lg font-semibold text-white">
            {summary.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-bw-text">{summary.name}</div>
            <div className="text-xs text-bw-text-muted">{summary.kundennummer ?? '—'}</div>
          </div>
        </div>

        <div className="space-y-1">
          {summary.telefon ? (
            <a href={`tel:${summary.telefon}`} className="flex items-center gap-2 py-1 text-sm text-bw-link">
              📞 {summary.telefon}
            </a>
          ) : null}
          {summary.email ? (
            <a href={`mailto:${summary.email}`} className="flex items-center gap-2 truncate py-1 text-sm text-bw-link">
              ✉️ {summary.email}
            </a>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-bw-hover p-3 text-center">
            <div className="text-xl font-semibold text-bw-text">{summary.anzahl_auftraege ?? 0}</div>
            <div className="text-xs text-bw-text-muted">Projekte</div>
          </div>
          <div className="rounded-lg bg-bw-hover p-3 text-center">
            <div className="text-xl font-semibold text-bw-text">{(summary.gesamt_umsatz ?? 0).toLocaleString('de')} €</div>
            <div className="text-xs text-bw-text-muted">Umsatz</div>
          </div>
        </div>

        <p className="text-xs text-bw-text-muted">Letzte Aktivität: {formatRelativeDate(aktiv)}</p>

        <div className="space-y-2 border-t border-bw-border pt-2">
          <Link href={`/anfragen/neu?kunde_id=${summary.id}`} className="btn btn-primary btn-sm inline-flex w-full justify-center">
            + Neue Anfrage
          </Link>
          <Link href={`/kunden/${kundeId}`} className="btn btn-secondary btn-sm inline-flex w-full justify-center">
            Zur Kundenakte →
          </Link>
          <button type="button" className="btn btn-secondary btn-sm w-full" onClick={onBearbeiten}>
            ✏️ Bearbeiten
          </button>
        </div>
      </div>
    </SidePanel>
  )
}
