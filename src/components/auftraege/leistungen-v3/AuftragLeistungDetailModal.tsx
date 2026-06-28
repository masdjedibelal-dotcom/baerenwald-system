'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { leistungStatusLabel, normalizeLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import type { AuftragPosition } from '@/lib/types'
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pos.leistung_name}
      size="lg"
      footer={
        <>
          <Button type="button" variant="danger" onClick={onRemove} disabled={disabled}>
            Entfernen
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={onZuweisen} disabled={disabled}>
              Handwerker zuweisen
            </Button>
            <Button type="button" variant="primary" onClick={onEdit} disabled={disabled}>
              Bearbeiten
            </Button>
          </div>
        </>
      }
    >
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
        <div>
          <dt>Baufortschritt</dt>
          <dd>{leistungStatusLabel(normalizeLeistungStatus(pos.leistung_status))}</dd>
        </div>
        <div>
          <dt>Handwerker</dt>
          <dd>{hwName ?? '— noch nicht zugewiesen —'}</dd>
        </div>
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
