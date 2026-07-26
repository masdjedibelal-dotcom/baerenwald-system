'use client'

import { useMemo, useState, useTransition } from 'react'
import { UserPlus, X } from 'lucide-react'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { Button } from '@/components/ui/Button'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import { summenPositionen } from '@/lib/auftraege/auftrag-leistung-phasen'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { richTextToPlain } from '@/lib/rich-text'
import { PartnerAbgelehntBanner } from '@/components/auftraege/PartnerAbgelehntBanner'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { AngebotHandwerkerRow, AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AuftragLeistungDetailModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungDetailModal'
import { AuftragLeistungZuweisungModal } from '@/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal'
import { PartnerVorgangChip } from '@/components/auftraege/leistungen-v3/PartnerVorgangChip'
import { HandwerkerAntwortChip } from '@/components/auftraege/leistungen-v3/HandwerkerAntwortChip'
import { istPartnerEntfernungAusstehend } from '@/lib/auftraege/partner-vorgang-display'
import {
  blockVkSumme,
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
  mwstSatz = DEFAULT_MWST_SATZ,
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
  /** Firmensatz für Brutto/MwSt-Anzeige (VK-Preise sind netto). */
  mwstSatz?: number
  onChanged: () => void
}) {
  const [, startTransition] = useTransition()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [detailPos, setDetailPos] = useState<AuftragPosition | null>(null)
  const [zuweisungIds, setZuweisungIds] = useState<string[] | null>(null)

  const disabled = auftragAbgeschlossen
  const sorted = useMemo(
    () =>
      [...positionen]
        .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )
  const blocks = useMemo(() => groupPositionenByGewerkSlug(sorted, gewerke), [sorted, gewerke])
  const totals = useMemo(() => summenPositionen(sorted), [sorted])
  const abgelehntZuweisungen = useMemo(
    () => handwerkerRows.filter((z) => (z.status ?? '').toLowerCase() === 'abgelehnt'),
    [handwerkerRows]
  )

  const vkNetto = totals.verkauf
  const ekNetto = totals.partner + totals.eigen
  const satz = Math.max(0, mwstSatz)
  const mwstBetrag = Math.round(vkNetto * (satz / 100) * 100) / 100
  const vkBrutto = Math.round((vkNetto + mwstBetrag) * 100) / 100
  const margePct =
    vkNetto > 0 ? Math.round((totals.marge / vkNetto) * 1000) / 10 : null

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

  function rowMenu(pos: AuftragPosition): EntityMenuItem[] {
    const rowLocked = istPartnerEntfernungAusstehend(pos)
    if (disabled || rowLocked) return []
    const hasHw = Boolean(pos.handwerker_id)
    return [
      {
        icon: 'user',
        label: hasHw ? 'Handwerker ändern' : 'Handwerker anfragen',
        onClick: () => setZuweisungIds([pos.id]),
      },
    ]
  }

  function gewerkMenu(block: AuftragGewerkBlock): EntityMenuItem[] {
    if (disabled) return []
    const ids = block.positionen.map((p) => p.id)
    if (ids.length === 0) return []
    return [
      {
        icon: 'user',
        label: 'Handwerker fürs Gewerk',
        onClick: () => setZuweisungIds(ids),
      },
    ]
  }

  const selectedCount = selectedIds.size

  if (!sorted.length) {
    return (
      <div className="pos-v3">
        <MockEmpty
          icon="clipboard-list"
          title="Noch keine Leistungen"
          hint="Leistungen und Gewerke stammen aus dem Angebot. Hier kannst du Handwerker anfragen."
        />
      </div>
    )
  }

  return (
    <div className="pos-v3">
      <div
        className="section-h"
        style={{
          margin: '2px 2px 10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <span>Leistungen</span>
        <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: 12.5 }}>
          {sorted.length} {sorted.length === 1 ? 'Position' : 'Positionen'}
        </span>
      </div>
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
        {blocks.map((block) => {
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
                      <div className="pt2-status-row">
                        <HandwerkerAntwortChip pos={pos} />
                        <PartnerVorgangChip pos={pos} />
                      </div>
                      <span className="pt-name">{pos.leistung_name}</span>
                      {desc ? <div className="pt-desc pt-desc--clamp2">{desc}</div> : null}
                      {hwName ? <div className="pt-hw">{hwName}</div> : null}
                      <div className="pt2-meta">
                        <span className="pt2-menge">{mengeLabel}</span>
                        <span className="pt2-preis">{formatEurBetrag(vk)}</span>
                      </div>
                    </div>
                    <div className="pt2-menge pt2-menge--desk">{mengeLabel}</div>
                    <div className="pt2-preis pt2-preis--desk">{formatEurBetrag(vk)}</div>
                    <div className="pt2-act" onClick={(e) => e.stopPropagation()}>
                      {menu.length > 0 ? (
                        <MockEntityRowMenu items={menu} title="Leistung" />
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}

        <div className="pt2-foot">
          <div className="r">
            <span>VK Brutto</span>
            <b>{formatEurBetrag(vkBrutto)}</b>
          </div>
          <div className="r">
            <span>{mwstSatz > 0 ? `MwSt ${mwstSatz} %` : 'MwSt'}</span>
            <b>{formatEurBetrag(mwstBetrag)}</b>
          </div>
          <div className="r">
            <span>VK Netto</span>
            <b>{formatEurBetrag(vkNetto)}</b>
          </div>
          <div className="r">
            <span>EK Netto</span>
            <b>{formatEurBetrag(ekNetto)}</b>
          </div>
          <div className="r grand">
            <span>
              Marge
              {margePct != null ? ` (${margePct} %)` : ''}
            </span>
            <b>{formatEurBetrag(totals.marge)}</b>
          </div>
          <div className="pt2-foot-hint">Marge = VK Netto − EK Netto</div>
        </div>
      </div>

      {selectedCount > 0 ? (
        <div className="pos-v3-bulk-bar">
          <span className="text-sm font-medium text-bw-text">{selectedCount} ausgewählt</span>
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
        onRemove={() => undefined}
        onEdit={() => {
          if (!detailPos || disabled) return
          setZuweisungIds([detailPos.id])
          setDetailPos(null)
        }}
        handwerkerOnly
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
          startTransition(() => refresh())
        }}
      />
    </div>
  )
}
