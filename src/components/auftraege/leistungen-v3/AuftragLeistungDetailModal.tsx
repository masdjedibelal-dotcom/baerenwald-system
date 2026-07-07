'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { leistungStatusLabel, normalizeLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import { istPartnerEntfernungAusstehend } from '@/lib/auftraege/partner-vorgang-display'
import type { AuftragPosition } from '@/lib/types'
import { PartnerVorgangChip } from '@/components/auftraege/leistungen-v3/PartnerVorgangChip'
import { HandwerkerAntwortChip } from '@/components/auftraege/leistungen-v3/HandwerkerAntwortChip'
import { handwerkerAntwortAnzeige } from '@/lib/auftraege/partner-vorgang-display'
import { formatZeitraumKurz, rowMarge } from '@/components/auftraege/leistungen-v3/utils'

export function AuftragLeistungDetailModal({
  open,
  onClose,
  pos,
  gewerkName,
  onRemove,
  onZuweisen,
  onEdit,
  disabled,
}: {
  open: boolean
  onClose: () => void
  pos: AuftragPosition | null
  gewerkName: string
  onRemove: () => void
  onZuweisen: () => void
  onEdit: () => void
  disabled?: boolean
}) {
  if (!pos) return null

  const { ek, marge, pct } = rowMarge(pos)
  const vk = Math.max(0, pos.preis_fix ?? 0)
  const zeitraum = formatZeitraumKurz(pos)
  const hwName = pos.handwerker?.name
  const entferntPending = istPartnerEntfernungAusstehend(pos)
  const rowLocked = entferntPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pos.leistung_name}
      size="lg"
      footer={
        <>
          {!rowLocked ? (
            <Button type="button" variant="danger" onClick={onRemove} disabled={disabled}>
              Entfernen
            </Button>
          ) : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {!rowLocked ? (
              <>
                <Button type="button" variant="secondary" onClick={onZuweisen} disabled={disabled}>
                  Handwerker zuweisen
                </Button>
                <Button type="button" variant="primary" onClick={onEdit} disabled={disabled}>
                  Bearbeiten
                </Button>
              </>
            ) : (
              <Button type="button" variant="secondary" onClick={onClose}>
                Schließen
              </Button>
            )}
          </div>
        </>
      }
    >
      {rowLocked ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
          Diese Leistung ist als entfernt markiert und wartet auf Bestätigung im Partner-Portal. Erst
          danach verschwindet sie aus dem Vorgang.
        </p>
      ) : null}
      <PartnerVorgangChip pos={pos} className="mb-3" />
      <HandwerkerAntwortChip pos={pos} className="mb-3" />
      {!pos.handwerker_id ? (
        <p className="mb-3 rounded-lg border border-bw-border bg-bw-green-bg/40 px-3 py-2 text-xs text-bw-text-muted">
          Tipp: Beim Anlegen einer neuen Leistung direkt einen Handwerker wählen — schneller als
          nachträglich zuweisen.
        </p>
      ) : null}
      <dl className="pos-v3-detail-grid">
        <div>
          <dt>Bezeichnung</dt>
          <dd>{pos.leistung_name}</dd>
        </div>
        {pos.beschreibung ? (
          <div className="col-span-full">
            <dt>Beschreibung</dt>
            <dd className="whitespace-pre-wrap">{pos.beschreibung}</dd>
          </div>
        ) : null}
        <div>
          <dt>Gewerk</dt>
          <dd>{gewerkName}</dd>
        </div>
        <div>
          <dt>VK netto</dt>
          <dd className="tabular-nums">{formatEurBetrag(vk)}</dd>
        </div>
        <div>
          <dt>EK netto</dt>
          <dd className="tabular-nums">{formatEurBetrag(ek)}</dd>
        </div>
        <div>
          <dt>Marge</dt>
          <dd className="tabular-nums">
            {formatEurBetrag(marge)}
            {pct != null ? ` (${pct} %)` : ''}
          </dd>
        </div>
        {pos.preis_alt != null && pos.preis_alt > 0 ? (
          <div>
            <dt>EK vorher (Partner)</dt>
            <dd className="tabular-nums">{formatEurBetrag(pos.preis_alt)}</dd>
          </div>
        ) : null}
        <div>
          <dt>Baufortschritt</dt>
          <dd>{leistungStatusLabel(normalizeLeistungStatus(pos.leistung_status))}</dd>
        </div>
        <div>
          <dt>Handwerker</dt>
          <dd>{hwName ?? '— noch nicht zugewiesen —'}</dd>
        </div>
        {pos.handwerker_id ? (
          <div>
            <dt>Anfrage-Status</dt>
            <dd>{handwerkerAntwortAnzeige(pos)?.label ?? '—'}</dd>
          </div>
        ) : null}
        {zeitraum ? (
          <div>
            <dt>Zeitraum</dt>
            <dd>{zeitraum}</dd>
          </div>
        ) : null}
      </dl>
    </Modal>
  )
}
