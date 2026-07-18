'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Trash2, UserPlus, X, ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { bulkDeleteAuftragPositionenV3 } from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import { summenPositionen } from '@/lib/auftraege/auftrag-leistung-phasen'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { richTextToPlain } from '@/lib/rich-text'
import { PartnerAbgelehntBanner } from '@/components/auftraege/PartnerAbgelehntBanner'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { AngebotHandwerkerRow, AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuftragLeistungDetailModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungDetailModal'
import { AuftragLeistungEditModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungEditModal'
import { AuftragGewerkAddRow } from '@/components/auftraege/leistungen-v3/AuftragGewerkAddRow'
import { AuftragLeistungNewModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungNewModal'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { PartnerVorgangChip } from '@/components/auftraege/leistungen-v3/PartnerVorgangChip'
import { HandwerkerAntwortChip } from '@/components/auftraege/leistungen-v3/HandwerkerAntwortChip'
import { istPartnerEntfernungAusstehend } from '@/lib/auftraege/partner-vorgang-display'
import {
  blockVkSumme,
  createLeeresGewerkBlock,
  groupPositionenByGewerkSlug,
} from '@/components/auftraege/leistungen-v3/utils'

type GewerkOpt = { id: string; name: string; slug: string }

export function AuftragLeistungenV3Tab({
  auftragId,
  positionen,
  gewerke,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotHandwerker = [],
  handwerkerRows = [],
  handwerkerKontext,
  auftragAbgeschlossen = false,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  angebotId?: string | null
  angebotTitel?: string
  angebotHandwerker?: AngebotHandwerkerRow[]
  handwerkerRows?: AuftragHandwerkerRow[]
  handwerkerKontext?: HandwerkerZuweisenKontext
  auftragAbgeschlossen?: boolean
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [detailPos, setDetailPos] = useState<AuftragPosition | null>(null)
  const [editPos, setEditPos] = useState<AuftragPosition | null>(null)
  const [newBlock, setNewBlock] = useState<AuftragGewerkBlock | null>(null)
  const [zuweisungIds, setZuweisungIds] = useState<string[] | null>(null)
  const [extraBlocks, setExtraBlocks] = useState<AuftragGewerkBlock[]>([])

  const disabled = auftragAbgeschlossen || pending
  const sorted = useMemo(
    () => [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )
  const blocks = useMemo(() => groupPositionenByGewerkSlug(sorted, gewerke), [sorted, gewerke])
  const allBlocks = useMemo(() => {
    const keys = new Set(blocks.map((b) => b.key))
    const pendingBlocks = extraBlocks.filter((b) => !keys.has(b.key))
    return [...blocks, ...pendingBlocks]
  }, [blocks, extraBlocks])
  const totals = useMemo(() => summenPositionen(sorted), [sorted])
  const abgelehntZuweisungen = useMemo(
    () => handwerkerRows.filter((z) => (z.status ?? '').toLowerCase() === 'abgelehnt'),
    [handwerkerRows]
  )
  const margePct =
    totals.verkauf > 0 ? Math.round((totals.marge / totals.verkauf) * 1000) / 10 : null

  function refresh() {
    onChanged()
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleBlock(block: AuftragGewerkBlock) {
    const ids = block.positionen.map((p) => p.id)
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

  function addGewerk(g: GewerkOpt) {
    const block = createLeeresGewerkBlock(g)
    setExtraBlocks((prev) => [...prev, block])
    setNewBlock(block)
  }

  function removeEmptyBlock(block: AuftragGewerkBlock) {
    if (block.positionen.length > 0) return
    setExtraBlocks((prev) => prev.filter((b) => b.key !== block.key))
    if (newBlock?.key === block.key) setNewBlock(null)
  }

  function onLeistungSaved() {
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
          ? 'Diese Leistung wirklich entfernen?'
          : `${ids.length} Leistungen wirklich entfernen?`
      )
    ) {
      return
    }
    startTransition(async () => {
      const r = await bulkDeleteAuftragPositionenV3(auftragId, ids, { projektName: angebotTitel })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      const msg =
        r.markiert > 0
          ? r.markiert === 1
            ? 'Leistung als entfernt markiert — Partner wird informiert.'
            : `${r.markiert} Leistungen als entfernt markiert — Partner wird informiert.`
          : r.deleted === 1
            ? 'Leistung entfernt.'
            : `${r.deleted} Leistungen entfernt.`
      toast.success(msg)
      clearSelection()
      setDetailPos(null)
      refresh()
    })
  }

  function deleteOne(pos: AuftragPosition) {
    if (!window.confirm(`„${pos.leistung_name}" wirklich entfernen?`)) return
    startTransition(async () => {
      const r = await bulkDeleteAuftragPositionenV3(auftragId, [pos.id], { projektName: angebotTitel })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(
        r.markiert > 0
          ? 'Leistung als entfernt markiert — Partner wird informiert.'
          : 'Leistung entfernt.'
      )
      setDetailPos(null)
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(pos.id)
        return next
      })
      refresh()
    })
  }

  function rowMenu(pos: AuftragPosition): EntityMenuItem[] {
    const rowLocked = istPartnerEntfernungAusstehend(pos)
    if (disabled || rowLocked) return []
    const hasHw = Boolean(pos.handwerker_id)
    return [
      {
        icon: 'pencil',
        label: 'Bearbeiten',
        onClick: () => setEditPos(pos),
      },
      {
        icon: 'user',
        label: hasHw ? 'Handwerker ändern' : 'Handwerker anfragen',
        onClick: () => setZuweisungIds([pos.id]),
      },
      'sep',
      {
        icon: 'trash',
        label: 'Löschen',
        danger: true,
        onClick: () => deleteOne(pos),
      },
    ]
  }

  function gewerkMenu(block: AuftragGewerkBlock): EntityMenuItem[] {
    if (disabled) return []
    const ids = block.positionen.map((p) => p.id)
    const items: EntityMenuItem[] = [
      {
        icon: 'plus',
        label: 'Position hinzufügen',
        onClick: () => setNewBlock(block),
      },
    ]
    if (ids.length > 0) {
      items.push({
        icon: 'user',
        label: 'Handwerker fürs Gewerk',
        onClick: () => setZuweisungIds(ids),
      })
    }
    if (block.positionen.length === 0) {
      items.push('sep', {
        icon: 'trash',
        label: 'Gewerk entfernen',
        danger: true,
        onClick: () => removeEmptyBlock(block),
      })
    }
    return items
  }

  const selectedCount = selectedIds.size

  if (!sorted.length && extraBlocks.length === 0) {
    return (
      <div className="pos-v3">
        <EmptyState
          icon={ClipboardList}
          title="Noch keine Gewerke"
          description="Legen Sie zuerst ein Gewerk an und fügen Sie danach Leistungen hinzu."
          action={
            <AuftragGewerkAddRow
              gewerke={gewerke}
              disabled={disabled}
              className="pos-gewerk-add-row justify-center"
              onAdd={addGewerk}
            />
          }
        />
        <AuftragLeistungNewModal
          open={newBlock !== null}
          onClose={() => setNewBlock(null)}
          auftragId={auftragId}
          angebotId={angebotId}
          projektName={angebotTitel}
          block={newBlock}
          gewerke={gewerke}
          onSaved={onLeistungSaved}
        />
      </div>
    )
  }

  return (
    <div className="pos-v3">
      {abgelehntZuweisungen.length > 0 && handwerkerKontext ? (
        <div className="mb-4 space-y-2">
          {abgelehntZuweisungen.map((z) => (
            <PartnerAbgelehntBanner
              key={z.id}
              auftragId={auftragId}
              zuweisung={z}
              positionen={sorted}
              gewerke={gewerke}
              angebotHandwerker={angebotHandwerker}
              kontext={handwerkerKontext}
              projektName={angebotTitel}
              onChanged={refresh}
            />
          ))}
        </div>
      ) : null}
      <div className="postable2">
        {allBlocks.map((block) => {
          const blockIds = block.positionen.map((p) => p.id)
          const blockAllSelected =
            blockIds.length > 0 && blockIds.every((id) => selectedIds.has(id))
          const blockSomeSelected = blockIds.some((id) => selectedIds.has(id))
          const isEmpty = block.positionen.length === 0
          const gMenu = gewerkMenu(block)

          return (
            <div key={block.key}>
              <div className="pt2-sub">
                {blockIds.length > 0 ? (
                  <label className="pos-v3-check" style={{ display: 'inline-flex' }}>
                    <input
                      type="checkbox"
                      checked={blockAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = blockSomeSelected && !blockAllSelected
                      }}
                      disabled={disabled}
                      onChange={() => toggleBlock(block)}
                    />
                  </label>
                ) : null}
                <span className="g">{block.gewerkName || 'Ohne Gewerk'}</span>
                {!isEmpty ? (
                  <span className="gt">· {formatEurBetrag(blockVkSumme(block))}</span>
                ) : (
                  <span className="gt">· Noch keine Leistungen</span>
                )}
                <div style={{ flex: 1 }} />
                {gMenu.length > 0 ? <MockEntityRowMenu items={gMenu} title="Gewerk" /> : null}
              </div>

              {isEmpty ? (
                <div
                  style={{
                    padding: '12px 14px',
                    fontSize: 12.5,
                    color: 'var(--text-4)',
                    borderBottom: '0.5px solid var(--border)',
                  }}
                >
                  Keine Positionen
                </div>
              ) : null}

              {block.positionen.map((pos) => {
                const vk = Math.max(0, pos.preis_fix ?? 0)
                const hwName = pos.handwerker?.name?.trim()
                const entferntPending = istPartnerEntfernungAusstehend(pos)
                const rowLocked = entferntPending
                const mengeLabel =
                  pos.einheit?.trim()?.toLowerCase() === 'pauschal' || (pos.menge ?? 1) === 1
                    ? pos.einheit?.trim() || 'pauschal'
                    : `${pos.menge ?? 1} ${pos.einheit?.trim() || ''}`.trim()
                const desc = richTextToPlain(pos.beschreibung)
                const menu = rowMenu(pos)

                return (
                  <div
                    key={pos.id}
                    className={cn(
                      'pt2-row',
                      selectedIds.has(pos.id) && 'sel',
                      entferntPending && 'pos-v3-row--entfernt'
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailPos(pos)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDetailPos(pos)
                      }
                    }}
                  >
                    <div className="pt2-ctrl">
                      <label className="pos-v3-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(pos.id)}
                          disabled={disabled || rowLocked}
                          onChange={() => toggleOne(pos.id)}
                        />
                      </label>
                    </div>
                    <div className="pt2-main">
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span className="pt-name">{pos.leistung_name}</span>
                        <HandwerkerAntwortChip pos={pos} />
                        <PartnerVorgangChip pos={pos} />
                      </div>
                      {desc ? <div className="pt-desc">{desc}</div> : null}
                      {hwName ? (
                        <div className="pt-desc" style={{ marginTop: 2 }}>
                          {hwName}
                        </div>
                      ) : null}
                    </div>
                    <div className="pt2-menge">{mengeLabel}</div>
                    <div className="pt2-preis">{formatEurBetrag(vk)}</div>
                    <div className="pt2-act" onClick={(e) => e.stopPropagation()}>
                      {menu.length > 0 ? (
                        <MockEntityRowMenu items={menu} title="Leistung" />
                      ) : null}
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                className="pt-add"
                disabled={disabled}
                onClick={() => setNewBlock(block)}
                style={{ borderBottom: '0.5px solid var(--border)' }}
              >
                <Plus className="h-3.5 w-3.5" /> Position hinzufügen
              </button>
            </div>
          )
        })}

        <div style={{ padding: '8px 12px', borderBottom: '0.5px solid var(--border)' }}>
          <AuftragGewerkAddRow gewerke={gewerke} disabled={disabled} onAdd={addGewerk} />
        </div>

        <div className="pt2-foot">
          <div className="r">
            <span>VK gesamt</span>
            <b>{formatEurBetrag(totals.verkauf)}</b>
          </div>
          <div className="r">
            <span>EK gesamt</span>
            <b>{formatEurBetrag(totals.partner + totals.eigen)}</b>
          </div>
          <div className="r grand">
            <span>
              Marge
              {margePct != null ? ` (${margePct} %)` : ''}
            </span>
            <b>{formatEurBetrag(totals.marge)}</b>
          </div>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="pos-v3-bulk-bar">
          <span className="text-sm font-medium text-bw-text">
            {selectedCount} ausgewählt
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => setZuweisungIds(Array.from(selectedIds))}
          >
            <UserPlus className="h-4 w-4" />
            Handwerker anfragen
          </Button>
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

      <AuftragLeistungDetailModal
        open={!!detailPos}
        onClose={() => setDetailPos(null)}
        pos={detailPos}
        gewerkName={detailPos?.gewerk_name ?? ''}
        disabled={disabled}
        onRemove={() => detailPos && deleteOne(detailPos)}
        onEdit={() => {
          if (detailPos) {
            setEditPos(detailPos)
            setDetailPos(null)
          }
        }}
      />

      <AuftragLeistungEditModal
        open={!!editPos}
        onClose={() => setEditPos(null)}
        pos={editPos}
        auftragId={auftragId}
        angebotId={angebotId}
        projektName={angebotTitel}
        gewerke={gewerke}
        onSaved={refresh}
      />

      <AuftragLeistungNewModal
        open={newBlock !== null}
        onClose={() => setNewBlock(null)}
        auftragId={auftragId}
        angebotId={angebotId}
        projektName={angebotTitel}
        block={newBlock}
        gewerke={gewerke}
        onSaved={onLeistungSaved}
      />

      <AuftragLeistungZuweisungModal
        open={!!zuweisungIds?.length}
        onClose={() => setZuweisungIds(null)}
        auftragId={auftragId}
        angebotId={angebotId}
        projektName={angebotTitel}
        positionIds={zuweisungIds ?? []}
        positionen={sorted}
        gewerke={gewerke}
        onDone={() => {
          clearSelection()
          refresh()
        }}
      />
    </div>
  )
}
