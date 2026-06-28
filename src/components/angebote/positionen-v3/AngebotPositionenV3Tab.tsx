'use client'

import { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { summenAusPositionen, positionNettoZeile } from '@/lib/angebot-positionen'
import {
  groupAngebotPositionenByBlockForAnzeige,
  type AngebotBlockPdfEntry,
  type AngebotPositionBlockGroup,
} from '@/lib/angebote/angebot-position-blocks'
import type { AngebotPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AngebotPositionDetailModal } from '@/components/angebote/positionen-v3/AngebotPositionDetailModal'
import {
  angebotPositionAnzeigeTitel,
  angebotPositionenFuerAnzeige,
  angebotRowMarge,
  blockVkSummeAngebot,
} from '@/components/angebote/positionen-v3/utils'

function FreitextRow({ entry }: { entry: Extract<AngebotBlockPdfEntry, { kind: 'freitext' }> }) {
  return (
    <li>
      <div className="pos-v3-row pos-v3-row--freitext">
        <div className="pos-v3-row-main min-w-0 flex-1">
          {entry.freitext.titel ? (
            <span className="pos-v3-row-name text-bw-text-muted">{entry.freitext.titel}</span>
          ) : null}
          {entry.freitext.text ? (
            <RichTextContent
              html={entry.freitext.text}
              className="mt-0.5 text-xs text-bw-text-muted"
            />
          ) : null}
        </div>
      </div>
    </li>
  )
}

function PositionRow({
  pos,
  selected,
  onOpen,
}: {
  pos: AngebotPosition
  selected: boolean
  onOpen: () => void
}) {
  const { ek, pct } = angebotRowMarge(pos)
  const vk = positionNettoZeile(pos)
  const titel = angebotPositionAnzeigeTitel(pos)
  const hwName = pos.handwerker_name?.trim()
  const mengeLabel =
    pos.menge && pos.einheit ? `${pos.menge} ${pos.einheit}` : null

  return (
    <li>
      <div
        className={cn('pos-v3-row', selected && 'pos-v3-row--selected')}
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
      >
        <div className="pos-v3-row-main">
          <span className="pos-v3-row-name">{titel}</span>
          {hwName ? <span className="pos-v3-hw-chip">{hwName}</span> : null}
          {mengeLabel ? <span className="pos-v3-row-zeitraum">{mengeLabel}</span> : null}
        </div>

        <div className="pos-v3-row-pricing">
          <span className="pos-v3-row-vk">{formatEurBetrag(vk)}</span>
          <span className="pos-v3-row-ek">
            EK {ek > 0 ? formatEurBetrag(ek) : '—'}
            {pct != null && ek > 0 ? ` · ${pct} %` : ''}
          </span>
        </div>
      </div>
    </li>
  )
}

export function AngebotPositionenV3Tab({
  positionen,
  gewerke,
  mwstSatz = 19,
}: {
  positionen: AngebotPosition[]
  gewerke: Gewerk[]
  mwstSatz?: number
}) {
  const [detailPos, setDetailPos] = useState<AngebotPosition | null>(null)
  const [detailGewerk, setDetailGewerk] = useState('')

  const anzeigePositionen = useMemo(() => angebotPositionenFuerAnzeige(positionen), [positionen])
  const blocks = useMemo(
    () => groupAngebotPositionenByBlockForAnzeige(positionen, gewerke),
    [positionen, gewerke]
  )
  const summen = useMemo(() => summenAusPositionen(anzeigePositionen, mwstSatz), [anzeigePositionen, mwstSatz])

  const vkGesamt = summen.nettoMin
  const ekGesamt = summen.einkaufZeileMin
  const margeGesamt = summen.margeMin
  const margePct = vkGesamt > 0 ? Math.round((margeGesamt / vkGesamt) * 1000) / 10 : null

  function openDetail(pos: AngebotPosition, gewerkName: string) {
    setDetailPos(pos)
    setDetailGewerk(gewerkName)
  }

  if (!anzeigePositionen.length) {
    return (
      <div className="pos-v3">
        <EmptyState
          icon={ClipboardList}
          title="Noch keine Positionen"
          description="Dieses Angebot enthält noch keine Leistungen."
        />
      </div>
    )
  }

  return (
    <div className="pos-v3">
      <div className="pos-v3-totals">
        <div>
          <span className="pos-v3-totals-label">VK gesamt</span>
          <span className="pos-v3-totals-value">{formatEurBetrag(vkGesamt)}</span>
        </div>
        <div>
          <span className="pos-v3-totals-label">EK gesamt</span>
          <span className="pos-v3-totals-value">{formatEurBetrag(ekGesamt)}</span>
        </div>
        <div>
          <span className="pos-v3-totals-label">Marge gesamt</span>
          <span className="pos-v3-totals-value">
            {formatEurBetrag(margeGesamt)}
            {margePct != null ? ` (${margePct} %)` : ''}
          </span>
        </div>
      </div>

      {blocks.map((block) => (
        <GewerkBlockSection
          key={block.key}
          block={block}
          detailPosId={detailPos?.id ?? null}
          onOpenDetail={openDetail}
        />
      ))}

      <AngebotPositionDetailModal
        open={!!detailPos}
        onClose={() => setDetailPos(null)}
        pos={detailPos}
        gewerkName={detailGewerk}
      />
    </div>
  )
}

function GewerkBlockSection({
  block,
  detailPosId,
  onOpenDetail,
}: {
  block: AngebotPositionBlockGroup
  detailPosId: string | null
  onOpenDetail: (pos: AngebotPosition, gewerkName: string) => void
}) {
  const vkSumme = blockVkSummeAngebot(block)

  return (
    <section className="pos-v3-gewerk">
      <header className="pos-v3-gewerk-head">
        <span className="pos-v3-check w-4 shrink-0" aria-hidden />
        <span className="pos-v3-gewerk-name">Gewerk: {block.titel}</span>
        <span className="pos-v3-gewerk-vk">
          {vkSumme > 0 ? `VK gesamt: ${formatEurBetrag(vkSumme)}` : 'Noch keine Leistungen'}
        </span>
      </header>

      <ul className="pos-v3-rows">
        {block.entries.map((entry, idx) => {
          if (entry.kind === 'freitext') {
            return <FreitextRow key={`${block.key}-ft-${idx}`} entry={entry} />
          }
          return (
            <PositionRow
              key={entry.position.id || `${block.key}-${idx}`}
              pos={entry.position}
              selected={detailPosId === entry.position.id}
              onOpen={() => onOpenDetail(entry.position, block.titel)}
            />
          )
        })}
      </ul>
    </section>
  )
}
