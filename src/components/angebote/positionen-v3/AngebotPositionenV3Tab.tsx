'use client'

import { useMemo, useState, useTransition } from 'react'
import { ClipboardList, Plus, Trash2, X } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { bulkDeleteAngebotPositionen } from '@/app/(dashboard)/angebote/angebot-positionen-steuerung-actions'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { summenAusPositionen, positionNettoZeile } from '@/lib/angebot-positionen'
import {
  groupAngebotPositionenByBlockForAnzeige,
  type AngebotBlockPdfEntry,
  type AngebotPositionBlockGroup,
} from '@/lib/angebote/angebot-position-blocks'
import type { AngebotPosition, Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuftragGewerkAddRow } from '@/components/auftraege/leistungen-v3/AuftragGewerkAddRow'
import { AngebotPositionDetailModal } from '@/components/angebote/positionen-v3/AngebotPositionDetailModal'
import { AngebotLeistungEditModal } from '@/components/angebote/positionen-v3/AngebotLeistungEditModal'
import { AngebotLeistungNewModal } from '@/components/angebote/positionen-v3/AngebotLeistungNewModal'
import {
  angebotPositionAnzeigeTitel,
  angebotPositionenFuerAnzeige,
  angebotRowMarge,
  blockVkSummeAngebot,
  blockVkSummeAngebotBlock,
  createLeeresAngebotGewerkBlock,
  groupAngebotPositionenByGewerkBlock,
  type AngebotGewerkBlock,
  type AngebotGewerkOpt,
} from '@/components/angebote/positionen-v3/utils'

function FreitextRow({ entry }: { entry: Extract<AngebotBlockPdfEntry, { kind: 'freitext' }> }) {
  return (
    <li>
      <div className="pos-v3-row pos-v3-row--freitext">
        <span className="pos-v3-check w-4 shrink-0" aria-hidden />
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

export function AngebotPositionenV3Tab({
  angebotId,
  positionen,
  gewerke,
  mwstSatz = 19,
  editable = false,
  onChanged,
}: {
  angebotId: string
  positionen: AngebotPosition[]
  gewerke: Gewerk[]
  mwstSatz?: number
  editable?: boolean
  onChanged?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [detailPos, setDetailPos] = useState<AngebotPosition | null>(null)
  const [detailGewerk, setDetailGewerk] = useState('')
  const [editPos, setEditPos] = useState<AngebotPosition | null>(null)
  const [newBlock, setNewBlock] = useState<AngebotGewerkBlock | null>(null)
  const [extraBlocks, setExtraBlocks] = useState<AngebotGewerkBlock[]>([])

  const disabled = !editable || pending
  const gewerkOpts: AngebotGewerkOpt[] = useMemo(
    () => gewerke.map((g) => ({ id: g.id, name: g.name, slug: g.slug })),
    [gewerke]
  )

  const anzeigePositionen = useMemo(() => angebotPositionenFuerAnzeige(positionen), [positionen])
  const editBlocks = useMemo(
    () => groupAngebotPositionenByGewerkBlock(positionen, gewerke),
    [positionen, gewerke]
  )
  const displayBlocks = useMemo(
    () => groupAngebotPositionenByBlockForAnzeige(positionen, gewerke),
    [positionen, gewerke]
  )
  const allEditBlocks = useMemo(() => {
    const keys = new Set(editBlocks.map((b) => b.key))
    const pendingBlocks = extraBlocks.filter((b) => !keys.has(b.key))
    return [...editBlocks, ...pendingBlocks]
  }, [editBlocks, extraBlocks])

  const summen = useMemo(
    () => summenAusPositionen(anzeigePositionen, mwstSatz),
    [anzeigePositionen, mwstSatz]
  )

  const vkGesamt = summen.nettoMin
  const ekGesamt = summen.einkaufZeileMin
  const margeGesamt = summen.margeMin
  const margePct = vkGesamt > 0 ? Math.round((margeGesamt / vkGesamt) * 1000) / 10 : null

  function refresh() {
    onChanged?.()
  }

  function openDetail(pos: AngebotPosition, gewerkName: string) {
    setDetailPos(pos)
    setDetailGewerk(gewerkName)
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleBlockPositions(ids: string[]) {
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  function addGewerk(g: AngebotGewerkOpt) {
    const block = createLeeresAngebotGewerkBlock(g)
    setExtraBlocks((prev) => [...prev, block])
    setNewBlock(block)
  }

  function removeEmptyBlock(block: AngebotGewerkBlock) {
    if (block.positionen.length > 0) return
    setExtraBlocks((prev) => prev.filter((b) => b.key !== block.key))
    if (newBlock?.key === block.key) setNewBlock(null)
  }

  function onPositionSaved() {
    if (newBlock) {
      setExtraBlocks((prev) => prev.filter((b) => b.key !== newBlock.key))
    }
    refresh()
  }

  function bulkDelete() {
    const ids = Array.from(selectedIds)
    if (!ids.length) return
    if (
      !window.confirm(
        ids.length === 1
          ? 'Diese Position wirklich entfernen?'
          : `${ids.length} Positionen wirklich entfernen?`
      )
    ) {
      return
    }
    startTransition(async () => {
      const r = await bulkDeleteAngebotPositionen(angebotId, ids)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(r.deleted === 1 ? 'Position entfernt.' : `${r.deleted} Positionen entfernt.`)
      clearSelection()
      setDetailPos(null)
      refresh()
    })
  }

  function deleteOne(pos: AngebotPosition) {
    const titel = angebotPositionAnzeigeTitel(pos)
    if (!window.confirm(`„${titel}" wirklich entfernen?`)) return
    startTransition(async () => {
      const r = await bulkDeleteAngebotPositionen(angebotId, [pos.id])
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Position entfernt.')
      setDetailPos(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(pos.id)
        return next
      })
      refresh()
    })
  }

  const selectedCount = selectedIds.size
  const freitextByBlockKey = useMemo(() => {
    const map = new Map<string, AngebotBlockPdfEntry[]>()
    for (const block of displayBlocks) {
      const freitexte = block.entries.filter((e) => e.kind === 'freitext')
      if (freitexte.length) map.set(block.key, freitexte)
    }
    return map
  }, [displayBlocks])

  if (!editable && !anzeigePositionen.length) {
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

  if (editable && !anzeigePositionen.length && extraBlocks.length === 0) {
    return (
      <div className="pos-v3">
        <EmptyState
          icon={ClipboardList}
          title="Noch keine Gewerke"
          description="Legen Sie zuerst ein Gewerk an und fügen Sie danach Positionen hinzu."
          action={
            <AuftragGewerkAddRow
              gewerke={gewerkOpts}
              disabled={disabled}
              className="pos-gewerk-add-row justify-center"
              onAdd={addGewerk}
            />
          }
        />
        <AngebotLeistungNewModal
          open={newBlock !== null}
          onClose={() => setNewBlock(null)}
          angebotId={angebotId}
          block={newBlock}
          gewerke={gewerkOpts}
          onSaved={onPositionSaved}
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

      {editable
        ? allEditBlocks.map((block) => (
            <EditableGewerkBlock
              key={block.key}
              block={block}
              freitextEntries={freitextByBlockKey.get(block.key) ?? []}
              selectedIds={selectedIds}
              disabled={disabled}
              onToggleBlock={() => toggleBlockPositions(block.positionen.map((p) => p.id))}
              onToggleOne={toggleOne}
              onOpenDetail={openDetail}
              onDeleteOne={deleteOne}
              onAdd={() => setNewBlock(block)}
              onRemoveEmpty={() => removeEmptyBlock(block)}
            />
          ))
        : displayBlocks.map((block) => (
            <ReadonlyGewerkBlock
              key={block.key}
              block={block}
              detailPosId={detailPos?.id ?? null}
              onOpenDetail={openDetail}
            />
          ))}

      {editable ? (
        <AuftragGewerkAddRow gewerke={gewerkOpts} disabled={disabled} onAdd={addGewerk} />
      ) : null}

      {editable && selectedCount > 0 ? (
        <div className="pos-v3-bulk-bar">
          <span className="text-sm font-medium text-bw-text">{selectedCount} ausgewählt</span>
          <Button type="button" variant="danger" size="sm" disabled={disabled} onClick={bulkDelete}>
            <Trash2 className="h-4 w-4" />
            Entfernen
          </Button>
          <button
            type="button"
            className="pos-v3-bulk-close"
            aria-label="Auswahl aufheben"
            onClick={clearSelection}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <AngebotPositionDetailModal
        open={!!detailPos}
        onClose={() => setDetailPos(null)}
        pos={detailPos}
        gewerkName={detailGewerk}
        disabled={disabled}
        editable={editable}
        onRemove={() => detailPos && deleteOne(detailPos)}
        onEdit={() => {
          if (detailPos) {
            setEditPos(detailPos)
            setDetailPos(null)
          }
        }}
      />

      {editable ? (
        <>
          <AngebotLeistungEditModal
            open={!!editPos}
            onClose={() => setEditPos(null)}
            pos={editPos}
            angebotId={angebotId}
            onSaved={refresh}
          />
          <AngebotLeistungNewModal
            open={newBlock !== null}
            onClose={() => setNewBlock(null)}
            angebotId={angebotId}
            block={newBlock}
            gewerke={gewerkOpts}
            onSaved={onPositionSaved}
          />
        </>
      ) : null}
    </div>
  )
}

function ReadonlyGewerkBlock({
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
            <ReadonlyPositionRow
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

function ReadonlyPositionRow({
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
  const mengeLabel = pos.menge && pos.einheit ? `${pos.menge} ${pos.einheit}` : null

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

function EditableGewerkBlock({
  block,
  freitextEntries,
  selectedIds,
  disabled,
  onToggleBlock,
  onToggleOne,
  onOpenDetail,
  onDeleteOne,
  onAdd,
  onRemoveEmpty,
}: {
  block: AngebotGewerkBlock
  freitextEntries: AngebotBlockPdfEntry[]
  selectedIds: Set<string>
  disabled: boolean
  onToggleBlock: () => void
  onToggleOne: (id: string) => void
  onOpenDetail: (pos: AngebotPosition, gewerkName: string) => void
  onDeleteOne: (pos: AngebotPosition) => void
  onAdd: () => void
  onRemoveEmpty: () => void
}) {
  const blockIds = block.positionen.map((p) => p.id)
  const blockAllSelected = blockIds.length > 0 && blockIds.every((id) => selectedIds.has(id))
  const blockSomeSelected = blockIds.some((id) => selectedIds.has(id))
  const isEmpty = block.positionen.length === 0
  const vkSumme = blockVkSummeAngebotBlock(block)

  return (
    <section className="pos-v3-gewerk">
      <header className="pos-v3-gewerk-head">
        {blockIds.length > 0 ? (
          <label className="pos-v3-check">
            <input
              type="checkbox"
              checked={blockAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = blockSomeSelected && !blockAllSelected
              }}
              disabled={disabled}
              onChange={onToggleBlock}
            />
          </label>
        ) : (
          <span className="pos-v3-check w-4 shrink-0" aria-hidden />
        )}
        <span className="pos-v3-gewerk-name">Gewerk: {block.gewerkName}</span>
        <span className="pos-v3-gewerk-vk">
          {isEmpty ? 'Noch keine Leistungen' : `VK gesamt: ${formatEurBetrag(vkSumme)}`}
        </span>
        {isEmpty ? (
          <button
            type="button"
            className="pos-v3-row-delete"
            disabled={disabled}
            aria-label="Leeren Gewerk-Abschnitt entfernen"
            onClick={onRemoveEmpty}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <ul className="pos-v3-rows">
        {freitextEntries.map((entry, idx) => {
          if (entry.kind !== 'freitext') return null
          return <FreitextRow key={`${block.key}-ft-${idx}`} entry={entry} />
        })}
        {block.positionen.map((pos) => {
          const { ek, pct } = angebotRowMarge(pos)
          const vk = positionNettoZeile(pos)
          const titel = angebotPositionAnzeigeTitel(pos)
          const hwName = pos.handwerker_name?.trim()
          const mengeLabel = pos.menge && pos.einheit ? `${pos.menge} ${pos.einheit}` : null

          return (
            <li key={pos.id}>
              <div
                className={cn('pos-v3-row', selectedIds.has(pos.id) && 'pos-v3-row--selected')}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDetail(pos, block.gewerkName)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpenDetail(pos, block.gewerkName)
                  }
                }}
              >
                <label className="pos-v3-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(pos.id)}
                    disabled={disabled}
                    onChange={() => onToggleOne(pos.id)}
                  />
                </label>

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

                <button
                  type="button"
                  className="pos-v3-row-delete"
                  disabled={disabled}
                  aria-label="Position entfernen"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteOne(pos)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className="pos-v3-add-btn" disabled={disabled} onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Position hinzufügen
      </button>
    </section>
  )
}
