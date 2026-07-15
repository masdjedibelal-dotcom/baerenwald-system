'use client'

/**
 * @deprecated Ersetzt durch responsive `AuftragLeistungenV3Tab`. Wird von Legacy-Tab genutzt.
 */
import { useEffect, useMemo, useState, useTransition } from 'react'
import { ChevronDown, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { resolveMockIcon } from '@/lib/mock-icons'
import {
  AuftragPositionenLeistungEditPanel,
  AuftragPositionenLeistungSummaryRow } from '@/components/auftraege/AuftragPositionenLeistungEdit'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { MobileStackSheet } from '@/components/ui/MobileStackSheet'
import { toast } from '@/components/ui/app-toast'
import { updateAuftragGewerkBlockMeta } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import {
  blockSummeVk,
  type AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import { gewerkZeitraum } from '@/lib/auftraege/auftrag-leistung-phasen'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { angebotHandwerkerFuerPosition } from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import type { AngebotHandwerkerRow, AuftragPosition } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'
import type { updateAuftragPositionSteuerung } from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'

type SheetView = 'closed' | 'gewerk' | 'leistung'


const ToolIcon = resolveMockIcon('tool')

function formatZeitraum(von: string | null, bis: string | null): string {
  if (von && bis) return `${formatDatum(von)} → ${formatDatum(bis)}`
  if (von) return `ab ${formatDatum(von)}`
  if (bis) return `bis ${formatDatum(bis)}`
  return 'Termin offen'
}
function PosMobileTotals({
  totals }: {
  totals: { verkauf: number; partner: number; eigen: number; marge: number }
}) {
  return (
    <div className="pos-mobile-totals">
      <div className="pos-mobile-totals__row">
        <span>Verkauf</span>
        <span>{formatEurBetrag(totals.verkauf)}</span>
      </div>
      <div className="pos-mobile-totals__row">
        <span>EK Partner (Fremd)</span>
        <span>{formatEurBetrag(totals.partner)}</span>
      </div>
      <div className="pos-mobile-totals__row">
        <span>EK Eigen (intern)</span>
        <span>{formatEurBetrag(totals.eigen)}</span>
      </div>
      <div className="pos-mobile-totals__row pos-mobile-totals__row--grand">
        <span>Marge</span>
        <span>{formatEurBetrag(totals.marge)}</span>
      </div>
    </div>
  )
}
export function AuftragPositionenMobile({
  auftragId,
  gewerkeBlocks,
  totals,
  pending,
  handwerkerKontext,
  auftragAbgeschlossen,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotHandwerker = [],
  angebotPositionen = [],
  gewerke = [],
  onAddGewerk,
  onAddLeistung,
  onDeleteBlock,
  onDeletePosition,
  onSavePosition,
  onMovePosition,
  onChanged,
  onOpenHwMail,
  onOpenGewerkHandwerker,
  onOpenSelectionHandwerker,
  selectedPosIds,
  onTogglePosSelection,
  onSelectAllInBlock,
  onSelectOhneHandwerkerInBlock,
  selectedInBlock,
  onBewerteHandwerker,
  eigenregie = false }: {
  auftragId: string
  gewerkeBlocks: AuftragGewerkBlock[]
  totals: { verkauf: number; partner: number; eigen: number; marge: number }
  pending: boolean
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragAbgeschlossen: boolean
  angebotId?: string | null
  angebotTitel?: string
  angebotHandwerker?: AngebotHandwerkerRow[]
  angebotPositionen?: import('@/lib/types').AngebotPosition[]
  gewerke?: { id: string; name: string; slug: string }[]
  eigenregie?: boolean
  onAddGewerk: () => void
  onAddLeistung: (block: AuftragGewerkBlock) => void
  onDeleteBlock: (block: AuftragGewerkBlock) => void
  onDeletePosition: (id: string) => void
  onSavePosition: (pos: AuftragPosition, patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMovePosition: (id: string, dir: -1 | 1) => void
  onChanged: () => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onOpenGewerkHandwerker: (block: AuftragGewerkBlock) => void
  onOpenSelectionHandwerker: (block: AuftragGewerkBlock) => void
  selectedPosIds: Set<string>
  onTogglePosSelection: (id: string) => void
  onSelectAllInBlock: (block: AuftragGewerkBlock) => void
  onSelectOhneHandwerkerInBlock: (block: AuftragGewerkBlock) => void
  selectedInBlock: (block: AuftragGewerkBlock) => string[]
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
}) {
  const [openBlocks, setOpenBlocks] = useState<Set<string>>(() => new Set())
  const [sheetView, setSheetView] = useState<SheetView>('closed')
  const [activeBlockKey, setActiveBlockKey] = useState<string | null>(null)
  const [activeLeistungId, setActiveLeistungId] = useState<string | null>(null)
  const [pendingLocal, startTransition] = useTransition()
  const [draftName, setDraftName] = useState('')
  const [draftVon, setDraftVon] = useState('')
  const [draftBis, setDraftBis] = useState('')

  const activeBlock = useMemo(
    () => gewerkeBlocks.find((b) => b.key === activeBlockKey) ?? null,
    [gewerkeBlocks, activeBlockKey]
  )

  const activeLeistung = useMemo(() => {
    if (!activeBlock || !activeLeistungId) return null
    return activeBlock.positionen.find((p) => p.id === activeLeistungId) ?? null
  }, [activeBlock, activeLeistungId])

  const activeLeistungPartnerRow = useMemo(() => {
    if (!activeLeistung) return null
    return angebotHandwerkerFuerPosition(activeLeistung, angebotHandwerker, gewerke)
  }, [activeLeistung, angebotHandwerker, gewerke])

  useEffect(() => {
    setOpenBlocks((prev) => {
      const next = new Set(prev)
      for (const b of gewerkeBlocks) next.add(b.key)
      return next
    })
  }, [gewerkeBlocks.length])

  useEffect(() => {
    if (!activeBlock || sheetView !== 'gewerk') return
    const zt = gewerkZeitraum(activeBlock)
    setDraftName(activeBlock.gewerkName)
    setDraftVon(zt.von ?? '')
    setDraftBis(zt.bis ?? '')
  }, [activeBlock, sheetView])

  function toggleBlock(key: string) {
    setOpenBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openGewerkSheet(block: AuftragGewerkBlock) {
    setActiveBlockKey(block.key)
    setActiveLeistungId(null)
    setSheetView('gewerk')
  }

  function openLeistungSheet(posId: string) {
    setActiveLeistungId(posId)
    setSheetView('leistung')
  }

  function closeSheet() {
    setSheetView('closed')
    setActiveBlockKey(null)
    setActiveLeistungId(null)
  }

  function backToGewerkSheet() {
    setActiveLeistungId(null)
    setSheetView('gewerk')
  }

  function commitGewerkName(block: AuftragGewerkBlock) {
    const next = draftName.trim()
    if (!next) {
      toast.error('Gewerk darf nicht leer sein.')
      setDraftName(block.gewerkName)
      return
    }
    if (next !== block.gewerkName) patchBlock(block, { gewerk_name: next })
  }

  function commitGewerkDates(block: AuftragGewerkBlock) {
    const zt = gewerkZeitraum(block)
    if ((draftVon || null) !== (zt.von || null)) {
      patchBlock(block, { start_datum: draftVon || null })
    }
    if ((draftBis || null) !== (zt.bis || null)) {
      patchBlock(block, { end_datum: draftBis || null })
    }
  }
  function patchBlock(
    block: AuftragGewerkBlock,
    meta: Omit<Parameters<typeof updateAuftragGewerkBlockMeta>[0], 'auftragId' | 'positionIds'>
  ) {
    startTransition(async () => {
      const r = await updateAuftragGewerkBlockMeta({
        auftragId,
        positionIds: block.positionen.map((p) => p.id),
        ...meta })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  const sheetOpen = sheetView !== 'closed'
  const sheetTitle =
    sheetView === 'leistung'
      ? activeLeistung?.leistung_name ?? 'Leistung'
      : activeBlock?.gewerkName ?? 'Gewerk'
  const activeSelectionCount = activeBlock ? selectedInBlock(activeBlock).length : 0

  return (
    <div className="pos-mobile">
      <div className="pos-mobile-blocks">
        {gewerkeBlocks.map((block) => {
          const open = openBlocks.has(block.key)
          const zt = gewerkZeitraum(block)
          const netto = blockSummeVk(block)
          const posCount = block.positionen.length

          return (
            <div key={block.key} className={cn('pos-mobile-gewerk', open && 'open')}>
              <div className="pos-mobile-gewerk__head">
                <button
                  type="button"
                  className="pos-mobile-gewerk__toggle"
                  onClick={() => toggleBlock(block.key)}
                  aria-expanded={open}
                >
                  <ChevronDown
                    className={cn('pos-mobile-gewerk__chevron h-4 w-4', open && 'rotate-180')}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <p className="pos-mobile-gewerk__title">{block.gewerkName}</p>
                    <p className="pos-mobile-gewerk__meta">
                      {formatZeitraum(zt.von, zt.bis)}
                      {' · '}
                      {posCount} Leistung{posCount === 1 ? '' : 'en'}
                      {' · '}
                      {formatEurBetrag(netto)}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  className="pos-mobile-gewerk__edit"
                  aria-label={`${block.gewerkName} bearbeiten`}
                  onClick={() => openGewerkSheet(block)}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {open ? (
                <div className="pos-mobile-gewerk__body">
                  {block.positionen.map((pos) => {
                    const partnerRow = angebotHandwerkerFuerPosition(pos, angebotHandwerker, gewerke)
                    return (
                      <AuftragPositionenLeistungSummaryRow
                        key={pos.id}
                        pos={pos}
                        partnerRow={partnerRow}
                        showHwBadge={!eigenregie}
                      />
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="pos-mobile-actions">
        <Button type="button" variant="secondary" size="sm" className="w-full" onClick={onAddGewerk}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Gewerk-Gruppe hinzufügen
        </Button>
      </div>

      <PosMobileTotals totals={totals} />

      <MobileStackSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={sheetTitle}
        canGoBack={sheetView === 'leistung'}
        onBack={backToGewerkSheet}
        footer={
          sheetView === 'leistung' ? (
            <Button type="button" variant="primary" className="w-full" onClick={backToGewerkSheet}>
              Fertig
            </Button>
          ) : activeBlock ? (
            <div className="flex flex-col gap-2">
              <Button type="button" variant="primary" className="w-full" onClick={closeSheet}>
                Fertig
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-status-cancel-text"
                disabled={pending || pendingLocal}
                onClick={() => {
                  onDeleteBlock(activeBlock)
                  closeSheet()
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                Gewerk löschen
              </Button>
            </div>
          ) : null
        }
      >
        {sheetView === 'gewerk' && activeBlock ? (
          <div className="space-y-4">
            <Input
              label="Gewerk"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => commitGewerkName(activeBlock)}
              disabled={pending || pendingLocal}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Von"
                type="date"
                value={draftVon}
                onChange={(e) => setDraftVon(e.target.value)}
                onBlur={() => commitGewerkDates(activeBlock)}
                disabled={pending || pendingLocal}
              />
              <Input
                label="Bis"
                type="date"
                value={draftBis}
                onChange={(e) => setDraftBis(e.target.value)}
                onBlur={() => commitGewerkDates(activeBlock)}
                disabled={pending || pendingLocal}
              />
            </div>

            <div>
              {!eigenregie ? (
              <>
              <div className="mb-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 flex-1 text-xs"
                  disabled={!activeBlock.gewerkId || pending || pendingLocal}
                  onClick={() => onOpenGewerkHandwerker(activeBlock)}
                >
                  <ToolIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Fürs Gewerk
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pending || pendingLocal}
                  onClick={() => onSelectAllInBlock(activeBlock)}
                >
                  Alle
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={pending || pendingLocal}
                  onClick={() => onSelectOhneHandwerkerInBlock(activeBlock)}
                >
                  Ohne HW
                </Button>
              </div>
              {activeSelectionCount > 0 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mb-3 h-8 w-full gap-1 text-xs"
                  disabled={!activeBlock.gewerkId || pending || pendingLocal}
                  onClick={() => onOpenSelectionHandwerker(activeBlock)}
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  {activeSelectionCount} Leistung{activeSelectionCount === 1 ? '' : 'en'} zuweisen
                </Button>
              ) : null}
              </>
              ) : null}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-bw-text-muted">
                Leistungen
              </p>
              <div className="pos-mobile-sheet-leistungen divide-y divide-bw-border rounded-md border border-bw-border">
                {activeBlock.positionen.map((pos) => {
                  const partnerRow = angebotHandwerkerFuerPosition(pos, angebotHandwerker, gewerke)
                  return (
                  <div key={pos.id} className="flex items-center gap-2 px-2 py-1">
                    {!eigenregie ? (
                    <input
                      type="checkbox"
                      className="h-4 w-4 shrink-0 rounded border-bw-border"
                      checked={selectedPosIds.has(pos.id)}
                      onChange={() => onTogglePosSelection(pos.id)}
                      aria-label={`${pos.leistung_name} auswählen`}
                    />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <AuftragPositionenLeistungSummaryRow
                        pos={pos}
                        partnerRow={partnerRow}
                        showHwBadge={!eigenregie}
                        showChevron
                        onPress={() => openLeistungSheet(pos.id)}
                      />
                    </div>
                  </div>
                  )
                })}
              </div>
              <button
                type="button"
                className="pos-add-btn mt-2 w-full"
                disabled={pending || pendingLocal}
                onClick={() => onAddLeistung(activeBlock)}
              >
                <span className="icon-wrap">+</span>
                <span className="lbl-block">Leistung hinzufügen</span>
              </button>
            </div>
          </div>
        ) : null}

        {sheetView === 'leistung' && activeBlock && activeLeistung ? (
          <AuftragPositionenLeistungEditPanel
            pos={activeLeistung}
            block={activeBlock}
            gewerkId={activeBlock.gewerkId}
            pending={pending || pendingLocal}
            handwerkerKontext={handwerkerKontext}
            auftragId={auftragId}
            auftragAbgeschlossen={auftragAbgeschlossen}
            onSave={(patch) => onSavePosition(activeLeistung, patch)}
            onMove={onMovePosition}
            onDelete={() => {
              onDeletePosition(activeLeistung.id)
              backToGewerkSheet()
            }}
            onOpenHwMail={onOpenHwMail}
            onBewerteHandwerker={onBewerteHandwerker}
            eigenregie={eigenregie}
            partnerRow={activeLeistungPartnerRow}
            angebotId={angebotId}
            angebotTitel={angebotTitel}
            angebotPositionen={angebotPositionen}
            onChanged={onChanged}
            showReorder={false}
          />
        ) : null}
      </MobileStackSheet>
    </div>
  )
}
