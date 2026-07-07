'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Plus, Send, Trash2, UserPlus, X, ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import { updateAuftragPositionLeistungStatus } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import {
  bulkDeleteAuftragPositionenV3,
  countUnsentZugewieseneLeistungenV3,
  sendAuftragLeistungenAnHandwerkerV3,
} from '@/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import { summenPositionen } from '@/lib/auftraege/auftrag-leistung-phasen'
import type { AuftragLeistungStatus } from '@/lib/auftraege/auftrag-fortschritt-preis'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { PartnerAbgelehntBanner } from '@/components/auftraege/PartnerAbgelehntBanner'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { AngebotHandwerkerRow, AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuftragLeistungDetailModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungDetailModal'
import { AuftragLeistungEditModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungEditModal'
import { AuftragGewerkAddRow } from '@/components/auftraege/leistungen-v3/AuftragGewerkAddRow'
import { AuftragLeistungNewModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungNewModal'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { LeistungStatusPill } from '@/components/auftraege/leistungen-v3/LeistungStatusPill'
import { PartnerVorgangChip } from '@/components/auftraege/leistungen-v3/PartnerVorgangChip'
import { HandwerkerAntwortChip } from '@/components/auftraege/leistungen-v3/HandwerkerAntwortChip'
import { istPartnerEntfernungAusstehend } from '@/lib/auftraege/partner-vorgang-display'
import {
  blockVkSumme,
  createLeeresGewerkBlock,
  formatZeitraumKurz,
  groupPositionenByGewerkSlug,
  rowMarge,
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
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false)
  const [extraBlocks, setExtraBlocks] = useState<AuftragGewerkBlock[]>([])
  const [unsentCount, setUnsentCount] = useState(0)

  const disabled = auftragAbgeschlossen || pending
  const sorted = useMemo(
    () => [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )
  const blocks = useMemo(() => groupPositionenByGewerkSlug(sorted, gewerke), [sorted, gewerke])
  const allBlocks = useMemo(() => {
    const keys = new Set(blocks.map((b) => b.key))
    const pending = extraBlocks.filter((b) => !keys.has(b.key))
    return [...blocks, ...pending]
  }, [blocks, extraBlocks])
  const totals = useMemo(() => summenPositionen(sorted), [sorted])
  const abgelehntZuweisungen = useMemo(
    () => handwerkerRows.filter((z) => (z.status ?? '').toLowerCase() === 'abgelehnt'),
    [handwerkerRows]
  )
  const margePct =
    totals.verkauf > 0 ? Math.round((totals.marge / totals.verkauf) * 1000) / 10 : null

  useEffect(() => {
    void countUnsentZugewieseneLeistungenV3(auftragId).then((r) => {
      if (r.ok) setUnsentCount(r.count)
    })
  }, [auftragId, positionen])

  function refresh() {
    onChanged()
    void countUnsentZugewieseneLeistungenV3(auftragId).then((r) => {
      if (r.ok) setUnsentCount(r.count)
    })
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

  function updateStatus(pos: AuftragPosition, status: AuftragLeistungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionLeistungStatus({
        auftragId,
        positionId: pos.id,
        status,
      })
      if (!r.ok) toast.error(r.message)
      else refresh()
    })
  }

  function sendAnHandwerker() {
    startTransition(async () => {
      const r = await sendAuftragLeistungenAnHandwerkerV3({
        auftragId,
        angebotId,
        projektName: angebotTitel,
        gewerke,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(
        `${r.gesendet} Leistung${r.gesendet === 1 ? '' : 'en'} an ${r.handwerker} Handwerker gesendet.`
      )
      setSendConfirmOpen(false)
      refresh()
    })
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
      <div className="pos-v3-totals">
        <div>
          <span className="pos-v3-totals-label">VK gesamt</span>
          <span className="pos-v3-totals-value">{formatEurBetrag(totals.verkauf)}</span>
        </div>
        <div>
          <span className="pos-v3-totals-label">EK gesamt</span>
          <span className="pos-v3-totals-value">
            {formatEurBetrag(totals.partner + totals.eigen)}
          </span>
        </div>
        <div>
          <span className="pos-v3-totals-label">Marge gesamt</span>
          <span className="pos-v3-totals-value">
            {formatEurBetrag(totals.marge)}
            {margePct != null ? ` (${margePct} %)` : ''}
          </span>
        </div>
      </div>

      {allBlocks.map((block) => {
        const blockIds = block.positionen.map((p) => p.id)
        const blockAllSelected =
          blockIds.length > 0 && blockIds.every((id) => selectedIds.has(id))
        const blockSomeSelected = blockIds.some((id) => selectedIds.has(id))
        const isEmpty = block.positionen.length === 0

        return (
          <section key={block.key} className="pos-v3-gewerk">
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
                    onChange={() => toggleBlock(block)}
                  />
                </label>
              ) : (
                <span className="pos-v3-check w-4 shrink-0" aria-hidden />
              )}
              <span className="pos-v3-gewerk-name">Gewerk: {block.gewerkName}</span>
              <span className="pos-v3-gewerk-vk">
                {isEmpty ? 'Noch keine Leistungen' : `VK gesamt: ${formatEurBetrag(blockVkSumme(block))}`}
              </span>
              {isEmpty ? (
                <button
                  type="button"
                  className="pos-v3-row-delete"
                  disabled={disabled}
                  aria-label="Leeren Gewerk-Abschnitt entfernen"
                  onClick={() => removeEmptyBlock(block)}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </header>

            <ul className="pos-v3-rows">
              {block.positionen.map((pos) => {
                const { ek, pct } = rowMarge(pos)
                const vk = Math.max(0, pos.preis_fix ?? 0)
                const zeitraum = formatZeitraumKurz(pos)
                const hwName = pos.handwerker?.name
                const entferntPending = istPartnerEntfernungAusstehend(pos)
                const rowLocked = entferntPending

                return (
                  <li key={pos.id}>
                    <div
                      className={cn(
                        'pos-v3-row',
                        selectedIds.has(pos.id) && 'pos-v3-row--selected',
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
                      <label className="pos-v3-check" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(pos.id)}
                          disabled={disabled || rowLocked}
                          onChange={() => toggleOne(pos.id)}
                        />
                      </label>

                      <div className="pos-v3-row-main">
                        <span className="pos-v3-row-name">{pos.leistung_name}</span>
                        <PartnerVorgangChip pos={pos} />
                        <HandwerkerAntwortChip pos={pos} />
                        {hwName ? (
                          <span className="pos-v3-hw-chip">{hwName}</span>
                        ) : !rowLocked ? (
                          <button
                            type="button"
                            className="pos-v3-hw-chip pos-v3-hw-chip--action"
                            disabled={disabled}
                            onClick={(e) => {
                              e.stopPropagation()
                              setZuweisungIds([pos.id])
                            }}
                          >
                            <UserPlus className="h-3 w-3" />
                            Zuweisen
                          </button>
                        ) : null}
                        {zeitraum ? <span className="pos-v3-row-zeitraum">{zeitraum}</span> : null}
                      </div>

                      <div className="pos-v3-row-pricing">
                        <span className="pos-v3-row-vk">{formatEurBetrag(vk)}</span>
                        <span className="pos-v3-row-ek">
                          EK {formatEurBetrag(ek)}
                          {pct != null ? ` · ${pct} %` : ''}
                        </span>
                      </div>

                      <div onClick={(e) => e.stopPropagation()}>
                        <LeistungStatusPill
                          status={pos.leistung_status}
                          disabled={disabled || rowLocked}
                          onChange={(s) => updateStatus(pos, s)}
                        />
                      </div>

                      <button
                        type="button"
                        className="pos-v3-row-delete"
                        disabled={disabled || rowLocked}
                        aria-label={rowLocked ? 'Entfernung wartet auf Partner' : 'Leistung entfernen'}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteOne(pos)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <button
              type="button"
              className="pos-v3-add-btn"
              disabled={disabled}
              onClick={() => setNewBlock(block)}
            >
              <Plus className="h-4 w-4" />
              Leistung hinzufügen
            </button>
          </section>
        )
      })}

      <AuftragGewerkAddRow gewerke={gewerke} disabled={disabled} onAdd={addGewerk} />

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
            Handwerker zuweisen
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

      <div className="pos-v3-send-bar">
        <p className="text-sm text-bw-text-muted">
          {unsentCount > 0
            ? `${unsentCount} Leistung${unsentCount === 1 ? '' : 'en'} zugewiesen, noch nicht gesendet`
            : 'Keine offenen Zuweisungen zum Senden'}
        </p>
        <Button
          type="button"
          variant="primary"
          disabled={disabled || unsentCount === 0}
          onClick={() => setSendConfirmOpen(true)}
        >
          <Send className="h-4 w-4" />
          An Handwerker senden
        </Button>
      </div>

      <AuftragLeistungDetailModal
        open={!!detailPos}
        onClose={() => setDetailPos(null)}
        pos={detailPos}
        gewerkName={detailPos?.gewerk_name ?? ''}
        disabled={disabled}
        onRemove={() => detailPos && deleteOne(detailPos)}
        onZuweisen={() => {
          if (detailPos) {
            setZuweisungIds([detailPos.id])
            setDetailPos(null)
          }
        }}
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
        positionIds={zuweisungIds ?? []}
        positionen={sorted}
        onDone={() => {
          clearSelection()
          refresh()
        }}
      />

      <Modal
        open={sendConfirmOpen}
        onClose={() => setSendConfirmOpen(false)}
        title="An Handwerker senden"
        size="md"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setSendConfirmOpen(false)} disabled={pending}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" onClick={sendAnHandwerker} disabled={pending}>
              Senden
            </Button>
          </>
        }
      >
        <p className="text-sm text-bw-text">
          Alle zugewiesenen Leistungen werden jetzt an die Handwerker gesendet. Sie erhalten eine
          E-Mail und können den Auftrag bestätigen.
        </p>
      </Modal>
    </div>
  )
}
