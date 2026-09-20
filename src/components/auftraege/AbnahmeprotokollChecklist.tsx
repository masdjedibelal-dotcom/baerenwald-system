'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn, MockDragHandle } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { MockSegment } from '@/components/mock-ui/MockSegment'
import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { DateInput } from '@/components/ui/DateInput'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ABNAHME_GEWERK_OHNE,
  abnahmeGewerkLabel,
  bereinigeAbnahmeLeistungName,
  gruppiereAbnahmePunkte,
  neueAbnahmeLeistungUnterGewerk,
  neuerAbnahmePunktFreitext,
  neuerBulletUnterLeistung,
  notizenFuerLeistung,
  renameAbnahmeGewerk,
  renameAbnahmeLeistung,
  reorderAbnahmeGewerkBlocks,
  reorderAbnahmeLeistungen,
  reorderAbnahmePunkteInLeistung,
  setNotizenFuerLeistung,
  type AbnahmeGewerkBlock,
  type AbnahmeLeistungGruppe,
  type AbnahmePunkt,
  type AbnahmePunktStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import type { Gewerk } from '@/lib/types'
import { cn } from '@/lib/utils'

function EditableNameField({
  label,
  value,
  placeholder,
  fallback,
  onCommit,
  className,
}: {
  label?: string
  value: string
  placeholder: string
  fallback: string
  onCommit: (next: string) => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    setDraft(value)
  }, [value])

  return (
    <MockField label={label}><MockInput placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={() => {
        const next = draft.trim() || fallback
        setDraft(next)
        if (next !== value) onCommit(next)
      }} className={`input ${className ?? ''}`.trim()} /></MockField>
  )
}

const ABNAHME_STATUS_OPTS: { s: AbnahmePunktStatus; label: string; cls: string }[] = [
  { s: 'ok', label: 'OK', cls: 'abnahme-st-ok' },
  { s: 'mangel', label: 'Mangel', cls: 'abnahme-st-mangel' },
  { s: 'offen', label: 'Offen', cls: 'abnahme-st-offen' },
]

function DragHandle(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <MockDragHandle className="btn ghost sm" {...props} />
}

function SortableItem({
  id,
  children,
  className,
}: {
  id: string
  children: (opts: { handleProps: Record<string, unknown> }) => ReactNode
  className?: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
    zIndex: isDragging ? 2 : undefined,
  }
  return (
    <div ref={setNodeRef} style={style} className={className}>
      {children({ handleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

function LeistungNotizen({
  notizen,
  onChange,
}: {
  notizen: string[]
  onChange: (next: string[]) => void
}) {
  return (
    <div className="mt-2 space-y-2">
      {notizen.map((n, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <MockInput placeholder="Notiz zur Leistung…" value={n} onChange={(e) => {
              const next = [...notizen]
              next[i] = e.target.value
              onChange(next)
            }} className="flex-1" />
          <MockBtn className="shrink-0 rounded-button p-1.5 text-bw-text-muted hover:bg-bw-hover hover:text-danger" type="button" title="Notiz löschen" onClick={() => onChange(notizen.filter((_, j) => j !== i))}>
            <MockIcon n="trash" ctx="default" className="h-4 w-4" aria-hidden />
          </MockBtn>
        </div>
      ))}
      <MockBtn className="inline-flex items-center gap-1 text-[length:var(--fs-text)] font-medium text-bw-primary hover:underline" type="button" onClick={() => onChange([...notizen, ''])}>
        <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
        Notiz hinzufügen
      </MockBtn>
    </div>
  )
}

function EditLeistungRow({
  leistung,
  leistungIndex,
  leistungCount,
  onPatchPunkt,
  onRemovePunkt,
  onRenameLeistung,
  onAddBullet,
  onMoveLeistung,
  onReorderBullets,
  onNotizen,
}: {
  leistung: AbnahmeLeistungGruppe
  leistungIndex: number
  leistungCount: number
  onPatchPunkt: (id: string, patch: Partial<AbnahmePunkt>) => void
  onRemovePunkt: (id: string) => void
  onRenameLeistung: (id: string, name: string) => void
  onAddBullet: () => void
  onMoveLeistung: (dir: 'up' | 'down') => void
  onReorderBullets: (from: number, to: number) => void
  onNotizen: (next: string[]) => void
}) {
  const bulletIds = leistung.punkte.map((p) => p.id)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onBulletDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = bulletIds.indexOf(String(active.id))
    const to = bulletIds.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorderBullets(from, to)
  }

  return (
    <SortableItem id={`leistung:${leistung.leistung_id}`} className="border-b border-bw-border last:border-0">
      {({ handleProps }) => (
        <div className="px-3 py-3">
          <div className="mb-2 flex items-start gap-1">
            <DragHandle {...handleProps} />
            <div className="pos-reorder shrink-0" aria-label="Reihenfolge Position">
              <MockBtn kind="ghost" sm className="pos-reorder-btn" type="button" title="Position nach oben" disabled={leistungIndex <= 0} onClick={() => onMoveLeistung('up')}>
                <MockIcon n="chevron-up" ctx="default" className="h-3.5 w-3.5" />
              </MockBtn>
              <MockBtn kind="ghost" sm className="pos-reorder-btn" type="button" title="Position nach unten" disabled={leistungIndex >= leistungCount - 1} onClick={() => onMoveLeistung('down')}>
                <MockIcon n="chevron-down" ctx="default" className="h-3.5 w-3.5" />
              </MockBtn>
            </div>
            <EditableNameField
              placeholder="Titel / Position…"
              value={bereinigeAbnahmeLeistungName(leistung.leistung_name)}
              fallback=""
              onCommit={(next) => onRenameLeistung(leistung.leistung_id, next)}
              className="min-w-0 flex-1"
            />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBulletDragEnd}>
            <SortableContext items={bulletIds} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {leistung.punkte.map((p) => (
                  <SortableItem key={p.id} id={p.id}>
                    {({ handleProps: bulletHandle }) => (
                      <li className="abnahme-punkt flex w-full flex-col gap-2">
                        <div className="flex w-full items-start gap-2">
                          <DragHandle {...bulletHandle} />
                          <MockInput placeholder="Checkpunkt / Beschreibung…" value={p.beschreibung} onChange={(e) => onPatchPunkt(p.id, { beschreibung: e.target.value })} className="min-w-0 flex-1" />
                          <MockBtn className="shrink-0 rounded-button p-2.5 text-bw-text-muted hover:bg-bw-hover hover:text-danger" type="button" title="Punkt löschen" aria-label="Punkt löschen" onClick={() => onRemovePunkt(p.id)}>
                            <MockIcon n="trash" ctx="default" className="h-4 w-4" aria-hidden />
                          </MockBtn>
                        </div>
                        <MockSegment
                          value={p.status}
                          onChange={(s) =>
                            onPatchPunkt(p.id, {
                              status: s,
                              mangel_frist: s === 'mangel' ? p.mangel_frist ?? null : null,
                            })
                          }
                          options={ABNAHME_STATUS_OPTS.map(({ s, label, cls }) => ({
                            value: s,
                            label,
                            className: cls,
                          }))}
                          className="pos-segmented abnahme-status-segmented flex w-full"
                          buttonClassName="pos-segmented__btn abnahme-status-segmented__btn flex-1 text-center"
                          activeClassName="pos-segmented__btn--active"
                          aria-label="Prüfstatus"
                        />
                        {p.status === 'mangel' ? (
                          <div className="ml-8 space-y-2 rounded-card border border-[var(--border)] bg-[var(--bg-soft)] p-2.5">
                            <MockField label="Mangel-Beschreibung (PDF)"><MockInput value={p.notiz ?? ''} onChange={(e) => onPatchPunkt(p.id, { notiz: e.target.value })} placeholder={p.beschreibung || 'Was ist mangelhaft?'} /></MockField>
                            <MockField label="Beseitigung bis"><DateInput value={p.mangel_frist?.slice(0, 10) ?? ''} onChange={(e) =>
                                onPatchPunkt(p.id, {
                                  mangel_frist: e.target.value.trim() || null,
                                })} /></MockField>
                          </div>
                        ) : null}
                      </li>
                    )}
                  </SortableItem>
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <LeistungNotizen notizen={notizenFuerLeistung(leistung.punkte)} onChange={onNotizen} />

          <MockBtn type="button" kind="ghost" sm className="mt-2" onClick={onAddBullet}>
            <MockIcon n="plus" ctx="default" className="mr-1 h-3.5 w-3.5" aria-hidden />
            Checkpunkt
          </MockBtn>
        </div>
      )}
    </SortableItem>
  )
}

function EditGewerkSection({
  block,
  blockIndex,
  blockCount,
  onChangePunkte,
  punkte,
}: {
  block: AbnahmeGewerkBlock
  blockIndex: number
  blockCount: number
  onChangePunkte: (next: AbnahmePunkt[]) => void
  punkte: AbnahmePunkt[]
}) {
  const leistungIds = block.leistungen.map((l) => `leistung:${l.leistung_id}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function patchPunkt(id: string, patch: Partial<AbnahmePunkt>) {
    onChangePunkte(punkte.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removePunkt(id: string) {
    onChangePunkte(punkte.filter((p) => p.id !== id))
  }

  function onLeistungDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = leistungIds.indexOf(String(active.id))
    const to = leistungIds.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onChangePunkte(reorderAbnahmeLeistungen(punkte, block.gewerk, from, to))
  }

  function removeEmptyBlock() {
    const ids = new Set(block.leistungen.flatMap((l) => l.punkte.map((p) => p.id)))
    onChangePunkte(punkte.filter((p) => !ids.has(p.id)))
  }

  const isEmpty = block.leistungen.every((l) =>
    l.punkte.every((p) => !p.beschreibung.trim() && !bereinigeAbnahmeLeistungName(p.leistung_name))
  )

  return (
    <SortableItem
      id={`gewerk:${block.gewerk}`}
      className="overflow-hidden rounded-card border border-bw-border bg-surface"
    >
      {({ handleProps }) => (
        <>
          <div className="flex items-start gap-1 border-b border-bw-border bg-bw-hover/80 px-2 py-2">
            <DragHandle {...handleProps} />
            {blockCount > 1 ? (
              <div className="pos-reorder shrink-0" aria-label="Reihenfolge Gewerk">
                <MockBtn kind="ghost" sm className="pos-reorder-btn" type="button" title="Gewerk nach oben" disabled={blockIndex <= 0} onClick={() =>
                    onChangePunkte(reorderAbnahmeGewerkBlocks(punkte, blockIndex, blockIndex - 1))}>
                  <MockIcon n="chevron-up" ctx="default" className="h-3.5 w-3.5" />
                </MockBtn>
                <MockBtn kind="ghost" sm className="pos-reorder-btn" type="button" title="Gewerk nach unten" disabled={blockIndex >= blockCount - 1} onClick={() =>
                    onChangePunkte(reorderAbnahmeGewerkBlocks(punkte, blockIndex, blockIndex + 1))}>
                  <MockIcon n="chevron-down" ctx="default" className="h-3.5 w-3.5" />
                </MockBtn>
              </div>
            ) : null}
            <EditableNameField
              label="Gewerk"
              placeholder="Gewerk-Name…"
              value={block.gewerk}
              fallback={ABNAHME_GEWERK_OHNE}
              onCommit={(next) => onChangePunkte(renameAbnahmeGewerk(punkte, block.gewerk, next))}
              className="min-w-0 flex-1"
            />
            {isEmpty ? (
              <MockBtn kind="ghost" sm className="shrink-0" type="button" title="Leeren Gewerk-Abschnitt löschen" onClick={removeEmptyBlock}>
                <MockIcon n="trash" ctx="default" className="h-4 w-4" />
              </MockBtn>
            ) : null}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onLeistungDragEnd}>
            <SortableContext items={leistungIds} strategy={verticalListSortingStrategy}>
              <div>
                {block.leistungen.map((leistung, li) => (
                  <EditLeistungRow
                    key={leistung.leistung_id}
                    leistung={leistung}
                    leistungIndex={li}
                    leistungCount={block.leistungen.length}
                    onPatchPunkt={patchPunkt}
                    onRemovePunkt={removePunkt}
                    onRenameLeistung={(id, name) =>
                      onChangePunkte(renameAbnahmeLeistung(punkte, id, name))
                    }
                    onAddBullet={() =>
                      onChangePunkte([
                        ...punkte,
                        neuerBulletUnterLeistung(
                          block.gewerk,
                          leistung.leistung_id,
                          leistung.leistung_name
                        ),
                      ])
                    }
                    onMoveLeistung={(dir) => {
                      const to = dir === 'up' ? li - 1 : li + 1
                      onChangePunkte(reorderAbnahmeLeistungen(punkte, block.gewerk, li, to))
                    }}
                    onReorderBullets={(from, to) =>
                      onChangePunkte(
                        reorderAbnahmePunkteInLeistung(punkte, leistung.leistung_id, from, to)
                      )
                    }
                    onNotizen={(next) =>
                      onChangePunkte(setNotizenFuerLeistung(punkte, leistung.leistung_id, next))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="border-t border-bw-border px-3 py-2">
            <MockBtn fullWidth className="pos-add-btn justify-start" type="button" onClick={() =>
                onChangePunkte([...punkte, neueAbnahmeLeistungUnterGewerk(block.gewerk)])}>
              <span className="icon-wrap">
                <MockIcon n="plus" ctx="default" className="h-4 w-4" />
              </span>
              <span className="lbl-block">
                <span>Position hinzufügen</span>
                <span className="sub">Leistung / Checkpunkt unter {block.gewerk}</span>
              </span>
            </MockBtn>
          </div>
        </>
      )}
    </SortableItem>
  )
}

function VorortView({
  punkte,
  onChange,
  onFotoClick,
  uploading,
}: {
  punkte: AbnahmePunkt[]
  onChange: (next: AbnahmePunkt[]) => void
  onFotoClick?: (punktId: string) => void
  uploading?: boolean
}) {
  const blocks = gruppiereAbnahmePunkte(punkte)

  function patchPunkt(id: string, patch: Partial<AbnahmePunkt>) {
    onChange(punkte.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <div
          key={block.gewerk}
          className="overflow-hidden rounded-card border border-bw-border bg-surface"
        >
          <div className="border-b border-bw-border bg-bw-hover/80 px-3 py-2">
            <p className="text-[length:var(--fs-text)] font-semibold text-bw-primary">{block.gewerk}</p>
          </div>
          <div className="divide-y divide-bw-border">
            {block.leistungen.map((leistung) => (
              <div key={leistung.leistung_id} className="px-3 py-3">
                {bereinigeAbnahmeLeistungName(leistung.leistung_name) ? (
                  <p className="mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
                    {bereinigeAbnahmeLeistungName(leistung.leistung_name)}
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {leistung.punkte.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        'abnahme-punkt flex flex-col gap-3 p-3',
                        p.status === 'mangel' && 'border-status-cancel-bg bg-status-cancel-bg/50'
                      )}
                    >
                      <p className="min-w-0 text-[length:var(--fs-text)] font-medium leading-snug text-bw-text">
                        {p.beschreibung?.trim() || '—'}
                      </p>
                      <MockSegment
                        value={p.status}
                        onChange={(s) =>
                          patchPunkt(p.id, {
                            status: s,
                            mangel_frist: s === 'mangel' ? p.mangel_frist ?? null : null,
                          })
                        }
                        options={ABNAHME_STATUS_OPTS.map(({ s, label, cls }) => ({
                          value: s,
                          label,
                          className: cls,
                        }))}
                        className="pos-segmented abnahme-status-segmented flex w-full"
                        buttonClassName="pos-segmented__btn abnahme-status-segmented__btn flex-1 text-center"
                        activeClassName="pos-segmented__btn--active"
                        aria-label="Prüfstatus"
                      />
                      {p.status === 'mangel' ? (
                        <div className="space-y-2">
                          <MockField label="Mangel-Beschreibung (PDF)"><MockInput value={p.notiz ?? ''} onChange={(e) => patchPunkt(p.id, { notiz: e.target.value })} placeholder={p.beschreibung || 'Was ist mangelhaft?'} /></MockField>
                          <MockField label="Beseitigung bis"><DateInput value={p.mangel_frist?.slice(0, 10) ?? ''} onChange={(e) =>
                              patchPunkt(p.id, {
                                mangel_frist: e.target.value.trim() || null,
                              })} /></MockField>
                        </div>
                      ) : null}
                      {(p.foto_urls ?? []).length > 0 ? (
                        <div className="bt-foto-grid w-full">
                          {(p.foto_urls ?? []).map((url) => (
                            <div key={url} className="bt-foto-thumb">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {onFotoClick ? (
                        <MockBtn
                          type="button"
                          kind="secondary" sm
                          disabled={uploading}
                          onClick={() => onFotoClick(p.id)}
                        >
                          <MockIcon n="photo" ctx="default" className="mr-1 h-3 w-3" aria-hidden />
                          Foto
                        </MockBtn>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function AbnahmeprotokollChecklist({
  punkte,
  onChange,
  mode,
  gewerke = [],
  onFotoClick,
  uploading,
}: {
  punkte: AbnahmePunkt[]
  onChange: (next: AbnahmePunkt[]) => void
  mode: 'edit' | 'vorort'
  gewerke?: Pick<Gewerk, 'id' | 'name' | 'slug'>[]
  onFotoClick?: (punktId: string) => void
  uploading?: boolean
}) {
  const [addGewerkId, setAddGewerkId] = useState('')
  const blocks = useMemo(() => gruppiereAbnahmePunkte(punkte), [punkte])
  const gewerkIds = blocks.map((b) => `gewerk:${b.gewerk}`)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (mode === 'vorort') {
    return (
      <VorortView
        punkte={punkte}
        onChange={onChange}
        onFotoClick={onFotoClick}
        uploading={uploading}
      />
    )
  }

  function onGewerkDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = gewerkIds.indexOf(String(active.id))
    const to = gewerkIds.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onChange(reorderAbnahmeGewerkBlocks(punkte, from, to))
  }

  function addGewerkFromCatalog() {
    const g = gewerke.find((x) => x.id === addGewerkId)
    if (!g) return
    onChange([...punkte, neuerAbnahmePunktFreitext(g.name)])
    setAddGewerkId('')
  }

  function addOhneGewerk() {
    onChange([...punkte, neuerAbnahmePunktFreitext(ABNAHME_GEWERK_OHNE)])
  }

  const unusedGewerke = gewerke.filter(
    (g) => !blocks.some((b) => abnahmeGewerkLabel(b.gewerk) === abnahmeGewerkLabel(g.name))
  )

  return (
    <div className="space-y-3">
      <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
        {punkte.length} Position{punkte.length === 1 ? '' : 'en'} · nach Gewerk gruppiert · per Griff
        oder Pfeil sortieren
      </p>

      {blocks.length === 0 ? (
        <div className="pos-empty rounded-card border border-bw-border bg-surface px-4 py-6 text-center">
          <p className="font-medium text-bw-text-mid">Noch keine Leistungen</p>
          <p className="mt-1 text-[length:var(--fs-meta)] text-bw-text-muted">
            Unten ein Gewerk hinzufügen oder ohne Gewerk starten.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onGewerkDragEnd}>
          <SortableContext items={gewerkIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {blocks.map((block, bi) => (
                <EditGewerkSection
                  key={block.gewerk}
                  block={block}
                  blockIndex={bi}
                  blockCount={blocks.length}
                  punkte={punkte}
                  onChangePunkte={onChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="pos-gewerk-add-row">
        <span className="pos-gewerk-add-label">Gewerk hinzufügen</span>
        <MockSelect value={addGewerkId} onChange={(e) => setAddGewerkId(e.target.value)} aria-label="Gewerk auswählen">
          <option value="">Gewerk wählen…</option>
          {unusedGewerke.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </MockSelect>
        <MockBtn kind="ghost" sm className="gap-1" type="button" disabled={!addGewerkId} onClick={addGewerkFromCatalog}>
          <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
          Abschnitt
        </MockBtn>
      </div>

      <div className="pos-add-row">
        <MockBtn className="pos-add-btn" type="button" onClick={addOhneGewerk}>
          <span className="icon-wrap">
            <MockIcon n="plus" ctx="default" className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Ohne Gewerk</span>
            <span className="sub">Freie Position / Abschnitt</span>
          </span>
        </MockBtn>
        <MockBtn className="pos-add-btn" type="button" onClick={() => {
            const target = blocks[blocks.length - 1]?.gewerk
            onChange([
              ...punkte,
              target
                ? neueAbnahmeLeistungUnterGewerk(target)
                : neuerAbnahmePunktFreitext(ABNAHME_GEWERK_OHNE),
            ])
          }}>
          <span className="icon-wrap">
            <MockIcon n="plus" ctx="default" className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Position hinzufügen</span>
            <span className="sub">
              {blocks.length ? `unter ${blocks[blocks.length - 1]!.gewerk}` : 'neuen Abschnitt'}
            </span>
          </span>
        </MockBtn>
      </div>
    </div>
  )
}
