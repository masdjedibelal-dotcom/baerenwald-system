'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  ChevronDown,
  Circle,
  CircleCheck,
  Clock,
  FileText,
  HardHat,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import { HandwerkerDetailsModal } from '@/components/auftraege/HandwerkerDetailsModal'
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
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import { updateAuftragPositionHandwerkerStatus } from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  blockSummeVk,
  groupAuftragPositionenByGewerkForAnzeige,
  type GewerkOpt,
} from '@/lib/auftraege/auftrag-position-blocks'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  auftragHwStatusBadgeClass,
  auftragHwStatusLabel,
  type AuftragHandwerkerZuweisungStatus,
} from '@/lib/auftraege/auftrag-handwerker-status'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { AuftragHandwerkerRow, AuftragPosition, AuftragStatus } from '@/lib/types'
import { cn, formatPreis } from '@/lib/utils'

type PosVisualState = 'done' | 'wait' | 'open'

function posVisualState(
  index: number,
  total: number,
  fortschritt: number,
  status: AuftragStatus
): PosVisualState {
  if (status === 'abgeschlossen') return 'done'
  if (status === 'storniert') return 'open'
  const doneCount = total > 0 ? Math.floor((fortschritt / 100) * total) : 0
  if (index < doneCount) return 'done'
  if (index === doneCount && (status === 'in_arbeit' || status === 'abnahme')) return 'wait'
  return 'open'
}

function PosIcon({ state }: { state: PosVisualState }) {
  const cls = cn(
    'h-[18px] w-[18px] shrink-0',
    state === 'done' && 'pos-icon-done',
    state === 'wait' && 'pos-icon-wait',
    state === 'open' && 'pos-icon-open'
  )
  if (state === 'done') return <CircleCheck className={cls} aria-hidden />
  if (state === 'wait') return <Clock className={cls} aria-hidden />
  return <Circle className={cls} aria-hidden />
}

function posQtyLabel(p: AuftragPosition): string {
  if (p.einheit && p.einheit !== 'pauschal') return `${p.menge ?? 1} ${p.einheit}`
  return 'Pauschal'
}

export function AuftragPositionenGewerkView({
  auftragId,
  positionen,
  gewerke,
  handwerkerRows,
  handwerkerKontext,
  auftragStatus = 'offen',
  fortschritt = 0,
  onAddLeistung,
  onEditPosition,
  onDeletePosition,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  handwerkerRows: AuftragHandwerkerRow[]
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragStatus?: AuftragStatus
  fortschritt?: number
  onAddLeistung: (gewerkSlug: string) => void
  onEditPosition: (p: AuftragPosition) => void
  onDeletePosition: (id: string) => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set())
  const [modalScope, setModalScope] = useState<HandwerkerZuweisenScope | null>(null)
  const [hwMailModal, setHwMailModal] = useState<HandwerkerZuweisungMailTarget | null>(null)
  const [detailsOpen, setDetailsOpen] = useState<
    | { mode: 'gewerk'; zuweisung: AuftragHandwerkerRow }
    | { mode: 'position'; position: AuftragPosition }
    | null
  >(null)

  const sorted = useMemo(
    () => [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )

  const blocks = useMemo(
    () => groupAuftragPositionenByGewerkForAnzeige(positionen, gewerke),
    [positionen, gewerke]
  )

  const gesamt = useMemo(
    () => sorted.reduce((s, p) => s + (p.preis_fix ?? 0), 0),
    [sorted]
  )

  const indexByPosId = useMemo(() => {
    const m = new Map<string, number>()
    sorted.forEach((p, i) => m.set(p.id, i))
    return m
  }, [sorted])

  useEffect(() => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      for (const b of blocks) next.add(b.key)
      return next
    })
  }, [blocks.length])

  function toggleSection(key: string) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function zuweisungForBlock(block: (typeof blocks)[0]) {
    if (!block.gewerkId) return null
    return handwerkerRows.find((z) => z.gewerk_id === block.gewerkId) ?? null
  }

  function openGewerkModal(block: (typeof blocks)[0]) {
    if (!block.gewerkId) {
      toast.error('Gewerk nicht in Stammdaten — bitte Position mit gültigem Gewerk anlegen.')
      return
    }
    setModalScope({
      type: 'gewerk',
      gewerkId: block.gewerkId,
      gewerkName: block.gewerkName,
      gewerkSlug: block.gewerkSlug,
      positionIds: block.positionen.map((p) => p.id),
      leistungen: block.positionen.map((p) => {
        const qty = posQtyLabel(p)
        return `${p.leistung_name}${p.beschreibung ? ` — ${p.beschreibung}` : ''} (${qty})`
      }),
    })
  }

  function openPositionModal(block: (typeof blocks)[0], position: AuftragPosition) {
    if (!block.gewerkId) {
      toast.error('Gewerk nicht in Stammdaten.')
      return
    }
    setModalScope({
      type: 'position',
      position,
      gewerkId: block.gewerkId,
      gewerkName: block.gewerkName,
    })
  }

  function changePositionStatus(positionId: string, status: AuftragHandwerkerZuweisungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionHandwerkerStatus({ auftragId, positionId, status })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Status aktualisiert')
        onChanged()
      }
    })
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={HardHat}
        title="Keine Leistungen"
        description="Lege Gewerke und Leistungen an — gruppiert wie im Angebots-Wizard."
        action={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAddLeistung('')}>
            + Leistung
          </button>
        }
      />
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-bw-text">Leistungspositionen</h2>
          <p className="mt-0.5 text-[12.5px] text-bw-text-muted">
            {sorted.length} Leistung{sorted.length === 1 ? '' : 'en'} · nach Gewerk gruppiert
          </p>
        </div>
        <div className="pos-totals min-w-[200px]">
          <div className="row grand">
            <div className="lbl">Auftragswert</div>
            <div className="val">{formatEurBetrag(gesamt)}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((block) => {
          const open = openSections.has(block.key)
          const netto = blockSummeVk(block)
          const posCount = block.positionen.length
          const zuweisung = zuweisungForBlock(block)
          const gewerkHwName = zuweisung?.handwerker?.name ?? null
          const slugForAdd = block.gewerkSlug ?? gewerke.find((g) => g.id === block.gewerkId)?.slug ?? ''

          return (
            <div key={block.key} className="pos-gewerk-section overflow-hidden rounded-lg border border-bw-border">
              <div className="flex items-stretch bg-bw-card">
                <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-bw-text">{block.gewerkName}</p>
                    {gewerkHwName ? (
                      <p className="mt-0.5 truncate text-[11px] text-bw-text-muted">
                        Gewerk-HW: {gewerkHwName}
                        {zuweisung?.status ? (
                          <span
                            className={cn(
                              'ml-1.5 inline rounded px-1.5 py-0.5 text-[10px] font-medium',
                              auftragHwStatusBadgeClass(zuweisung.status)
                            )}
                          >
                            {auftragHwStatusLabel(zuweisung.status)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="mt-0.5 text-[11px] text-bw-text-muted">
                      {posCount} Leistung{posCount === 1 ? '' : 'en'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-bw-hover"
                    onClick={() => toggleSection(block.key)}
                    aria-expanded={open}
                    aria-label={open ? 'Gewerk einklappen' : 'Gewerk aufklappen'}
                  >
                    <span className="text-[13px] font-semibold tabular-nums text-bw-text">
                      {formatEurBetrag(netto)}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-bw-text-muted transition-transform',
                        open && 'rotate-180'
                      )}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>

              {open ? (
                <div className="border-t border-bw-border bg-surface">
                  <div className="-mx-px overflow-hidden rounded-none border-0 border-t border-bw-border">
                    {block.positionen.map((pos) => {
                      const globalIndex = indexByPosId.get(pos.id) ?? 0
                      const visual = posVisualState(
                        globalIndex,
                        sorted.length,
                        fortschritt,
                        auftragStatus
                      )
                      const posStatus =
                        pos.handwerker_status ?? (pos.handwerker_id ? 'zugewiesen' : 'ausstehend')
                      const eigenleistung = !pos.handwerker_id
                      const einkaufIntern = (pos.lohn_fix ?? 0) + (pos.material_fix ?? 0)

                      return (
                        <div key={pos.id} className="pos group border-b border-bw-border last:border-b-0">
                          <PosIcon state={visual} />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-bw-text">{pos.leistung_name}</div>
                            <div className="pos-qty">
                              {pos.oberkategorie ? `${pos.oberkategorie} · ` : ''}
                              {posQtyLabel(pos)}
                              {pos.handwerker?.name ? ` · ${pos.handwerker.name}` : ''}
                            </div>
                            {pos.beschreibung ? (
                              <p className="mt-1 text-[11px] leading-snug text-bw-text-muted">
                                {pos.beschreibung}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {eigenleistung ? (
                                <span className="inline rounded-full bg-bw-green-bg px-2 py-0.5 text-[11px] font-medium text-bw-primary">
                                  Eigenleistung
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    'inline rounded-full px-2 py-0.5 text-[11px] font-medium',
                                    auftragHwStatusBadgeClass(posStatus)
                                  )}
                                >
                                  {auftragHwStatusLabel(posStatus)}
                                </span>
                              )}
                              {eigenleistung && einkaufIntern > 0 ? (
                                <span className="text-[11px] text-bw-text-muted">
                                  EK intern: {formatPreis(einkaufIntern, null, null)}
                                </span>
                              ) : null}
                              {!eigenleistung && pos.preis_partner != null && pos.preis_partner > 0 ? (
                                <span className="text-[11px] text-bw-text-muted">
                                  EK Partner: {formatPreis(pos.preis_partner, null, null)}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                disabled={!block.gewerkId || pending}
                                onClick={() => openPositionModal(block, pos)}
                              >
                                <UserPlus className="mr-1 h-3 w-3" aria-hidden />
                                {pos.handwerker_id ? 'HW ändern' : 'HW zuweisen'}
                              </Button>
                              {pos.handwerker_id ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    disabled={pending}
                                    onClick={() => setDetailsOpen({ mode: 'position', position: pos })}
                                  >
                                    <FileText className="mr-1 h-3 w-3" aria-hidden />
                                    Details
                                  </Button>
                                  <Select
                                    name={`hw-status-${pos.id}`}
                                    value={(posStatus as AuftragHandwerkerZuweisungStatus) || 'ausstehend'}
                                    onChange={(e) =>
                                      changePositionStatus(
                                        pos.id,
                                        e.target.value as AuftragHandwerkerZuweisungStatus
                                      )
                                    }
                                    options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({
                                      value: o.value,
                                      label: o.label,
                                    }))}
                                    className="!h-7 !min-w-[130px] !py-0 text-xs"
                                    disabled={pending}
                                  />
                                </>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => onEditPosition(pos)}
                              >
                                <Pencil className="mr-1 h-3 w-3" aria-hidden />
                                Bearbeiten
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-status-cancel-text hover:text-status-cancel-text"
                                disabled={pending}
                                onClick={() => onDeletePosition(pos.id)}
                              >
                                <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                                Löschen
                              </Button>
                            </div>
                          </div>
                          <span className="pos-price font-semibold tabular-nums text-bw-text">
                            {formatPreis(pos.preis_fix ?? null, null, null)}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-bw-border px-3 py-2.5">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm gap-1"
                      onClick={() => onAddLeistung(slugForAdd)}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Leistung
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm gap-1"
                      disabled={!block.gewerkId || pending}
                      onClick={() => openGewerkModal(block)}
                    >
                      <HardHat className="h-3.5 w-3.5" aria-hidden />
                      Handwerker fürs Gewerk
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" className="btn btn-primary btn-sm gap-1" onClick={() => onAddLeistung('')}>
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Leistung hinzufügen
        </button>
      </div>

      <HandwerkerZuweisenModal
        open={!!modalScope}
        onClose={() => setModalScope(null)}
        auftragId={auftragId}
        kontext={handwerkerKontext}
        scope={modalScope}
        onDone={onChanged}
        onMailOpen={(mail) => setHwMailModal(mail)}
      />

      <HandwerkerZuweisungMailModal
        open={!!hwMailModal}
        onClose={() => setHwMailModal(null)}
        auftragId={auftragId}
        target={hwMailModal}
        onSent={onChanged}
      />

      <HandwerkerDetailsModal
        open={!!detailsOpen}
        onClose={() => setDetailsOpen(null)}
        auftragId={auftragId}
        mode={detailsOpen?.mode ?? 'gewerk'}
        zuweisung={detailsOpen?.mode === 'gewerk' ? detailsOpen.zuweisung : null}
        position={detailsOpen?.mode === 'position' ? detailsOpen.position : null}
        onSaved={onChanged}
      />
    </>
  )
}
