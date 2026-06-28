'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  HardHat,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { AuftragPositionenMobile } from '@/components/auftraege/AuftragPositionenMobile'
import { AuftragPositionDetailPanel } from '@/components/auftraege/AuftragPositionDetailPanel'
import { AuftragPositionRowSummary } from '@/components/auftraege/AuftragPositionRowSummary'
import {
  HandwerkerZuweisenModal,
  type HandwerkerZuweisenKontext,
  type HandwerkerZuweisenScope,
} from '@/components/auftraege/HandwerkerZuweisenModal'
import {
  HandwerkerZuweisungMailModal,
  type HandwerkerZuweisungMailTarget,
} from '@/components/auftraege/HandwerkerZuweisungMailModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/app-toast'
import {
  addAuftragPosition,
  deleteAuftragPosition,
} from '@/app/(dashboard)/auftraege/actions'
import {
  reorderAuftragPositionen,
  updateAuftragGewerkBlockMeta,
  updateAuftragPositionSteuerung,
} from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import {
  groupAuftragPositionenByGewerkForAnzeige,
  type AuftragGewerkBlock,
} from '@/lib/auftraege/auftrag-position-blocks'
import { gewerkZeitraum, summenPositionen } from '@/lib/auftraege/auftrag-leistung-phasen'
import {
  handwerkerScopeGewerkBlock,
  handwerkerScopePositionen,
  positionIdsOhneHandwerker,
} from '@/lib/auftraege/handwerker-zuweisen-scope'
import {
  angebotHandwerkerFuerPosition,
} from '@/lib/auftraege/auftrag-angebot-handwerker-match'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition, AuftragStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

type GewerkOpt = { id: string; name: string; slug: string }

/** Gewerk-Name wie im Angebots-Wizard: Anzeige + Stift, kein Stammdaten-Dropdown. */
function GewerkEditableName({
  title,
  disabled,
  onRename,
}: {
  title: string
  disabled?: boolean
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  function commit() {
    const next = draft.trim()
    if (!next) {
      toast.error('Gewerk darf nicht leer sein.')
      setDraft(title)
      setEditing(false)
      return
    }
    if (next !== title) onRename(next)
    setEditing(false)
  }

  return (
    <div className="gewerk-name-field">
      <span className="input-label">Gewerk</span>
      {editing ? (
        <input
          className="input w-full"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setDraft(title)
              setEditing(false)
            }
          }}
          autoFocus
          aria-label="Gewerk bearbeiten"
        />
      ) : (
        <div className="gewerk-name-display">
          <span className="gewerk-name-text">{title}</span>
          <button
            type="button"
            className="gewerk-name-edit-btn"
            title="Gewerk bearbeiten"
            aria-label="Gewerk bearbeiten"
            disabled={disabled}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

export function AuftragPositionenSteuerungTabLegacy({
  auftragId,
  positionen,
  gewerke,
  handwerkerKontext,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotHandwerker = [],
  angebotPositionen = [],
  auftragStatus = 'offen',
  auftragAbgeschlossen = false,
  onBewerteHandwerker,
  onChanged,
  eigenregie = false,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  handwerkerKontext: HandwerkerZuweisenKontext
  angebotId?: string | null
  angebotTitel?: string
  angebotHandwerker?: AngebotHandwerkerRow[]
  angebotPositionen?: AngebotPosition[]
  auftragStatus?: AuftragStatus
  auftragAbgeschlossen?: boolean
  eigenregie?: boolean
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [openLeistungen, setOpenLeistungen] = useState<Set<string>>(() => new Set())
  const [selectedPosIds, setSelectedPosIds] = useState<Set<string>>(() => new Set())
  const [modalScope, setModalScope] = useState<HandwerkerZuweisenScope | null>(null)
  const [hwMailModal, setHwMailModal] = useState<HandwerkerZuweisungMailTarget | null>(null)
  const sorted = useMemo(
    () => [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )

  const gewerkeBlocks = useMemo(
    () => groupAuftragPositionenByGewerkForAnzeige(sorted, gewerke),
    [sorted, gewerke]
  )

  const totals = useMemo(() => summenPositionen(sorted), [sorted])

  const allIds = useMemo(() => sorted.map((p) => p.id), [sorted])

  function toggleLeistung(id: string) {
    setOpenLeistungen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function togglePosSelection(id: string) {
    setSelectedPosIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection(ids?: string[]) {
    if (!ids?.length) {
      setSelectedPosIds(new Set())
      return
    }
    setSelectedPosIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.delete(id)
      return next
    })
  }

  function openGewerkHandwerker(block: AuftragGewerkBlock) {
    const scope = handwerkerScopeGewerkBlock(block)
    if (!scope) {
      toast.error('Gewerk nicht in Stammdaten — bitte Position mit gültigem Gewerk anlegen.')
      return
    }
    setModalScope(scope)
  }

  function openSelectionHandwerker(block: AuftragGewerkBlock) {
    const ids = block.positionen.map((p) => p.id).filter((id) => selectedPosIds.has(id))
    if (!ids.length) {
      toast.error('Bitte mindestens eine Leistung auswählen.')
      return
    }
    const scope = handwerkerScopePositionen(block, ids)
    if (!scope) {
      toast.error('Gewerk nicht in Stammdaten.')
      return
    }
    setModalScope(scope)
  }

  function selectAllInBlock(block: AuftragGewerkBlock) {
    setSelectedPosIds((prev) => {
      const next = new Set(prev)
      for (const p of block.positionen) next.add(p.id)
      return next
    })
  }

  function selectOhneHandwerkerInBlock(block: AuftragGewerkBlock) {
    const ids = positionIdsOhneHandwerker(block)
    if (!ids.length) {
      toast.message('Alle Leistungen haben bereits einen Handwerker.')
      return
    }
    setSelectedPosIds((prev) => {
      const next = new Set(prev)
      for (const id of ids) next.add(id)
      return next
    })
  }

  function selectedInBlock(block: AuftragGewerkBlock): string[] {
    return block.positionen.map((p) => p.id).filter((id) => selectedPosIds.has(id))
  }

  function openOhneHandwerkerInBlock(block: AuftragGewerkBlock) {
    const ids = positionIdsOhneHandwerker(block)
    if (!ids.length) {
      toast.message('Alle Leistungen haben bereits einen Handwerker.')
      return
    }
    const scope = handwerkerScopePositionen(block, ids)
    if (!scope) {
      toast.error('Gewerk nicht in Stammdaten.')
      return
    }
    setModalScope(scope)
  }

  function savePosition(pos: AuftragPosition, patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) {
    startTransition(async () => {
      const r = await updateAuftragPositionSteuerung(pos.id, auftragId, patch)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function movePosition(id: string, dir: -1 | 1) {
    const idx = allIds.indexOf(id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= allIds.length) return
    const next = [...allIds]
    const tmp = next[idx]!
    next[idx] = next[target]!
    next[target] = tmp
    startTransition(async () => {
      const r = await reorderAuftragPositionen(auftragId, next)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function addGewerk(gewerk?: GewerkOpt) {
    const g = gewerk ?? gewerke[0]
    if (!g) {
      toast.error('Keine Gewerke in Stammdaten.')
      return
    }
    startTransition(async () => {
      const r = await addAuftragPosition(auftragId, {
        gewerk_slug: g.slug,
        gewerk_name: g.name,
        leistung_name: 'Neue Leistung',
        gewerk_block_key: `${g.slug}-${Date.now()}`,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setOpenLeistungen((prev) => new Set(prev).add(r.id))
      onChanged()
    })
  }

  function addLeistungToBlock(block: AuftragGewerkBlock) {
    const sample = block.positionen[0]
    startTransition(async () => {
      const r = await addAuftragPosition(auftragId, {
        gewerk_slug: block.gewerkSlug,
        gewerk_name: block.gewerkName,
        leistung_name: 'Neue Leistung',
        gewerk_block_key: sample?.gewerk_block_key ?? block.key,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setOpenLeistungen((prev) => new Set(prev).add(r.id))
      onChanged()
    })
  }

  function deleteBlock(block: AuftragGewerkBlock) {
    if (!confirm(`Gewerk „${block.gewerkName}“ mit ${block.positionen.length} Leistung(en) löschen?`)) return
    startTransition(async () => {
      for (const p of block.positionen) {
        const r = await deleteAuftragPosition(p.id, auftragId)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      onChanged()
    })
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={HardHat}
        title="Keine Leistungen"
        description="Leistungen aus dem Angebot werden automatisch übernommen. Füge eine Gewerk-Gruppe hinzu."
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => addGewerk()}>
            + Gewerk hinzufügen
          </Button>
        }
      />
    )
  }

  return (
    <div className="auftrag-pos-compact">
      <div className="md:hidden">
        <AuftragPositionenMobile
          auftragId={auftragId}
          gewerkeBlocks={gewerkeBlocks}
          totals={totals}
          pending={pending}
          handwerkerKontext={handwerkerKontext}
          auftragAbgeschlossen={auftragAbgeschlossen}
          onAddGewerk={() => addGewerk()}
          onAddLeistung={addLeistungToBlock}
          onDeleteBlock={deleteBlock}
          onDeletePosition={(id) => {
            startTransition(async () => {
              const r = await deleteAuftragPosition(id, auftragId)
              if (!r.ok) toast.error(r.message)
              else onChanged()
            })
          }}
          onSavePosition={savePosition}
          onMovePosition={movePosition}
          onChanged={onChanged}
          onOpenHwMail={(mail) => setHwMailModal(mail)}
          onOpenGewerkHandwerker={openGewerkHandwerker}
          onOpenSelectionHandwerker={openSelectionHandwerker}
          selectedPosIds={selectedPosIds}
          onTogglePosSelection={togglePosSelection}
          onSelectAllInBlock={selectAllInBlock}
          onSelectOhneHandwerkerInBlock={selectOhneHandwerkerInBlock}
          selectedInBlock={selectedInBlock}
          onBewerteHandwerker={onBewerteHandwerker}
          angebotId={angebotId}
          angebotTitel={angebotTitel}
          angebotHandwerker={angebotHandwerker}
          angebotPositionen={angebotPositionen}
          gewerke={gewerke}
          eigenregie={eigenregie}
        />
      </div>

      <div className="hidden md:block">
        <div className="pos-panel-head">
          <div className="pos-totals min-w-[220px] shrink-0 md:ml-auto">
            <div className="row">
              <div className="lbl">Verkauf</div>
              <div className="val">{formatEurBetrag(totals.verkauf)}</div>
            </div>
            <div className="row">
              <div className="lbl">EK Partner (Fremd)</div>
              <div className="val">{formatEurBetrag(totals.partner)}</div>
            </div>
            <div className="row">
              <div className="lbl">EK Eigen (intern)</div>
              <div className="val">{formatEurBetrag(totals.eigen)}</div>
            </div>
            <div className="row grand">
              <div className="lbl">Marge</div>
              <div className="val">{formatEurBetrag(totals.marge)}</div>
            </div>
          </div>
        </div>

        <div className="mb-3 flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={() => addGewerk()}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Gewerk-Gruppe hinzufügen
          </Button>
        </div>

        <div className="space-y-3">
          {gewerkeBlocks.map((block, blockIndex) => (
            <GewerkBlock
              key={block.key}
              index={blockIndex + 1}
              block={block}
              handwerkerKontext={handwerkerKontext}
              openLeistungen={openLeistungen}
              pending={pending}
              onToggleLeistung={toggleLeistung}
              onOpenHwMail={(mail) => setHwMailModal(mail)}
              onSavePosition={savePosition}
              onMovePosition={movePosition}
              onDeletePosition={(id) => {
                startTransition(async () => {
                  const r = await deleteAuftragPosition(id, auftragId)
                  if (!r.ok) toast.error(r.message)
                  else onChanged()
                })
              }}
              onDeleteBlock={() => deleteBlock(block)}
              onAddLeistung={() => addLeistungToBlock(block)}
              onChanged={onChanged}
              auftragId={auftragId}
              onOpenGewerkHandwerker={() => openGewerkHandwerker(block)}
              onOpenOhneHandwerker={() => openOhneHandwerkerInBlock(block)}
              auftragAbgeschlossen={auftragAbgeschlossen}
              angebotId={angebotId}
              angebotTitel={angebotTitel}
              angebotHandwerker={angebotHandwerker}
              angebotPositionen={angebotPositionen}
              gewerke={gewerke}
              onBewerteHandwerker={onBewerteHandwerker}
              eigenregie={eigenregie}
            />
          ))}
        </div>
      </div>

      {!eigenregie ? (
      <>
      <HandwerkerZuweisenModal
        open={!!modalScope}
        onClose={() => setModalScope(null)}
        auftragId={auftragId}
        kontext={handwerkerKontext}
        scope={modalScope}
        onDone={() => {
          const ids =
            modalScope?.type === 'gewerk'
              ? modalScope.positionIds
              : modalScope?.type === 'position'
                ? [modalScope.position.id]
                : undefined
          clearSelection(ids)
          onChanged()
        }}
        onMailOpen={(mail) => setHwMailModal(mail)}
      />

      <HandwerkerZuweisungMailModal
        open={!!hwMailModal}
        onClose={() => setHwMailModal(null)}
        auftragId={auftragId}
        target={hwMailModal}
        onSent={onChanged}
      />
      </>
      ) : null}
    </div>
  )
}

function GewerkBlock({
  index,
  block,
  handwerkerKontext,
  openLeistungen,
  pending,
  auftragId,
  onToggleLeistung,
  onOpenHwMail,
  onOpenGewerkHandwerker,
  onOpenOhneHandwerker,
  onSavePosition,
  onMovePosition,
  onDeletePosition,
  onDeleteBlock,
  onAddLeistung,
  auftragAbgeschlossen,
  onBewerteHandwerker,
  onChanged,
  eigenregie = false,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotHandwerker = [],
  angebotPositionen = [],
  gewerke = [],
}: {
  index: number
  block: AuftragGewerkBlock
  handwerkerKontext: HandwerkerZuweisenKontext
  openLeistungen: Set<string>
  pending: boolean
  auftragId: string
  auftragAbgeschlossen: boolean
  angebotId?: string | null
  angebotTitel?: string
  angebotHandwerker?: AngebotHandwerkerRow[]
  angebotPositionen?: AngebotPosition[]
  gewerke?: GewerkOpt[]
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  eigenregie?: boolean
  onToggleLeistung: (id: string) => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onOpenGewerkHandwerker: () => void
  onOpenOhneHandwerker: () => void
  onSavePosition: (pos: AuftragPosition, patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMovePosition: (id: string, dir: -1 | 1) => void
  onDeletePosition: (id: string) => void
  onDeleteBlock: () => void
  onAddLeistung: () => void
  onChanged: () => void
}) {
  const [pendingLocal, startTransition] = useTransition()
  const zt = gewerkZeitraum(block)
  const posIds = block.positionen.map((p) => p.id)
  const gewerkId = block.gewerkId
  const canAssignGewerk = Boolean(gewerkId)
  const ohneHwCount = positionIdsOhneHandwerker(block).length

  function patchBlock(meta: Omit<Parameters<typeof updateAuftragGewerkBlockMeta>[0], 'auftragId' | 'positionIds'>) {
    startTransition(async () => {
      const r = await updateAuftragGewerkBlockMeta({ auftragId, positionIds: posIds, ...meta })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  return (
    <div className="gewerk-group">
      <div className="gewerk-group-head">
        <span className="gewerk-index-badge" aria-hidden>
          {index}
        </span>
        <div className="gewerk-group-head-fields">
          <GewerkEditableName
            title={block.gewerkName}
            disabled={pending || pendingLocal}
            onRename={(name) => patchBlock({ gewerk_name: name })}
          />
          <Input
            label="Von"
            type="date"
            value={zt.von ?? ''}
            onChange={(e) => patchBlock({ start_datum: e.target.value || null })}
          />
          <Input
            label="Bis"
            type="date"
            value={zt.bis ?? ''}
            onChange={(e) => patchBlock({ end_datum: e.target.value || null })}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-1 shrink-0">
          <Button type="button" variant="ghost" size="sm" disabled={pending || pendingLocal} onClick={onDeleteBlock}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {!eigenregie ? (
      <div className="flex flex-wrap items-center gap-2 border-b border-bw-border bg-bw-bg/60 px-3 py-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={!canAssignGewerk || pending || pendingLocal}
          onClick={onOpenGewerkHandwerker}
        >
          <HardHat className="h-3.5 w-3.5" aria-hidden />
          Handwerker fürs Gewerk
        </Button>
        {ohneHwCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={!canAssignGewerk || pending || pendingLocal}
            onClick={onOpenOhneHandwerker}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            {ohneHwCount} ohne Handwerker
          </Button>
        ) : null}
      </div>
      ) : null}

      <div className="divide-y divide-bw-border">
        {block.positionen.map((pos) => (
          <LeistungRow
            key={pos.id}
            pos={pos}
            block={block}
            gewerkId={gewerkId}
            open={openLeistungen.has(pos.id)}
            pending={pending || pendingLocal}
            handwerkerKontext={handwerkerKontext}
            auftragId={auftragId}
            onToggle={() => onToggleLeistung(pos.id)}
            onSave={(patch) => onSavePosition(pos, patch)}
            onMove={onMovePosition}
            onDelete={() => onDeletePosition(pos.id)}
            onOpenHwMail={onOpenHwMail}
            auftragAbgeschlossen={auftragAbgeschlossen}
            onBewerteHandwerker={onBewerteHandwerker}
            eigenregie={eigenregie}
            angebotId={angebotId}
            angebotTitel={angebotTitel}
            angebotHandwerker={angebotHandwerker}
            angebotPositionen={angebotPositionen}
            gewerke={gewerke}
            onChanged={onChanged}
          />
        ))}
      </div>

      <button type="button" className="pos-add-btn w-full" onClick={onAddLeistung}>
        <span className="icon-wrap">+</span>
        <span className="lbl-block">Leistung hinzufügen</span>
      </button>
    </div>
  )
}

function LeistungRow({
  pos,
  block,
  gewerkId,
  open,
  pending,
  handwerkerKontext,
  auftragId,
  onToggle,
  onSave,
  onMove,
  onDelete,
  onOpenHwMail,
  auftragAbgeschlossen,
  onBewerteHandwerker,
  onChanged,
  eigenregie = false,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotHandwerker = [],
  angebotPositionen = [],
  gewerke = [],
}: {
  pos: AuftragPosition
  block: AuftragGewerkBlock
  gewerkId: string
  open: boolean
  pending: boolean
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragId: string
  auftragAbgeschlossen: boolean
  angebotId?: string | null
  angebotTitel?: string
  angebotHandwerker?: AngebotHandwerkerRow[]
  angebotPositionen?: AngebotPosition[]
  gewerke?: GewerkOpt[]
  eigenregie?: boolean
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onToggle: () => void
  onSave: (patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDelete: () => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onChanged: () => void
}) {
  const resolvedPartnerRow = angebotHandwerkerFuerPosition(pos, angebotHandwerker, gewerke)

  return (
    <div className={cn('pos-v2-row', open && 'pos-v2-row--open')}>
      <AuftragPositionRowSummary
        pos={pos}
        open={open}
        partnerRow={resolvedPartnerRow}
        angebotPositionen={angebotPositionen}
        eigenregie={eigenregie}
        onToggle={onToggle}
        onDelete={onDelete}
      />

      {open ? (
        <div className="pos-v2-row-body">
          <AuftragPositionDetailPanel
            pos={pos}
            block={block}
            gewerkId={gewerkId}
            pending={pending}
            handwerkerKontext={handwerkerKontext}
            auftragId={auftragId}
            auftragAbgeschlossen={auftragAbgeschlossen}
            onSave={onSave}
            onMove={onMove}
            onDelete={onDelete}
            onOpenHwMail={onOpenHwMail}
            onBewerteHandwerker={onBewerteHandwerker}
            eigenregie={eigenregie}
            partnerRow={resolvedPartnerRow}
            angebotId={angebotId}
            angebotTitel={angebotTitel}
            angebotPositionen={angebotPositionen}
            onChanged={onChanged}
          />
        </div>
      ) : null}
    </div>
  )
}
