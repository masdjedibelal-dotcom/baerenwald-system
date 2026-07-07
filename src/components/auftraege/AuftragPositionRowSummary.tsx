'use client'

import { ChevronDown, Trash2 } from 'lucide-react'
import {
  buildPositionHandwerkerView,
  formatMargeSummary,
} from '@/lib/auftraege/position-handwerker-view'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition } from '@/lib/types'
import { cn, formatPreis } from '@/lib/utils'

export function AuftragPositionRowSummary({
  pos,
  open,
  partnerRow,
  angebotPositionen = [],
  eigenregie = false,
  onToggle,
  onDelete,
}: {
  pos: AuftragPosition
  open: boolean
  partnerRow: AngebotHandwerkerRow | null
  angebotPositionen?: AngebotPosition[]
  eigenregie?: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const view = buildPositionHandwerkerView(pos, partnerRow, angebotPositionen)

  return (
    <button type="button" className={cn('pos-v2-row-head', open && 'pos-v2-row-head--open')} onClick={onToggle}>
      <ChevronDown
        className={cn('pos-v2-row-chevron', open && 'pos-v2-row-chevron--open')}
        aria-hidden
      />

      <div className="pos-v2-row-main">
        <span className="pos-v2-row-name">{pos.leistung_name}</span>
        {!eigenregie ? (
          <span className="pos-v2-row-meta">
            {view.handwerkerName ? (
              <>
                <span className="pos-v2-row-hw">{view.handwerkerName}</span>
                <span className="pos-v2-row-dot" aria-hidden>
                  ·
                </span>
              </>
            ) : (
              <>
                <span className="pos-v2-row-hw pos-v2-row-hw--empty">Kein Handwerker</span>
                <span className="pos-v2-row-dot" aria-hidden>
                  ·
                </span>
              </>
            )}
            {view.verhandlungBadge ? (
              <span className={cn('pos-v2-badge', view.verhandlungBadge.badgeClass)}>
                {view.verhandlungBadge.label}
                {view.verhandlungBadge.deltaText ? (
                  <span className="pos-v2-badge-delta"> {view.verhandlungBadge.deltaText}</span>
                ) : null}
              </span>
            ) : view.eigenleistung ? (
              <span className="pos-v2-badge pos-v2-badge-muted">Eigenleistung</span>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="pos-v2-row-pricing" onClick={(e) => e.stopPropagation()}>
        <span className="pos-v2-row-vk">{formatPreis(pos.preis_fix ?? null, null, null)}</span>
        {view.vk > 0 ? (
          <span
            className={cn(
              'pos-v2-row-marge',
              view.marge >= 0 ? 'pos-v2-row-marge--pos' : 'pos-v2-row-marge--neg'
            )}
          >
            {formatMargeSummary(view.vk, view.marge, view.margeProzent)}
          </span>
        ) : null}
      </div>

      <span className={cn('pos-v2-row-progress', view.leistungStatusBadgeClass)}>
        {view.leistungStatusLabel}
      </span>

      <button
        type="button"
        className="pos-v2-row-delete icon-btn text-status-cancel-text"
        title="Löschen"
        aria-label={`${pos.leistung_name} löschen`}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </button>
  )
}
