'use client'

import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { positionNettoZeile } from '@/lib/angebot-positionen'
import { RichTextContent } from '@/components/ui/RichTextContent'
import type { AngebotPosition } from '@/lib/types'
import { angebotPositionAnzeigeTitel, angebotRowMarge } from '@/components/angebote/positionen-v3/utils'

export function AngebotPositionDetailModal({
  open,
  onClose,
  pos,
  gewerkName,
  editable = false,
  disabled = false,
  onRemove,
  onEdit,
}: {
  open: boolean
  onClose: () => void
  pos: AngebotPosition | null
  gewerkName: string
  editable?: boolean
  disabled?: boolean
  onRemove?: () => void
  onEdit?: () => void
}) {
  if (!pos) return null

  const titel = angebotPositionAnzeigeTitel(pos)
  const vk = positionNettoZeile(pos)
  const { ek, marge, pct } = angebotRowMarge(pos)
  const besch = pos.beschreibung?.trim()
  const hwName = pos.handwerker_name?.trim()
  const canEdit = Boolean(editable && onEdit)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={titel}
      context="detail"
      size="lg"
      confirmDisabled={disabled || !canEdit}
      onConfirm={canEdit ? onEdit : undefined}
    >
      <dl className="pos-v3-detail-grid">
        <div>
          <dt>Bezeichnung</dt>
          <dd>{titel}</dd>
        </div>
        {besch && besch !== titel ? (
          <div className="col-span-full">
            <dt>Beschreibung</dt>
            <dd>
              <RichTextContent html={besch} className="text-[length:var(--fs-text)] text-bw-text" />
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Gewerk</dt>
          <dd>{gewerkName}</dd>
        </div>
        <div>
          <dt>VK netto</dt>
          <dd>{formatEurBetrag(vk)}</dd>
        </div>
        <div>
          <dt>EK netto</dt>
          <dd>{ek > 0 ? formatEurBetrag(ek) : '—'}</dd>
        </div>
        <div>
          <dt>Marge</dt>
          <dd>
            {ek > 0 ? (
              <>
                {formatEurBetrag(marge)}
                {pct != null ? ` (${pct} %)` : ''}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt>Menge</dt>
          <dd>
            {pos.menge} {pos.einheit}
          </dd>
        </div>
        {hwName ? (
          <div>
            <dt>Handwerker</dt>
            <dd>{hwName}</dd>
          </div>
        ) : null}
        {pos.ist_fachbetrieb ? (
          <div>
            <dt>Fachbetrieb</dt>
            <dd>Ja</dd>
          </div>
        ) : null}
      </dl>
      {editable && onRemove ? (
        <div className="mt-4">
          <Button type="button" variant="danger" onClick={onRemove} disabled={disabled}>
            Entfernen
          </Button>
        </div>
      ) : null}
    </EditorSheet>
  )
}
