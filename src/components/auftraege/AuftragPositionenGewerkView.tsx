'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockField } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'
import { Combobox } from '@/components/ui/Combobox'
import { useEffect, useMemo, useState } from 'react'
import { resolveMockIcon } from '@/lib/mock-icons'
import { HandwerkerDetailsModal } from '@/components/auftraege/HandwerkerDetailsModal'
import {
  HandwerkerZuweisenModal,
  type HandwerkerZuweisenKontext,
  type HandwerkerZuweisenScope } from '@/components/auftraege/HandwerkerZuweisenModal'
import {
  HandwerkerZuweisungMailModal,
  type HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import { toast } from '@/components/ui/app-toast'
import { updateAuftragPositionHandwerkerStatus } from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  blockSummeVk,
  groupAuftragPositionenByGewerkForAnzeige,
  type GewerkOpt } from '@/lib/auftraege/auftrag-position-blocks'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  auftragHwStatusBadgeClass,
  auftragHwStatusLabel,
  type AuftragHandwerkerZuweisungStatus } from '@/lib/auftraege/auftrag-handwerker-status'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { nettoZuBrutto } from '@/lib/angebot-einfach'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'
import type { AuftragHandwerkerRow, AuftragPosition, AuftragStatus } from '@/lib/types'
import { cn, formatPreis } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

type PosVisualState = 'done' | 'wait' | 'open'

const ToolIcon = resolveMockIcon('tool')

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
  if (state === 'done') return <MockIcon n="circle-check-filled" ctx="default" className={cls} aria-hidden />
  if (state === 'wait') return <MockIcon n="clock" ctx="default" className={cls} aria-hidden />
  return <MockIcon n="circle" ctx="default" className={cls} aria-hidden />
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
  onChanged }: {
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

  const gesamt = useMemo(() => {
    const netto = sorted.reduce((s, p) => s + (p.preis_fix ?? 0), 0)
    return nettoZuBrutto(netto, DEFAULT_MWST_SATZ)
  }, [sorted])

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
      toast.error(TOAST.gewerk_nicht_in_stammdaten)
      return
    }
    const z = zuweisungForBlock(block)
    const replaceId =
      z?.id && z.handwerker_id && String(z.status).toLowerCase() !== 'ersetzt' ? z.id : undefined
    const alterHwId = replaceId ? z?.handwerker_id?.trim() || null : null
    const replacePositionen = alterHwId
      ? block.positionen
          .filter((p) => p.handwerker_id === alterHwId)
          .map((p) => ({
            id: p.id,
            leistung_name: p.leistung_name,
            leistung_status: p.leistung_status,
            erledigt_am: p.erledigt_am,
            preis_partner: p.preis_partner,
            lohn_fix: p.lohn_fix,
            material_fix: p.material_fix,
            handwerker_id: p.handwerker_id,
          }))
      : undefined
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
      replaceZuweisungId: replaceId,
      replacePositionen,
    })
  }

  function openPositionModal(block: (typeof blocks)[0], position: AuftragPosition) {
    if (!block.gewerkId) {
      toast.error(TOAST.gewerk_nicht_in_stammdaten_2)
      return
    }
    const z = zuweisungForBlock(block)
    const replaceId =
      position.handwerker_id && z?.id && String(z.status).toLowerCase() !== 'ersetzt'
        ? z.id
        : undefined
    setModalScope({
      type: 'position',
      position,
      gewerkId: block.gewerkId,
      gewerkName: block.gewerkName,
      replaceZuweisungId: replaceId,
      replacePositionen: replaceId
        ? [
            {
              id: position.id,
              leistung_name: position.leistung_name,
              leistung_status: position.leistung_status,
              erledigt_am: position.erledigt_am,
              preis_partner: position.preis_partner,
              lohn_fix: position.lohn_fix,
              material_fix: position.material_fix,
              handwerker_id: position.handwerker_id,
            },
          ]
        : undefined,
    })
  }

  function changePositionStatus(positionId: string, status: AuftragHandwerkerZuweisungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionHandwerkerStatus({ auftragId, positionId, status })
      if (!r.ok) toast.systemError(r)
      else {
        toast.success(TOAST.statusAktualisiert)
        onChanged()
      }
    })
  }

  if (sorted.length === 0) {
    return (
      <MockEmpty
        icon="tool"
        title="Keine Leistungen"
        hint="Lege Gewerke und Leistungen an — gruppiert wie im Angebots-Wizard."
        action={
          <MockBtn kind="primary" sm type="button" onClick={() => onAddLeistung('')}>
            + Leistung
          </MockBtn>
        }
      />
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[length:var(--fs-head)] font-semibold tracking-tight text-bw-text">Leistungspositionen</h2>
          <p className="mt-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
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
            <div key={block.key} className="pos-gewerk-section overflow-hidden rounded-card border border-bw-border">
              <div className="flex items-stretch bg-surface">
                <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[length:var(--fs-text)] font-semibold text-bw-text">{block.gewerkName}</p>
                    {gewerkHwName ? (
                      <p className="mt-0.5 truncate text-[length:var(--fs-meta)] text-bw-text-muted">
                        Gewerk-HW: {gewerkHwName}
                        {zuweisung?.status ? (
                          <span
                            className={cn(
                              'ml-1.5 inline rounded-card px-1.5 py-0.5 text-[length:var(--fs-meta)] font-medium',
                              auftragHwStatusBadgeClass(zuweisung.status)
                            )}
                          >
                            {auftragHwStatusLabel(zuweisung.status)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="mt-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
                      {posCount} Leistung{posCount === 1 ? '' : 'en'}
                    </div>
                  </div>
                  <MockBtn className="flex shrink-0 items-center gap-3 rounded-button px-2 py-1 transition-colors hover:bg-bw-hover" type="button" onClick={() => toggleSection(block.key)} aria-expanded={open} aria-label={open ? 'Gewerk einklappen' : 'Gewerk aufklappen'}>
                    <span className="text-[length:var(--fs-text)] font-semibold tabular-nums text-bw-text">
                      {formatEurBetrag(netto)}
                    </span>
                    <MockIcon n="chevron-down" ctx="default" className={cn(
                        'h-4 w-4 shrink-0 text-bw-text-muted transition-transform',
                        open && 'rotate-180'
                      )} aria-hidden />
                  </MockBtn>
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
                              <p className="mt-1 text-[length:var(--fs-meta)] leading-snug text-bw-text-muted">
                                {pos.beschreibung}
                              </p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {eigenleistung ? (
                                <span className="inline rounded-pill bg-bw-green-bg px-2 py-0.5 text-[length:var(--fs-meta)] font-medium text-bw-primary">
                                  Eigenleistung
                                </span>
                              ) : (
                                <span
                                  className={cn(
                                    'inline rounded-pill px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
                                    auftragHwStatusBadgeClass(posStatus)
                                  )}
                                >
                                  {auftragHwStatusLabel(posStatus)}
                                </span>
                              )}
                              {eigenleistung && einkaufIntern > 0 ? (
                                <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                                  EK intern: {formatPreis(einkaufIntern, null, null)}
                                </span>
                              ) : null}
                              {!eigenleistung &&
                              pos.preis_partner != null &&
                              Number.isFinite(pos.preis_partner) &&
                              pos.preis_partner >= 0 ? (
                                <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                                  EK Partner: {formatPreis(pos.preis_partner, null, null)}
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <MockBtn
                                type="button"
                                kind="ghost" sm
                                className="h-7 px-2 text-[length:var(--fs-meta)]"
                                disabled={!block.gewerkId || pending}
                                onClick={() => openPositionModal(block, pos)}
                              >
                                <MockIcon n="user" ctx="default" className="mr-1 h-3 w-3" aria-hidden />
                                {pos.handwerker_id ? 'Partner bearbeiten' : 'HW zuweisen'}
                              </MockBtn>
                              {pos.handwerker_id ? (
                                <>
                                  <MockBtn
                                    type="button"
                                    kind="ghost" sm
                                    className="h-7 px-2 text-[length:var(--fs-meta)]"
                                    disabled={pending}
                                    onClick={() => setDetailsOpen({ mode: 'position', position: pos })}
                                  >
                                    <MockIcon n="file-text" ctx="default" className="mr-1 h-3 w-3" aria-hidden />
                                    Details
                                  </MockBtn>
                                  <Combobox id={`hw-status-${pos.id}`} name={`hw-status-${pos.id}`} disabled={pending} options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({
                                      value: o.value,
                                      label: o.label }))} value={(posStatus as AuftragHandwerkerZuweisungStatus) || 'ausstehend' == null ? '' : String((posStatus as AuftragHandwerkerZuweisungStatus) || 'ausstehend')} placeholder="Auswählen…" onChange={(next) => { changePositionStatus(
                                        pos.id,
                                        next as AuftragHandwerkerZuweisungStatus
                                      ); }} className="!h-7 !min-w-[130px] !py-0 text-[length:var(--fs-meta)]" />
                                </>
                              ) : null}
                              <MockBtn
                                type="button"
                                kind="ghost" sm
                                className="h-7 px-2 text-[length:var(--fs-meta)]"
                                onClick={() => onEditPosition(pos)}
                              >
                                <MockIcon n="pencil" ctx="default" className="mr-1 h-3 w-3" aria-hidden />
                                Bearbeiten
                              </MockBtn>
                              <MockBtn
                                type="button"
                                kind="ghost" sm
                                className="h-7 px-2 text-[length:var(--fs-meta)] text-status-cancel-text hover:text-status-cancel-text"
                                disabled={pending}
                                onClick={() => onDeletePosition(pos.id)}
                              >
                                <MockIcon n="trash" ctx="default" className="mr-1 h-3 w-3" aria-hidden />
                                Löschen
                              </MockBtn>
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
                    <MockBtn kind="ghost" sm className="gap-1" type="button" onClick={() => onAddLeistung(slugForAdd)}>
                      <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                      Leistung
                    </MockBtn>
                    <MockBtn kind="ghost" sm className="gap-1" type="button" disabled={!block.gewerkId || pending} onClick={() => openGewerkModal(block)}>
                      <ToolIcon className="h-3.5 w-3.5" aria-hidden />
                      {zuweisungForBlock(block)?.handwerker_id
                        ? 'Partner bearbeiten'
                        : 'Partner fürs Gewerk'}
                    </MockBtn>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <MockBtn kind="primary" sm className="gap-1" type="button" onClick={() => onAddLeistung('')}>
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
          Leistung hinzufügen
        </MockBtn>
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
