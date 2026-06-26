'use client'

import { useState, useTransition } from 'react'
import { FileUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { HandwerkerEinreichungPruefung } from '@/components/angebote/HandwerkerEinreichungPruefung'
import { HandwerkerEinreichungManuellModal } from '@/components/angebote/HandwerkerEinreichungManuellModal'
import {
  updateAuftragPositionHandwerkerStatus,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  auftragHwStatusBadgeClass,
  auftragHwStatusLabel,
  type AuftragHandwerkerZuweisungStatus,
} from '@/lib/auftraege/auftrag-handwerker-status'
import { effektiverHandwerkerStatus } from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import { labelHandwerkerAblehnung } from '@/lib/angebote/ablehnung-labels'
import { hasHwEinreichung, hwStatusBadgeClass, hwStatusLabel } from '@/lib/partner/handwerker-einreichung'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { cn, formatDatumZeit } from '@/lib/utils'
import type { AngebotHandwerkerRow, AuftragPosition } from '@/lib/types'

function partnerAntwortLabel(row: AngebotHandwerkerRow | null): string | null {
  if (!row) return null
  const st = (row.status ?? '').toLowerCase()
  if (st === 'akzeptiert') return 'Partner hat angenommen'
  if (st === 'abgelehnt') return 'Partner hat abgelehnt'
  if (row.antwort_at) return 'Partner hat geantwortet'
  return null
}

export function AuftragPositionHandwerkerBadge({
  pos,
  partnerRow,
  className,
}: {
  pos: Pick<AuftragPosition, 'handwerker_id' | 'handwerker_status'>
  partnerRow: AngebotHandwerkerRow | null
  className?: string
}) {
  if (!pos.handwerker_id) return null
  const st = effektiverHandwerkerStatus(pos, partnerRow)
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
        auftragHwStatusBadgeClass(st),
        className
      )}
    >
      HW: {auftragHwStatusLabel(st)}
    </span>
  )
}

export function AuftragPositionHandwerkerPanel({
  pos,
  partnerRow,
  angebotId,
  angebotTitel,
  auftragId,
  compact = false,
  onChanged,
  onAcceptWizard,
}: {
  pos: AuftragPosition
  partnerRow: AngebotHandwerkerRow | null
  angebotId: string | null
  angebotTitel: string
  auftragId: string
  compact?: boolean
  onChanged: () => void
  onAcceptWizard?: (ctx: {
    auftragId: string
    handwerkerId: string
    gewerkId: string
    zuweisungId: string
  }) => void
}) {
  const [pending, startTransition] = useTransition()
  const [manuellOpen, setManuellOpen] = useState(false)

  if (!pos.handwerker_id) return null

  const hwStatus = effektiverHandwerkerStatus(pos, partnerRow) as AuftragHandwerkerZuweisungStatus
  const eingereicht = partnerRow ? hasHwEinreichung(partnerRow) : false
  const antwortHinweis = partnerAntwortLabel(partnerRow)
  const kannManuell =
    Boolean(angebotId && partnerRow?.id) &&
    !eingereicht &&
    (partnerRow?.status ?? '').toLowerCase() !== 'abgelehnt'

  function changeStatus(st: AuftragHandwerkerZuweisungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionHandwerkerStatus({
        auftragId,
        positionId: pos.id,
        status: st,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  return (
    <div className={cn('rounded-lg border border-bw-border bg-bw-bg-soft/50', compact ? 'p-2.5' : 'p-3')}>
      {pos.handwerker?.name ? (
        <p className="text-sm font-medium text-bw-text">{pos.handwerker.name}</p>
      ) : null}

      <div className={pos.handwerker?.name ? 'mt-2' : undefined}>
        <Select
          label="Partner-Status"
          name={`hw-status-${pos.id}`}
          value={hwStatus}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as AuftragHandwerkerZuweisungStatus)}
          options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          className="text-sm"
        />
      </div>

      {partnerRow ? (
        <div className="mt-3 space-y-2 border-t border-bw-border pt-3">
          {antwortHinweis ? (
            <p className="text-xs text-bw-text-muted">
              <span className="font-medium text-bw-text">{antwortHinweis}</span>
              {partnerRow.antwort_at ? ` · ${formatDatumZeit(partnerRow.antwort_at)}` : null}
            </p>
          ) : null}

          {(partnerRow.status ?? '').toLowerCase() === 'abgelehnt' && partnerRow.ablehnung_grund ? (
            <p className="rounded-md border border-danger/30 bg-danger/5 px-2 py-1.5 text-xs text-danger">
              Grund: {labelHandwerkerAblehnung(partnerRow.ablehnung_grund)}
              {partnerRow.antwort_notiz?.trim() ? ` — ${partnerRow.antwort_notiz.trim()}` : ''}
            </p>
          ) : null}

          {eingereicht ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  hwStatusBadgeClass(partnerRow.hw_status)
                )}
              >
                Angebot: {hwStatusLabel(partnerRow.hw_status)}
              </span>
              {partnerRow.hw_preis_netto != null ? (
                <span className="text-xs text-bw-text-muted">
                  Netto {betragAnzeige(partnerRow.hw_preis_netto, null, null)}
                </span>
              ) : null}
            </div>
          ) : hwStatus === 'angefragt' || hwStatus === 'warten' ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
              Warte auf Partner-Angebot (Preis & PDF im Partner-Portal).
            </p>
          ) : null}

          {partnerRow.hw_notiz?.trim() ? (
            <p className="text-xs text-bw-text-muted whitespace-pre-wrap">
              <span className="font-medium text-bw-text">Partner-Notiz:</span> {partnerRow.hw_notiz.trim()}
            </p>
          ) : null}

          {kannManuell ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setManuellOpen(true)}
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden />
              Angebot manuell erfassen
            </Button>
          ) : null}
        </div>
      ) : null}

      {angebotId && partnerRow?.id && eingereicht ? (
        <HandwerkerEinreichungPruefung
          z={partnerRow}
          angebotId={angebotId}
          angebotTitel={angebotTitel}
          auftragId={auftragId}
          onRefresh={onChanged}
          onAcceptWizard={onAcceptWizard}
        />
      ) : null}

      {angebotId && partnerRow?.id ? (
        <HandwerkerEinreichungManuellModal
          open={manuellOpen}
          onClose={() => setManuellOpen(false)}
          angebotId={angebotId}
          zuweisungId={partnerRow.id}
          handwerkerName={pos.handwerker?.name ?? 'Partner'}
          gewerkName={partnerRow.gewerke?.name ?? pos.gewerk_name}
          onSaved={() => {
            setManuellOpen(false)
            onChanged()
          }}
        />
      ) : null}
    </div>
  )
}
