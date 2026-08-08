'use client'

import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
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
  Camera,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
    <Input
      label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const next = draft.trim() || fallback
        setDraft(next)
        if (next !== value) onCommit(next)
      }}
      className={className}
    />
  )
}

const ABNAHME_STATUS_OPTS: { s: AbnahmePunktStatus; label: string; cls: string }[] = [
  { s: 'ok', label: 'OK', cls: 'abnahme-st-ok' },
  { s: 'mangel', label: 'Mangel', cls: 'abnahme-st-mangel' },
  { s: 'offen', label: 'Offen', cls: 'abnahme-st-offen' },
]

function StatusToggle({
  value,
  onChange,
}: {
  value: AbnahmePunktStatus
  onChange: (s: AbnahmePunktStatus) => void
}) {
  return (
    <div
      className="pos-segmented abnahme-status-segmented flex w-full"
      role="group"
      aria-label="Prüfstatus"
    >
      {ABNAHME_STATUS_OPTS.map(({ s, label, cls }) => (
        <button
          key={s}
          type="button"
          className={cn(
            'pos-segmented__btn abnahme-status-segmented__btn flex-1 text-center',
            cls,
            value === s && 'pos-segmented__btn--active'
          )}
          aria-pressed={value === s}
          onClick={() => onChange(s)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function DragHandle(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="btn ghost sm cursor-grab touch-none text-bw-text-muted active:cursor-grabbing"
      title="Ziehen zum Sortieren"
      aria-label="Ziehen zum Sortieren"
      {...props}
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  )
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
          <Input
            placeholder="Notiz zur Leistung…"
            value={n}
            onChange={(e) => {
              const next = [...notizen]
              next[i] = e.target.value
              onChange(next)
            }}
            className="flex-1"
          />
          <button
            type="button"
            className="shrink-0 rounded-md p-1.5 text-bw-text-muted hover:bg-bw-hover hover:text-red-600"
            title="Notiz löschen"
            onClick={() => onChange(notizen.filter((_, j) => j !== i))}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-1 text-[length:var(--fs-text)] font-medium text-bw-primary hover:underline"
        onClick={() => onChange([...notizen, ''])}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Notiz hinzufügen
      </button>
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
              <button
                type="button"
                className="btn ghost sm pos-reorder-btn"
                title="Position nach oben"
                disabled={leistungIndex <= 0}
                onClick={() => onMoveLeistung('up')}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="btn ghost sm pos-reorder-btn"
                title="Position nach unten"
                disabled={leistungIndex >= leistungCount - 1}
                onClick={() => onMoveLeistung('down')}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
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
                      <li className="abnahme-punkt-card flex w-full flex-col gap-2">
                        <div className="flex w-full items-start gap-2">
                          <DragHandle {...bulletHandle} />
                          <Input
                            placeholder="Checkpunkt / Beschreibung…"
                            value={p.beschreibung}
                            onChange={(e) => onPatchPunkt(p.id, { beschreibung: e.target.value })}
                            className="min-w-0 flex-1"
                          />
                          <button
                            type="button"
                            className="shrink-0 rounded-md p-2.5 text-bw-text-muted hover:bg-bw-hover hover:text-red-600"
                            title="Punkt entfernen"
                            aria-label="Punkt entfernen"
                            onClick={() => onRemovePunkt(p.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                        <StatusToggle
                          value={p.status}
                          onChange={(s) =>
                            onPatchPunkt(p.id, {
                              status: s,
                              mangel_frist: s === 'mangel' ? p.mangel_frist ?? null : null,
                            })
                          }
                        />
                        {p.status === 'mangel' ? (
                          <div className="ml-8 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] p-2.5">
                            <Input
                              label="Mangel-Beschreibung (PDF)"
                              value={p.notiz ?? ''}
                              onChange={(e) => onPatchPunkt(p.id, { notiz: e.target.value })}
                              placeholder={p.beschreibung || 'Was ist mangelhaft?'}
                            />
                            <Input
                              label="Beseitigung bis"
                              type="date"
                              value={p.mangel_frist?.slice(0, 10) ?? ''}
                              onChange={(e) =>
                                onPatchPunkt(p.id, {
                                  mangel_frist: e.target.value.trim() || null,
                                })
                              }
                            />
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

          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onAddBullet}>
            <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
            Checkpunkt
          </Button>
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
      className="overflow-hidden rounded-lg border border-bw-border bg-bw-card"
    >
      {({ handleProps }) => (
        <>
          <div className="flex items-start gap-1 border-b border-bw-border bg-bw-hover/80 px-2 py-2">
            <DragHandle {...handleProps} />
            {blockCount > 1 ? (
              <div className="pos-reorder shrink-0" aria-label="Reihenfolge Gewerk">
                <button
                  type="button"
                  className="btn ghost sm pos-reorder-btn"
                  title="Gewerk nach oben"
                  disabled={blockIndex <= 0}
                  onClick={() =>
                    onChangePunkte(reorderAbnahmeGewerkBlocks(punkte, blockIndex, blockIndex - 1))
                  }
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn ghost sm pos-reorder-btn"
                  title="Gewerk nach unten"
                  disabled={blockIndex >= blockCount - 1}
                  onClick={() =>
                    onChangePunkte(reorderAbnahmeGewerkBlocks(punkte, blockIndex, blockIndex + 1))
                  }
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
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
              <button
                type="button"
                className="btn ghost sm shrink-0"
                title="Leeren Gewerk-Abschnitt entfernen"
                onClick={removeEmptyBlock}
              >
                <Trash2 className="h-4 w-4" />
              </button>
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
            <button
              type="button"
              className="pos-add-btn w-full justify-start"
              onClick={() =>
                onChangePunkte([...punkte, neueAbnahmeLeistungUnterGewerk(block.gewerk)])
              }
            >
              <span className="icon-wrap">
                <Plus className="h-4 w-4" />
              </span>
              <span className="lbl-block">
                <span>Position hinzufügen</span>
                <span className="sub">Leistung / Checkpunkt unter {block.gewerk}</span>
              </span>
            </button>
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
          className="overflow-hidden rounded-lg border border-bw-border bg-bw-card"
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
                        'abnahme-punkt-card flex flex-col gap-3 p-3',
                        p.status === 'mangel' && 'border-red-200 bg-red-50/50'
                      )}
                    >
                      <p className="min-w-0 text-[length:var(--fs-text)] font-medium leading-snug text-bw-text">
                        {p.beschreibung?.trim() || '—'}
                      </p>
                      <StatusToggle
                        value={p.status}
                        onChange={(s) =>
                          patchPunkt(p.id, {
                            status: s,
                            mangel_frist: s === 'mangel' ? p.mangel_frist ?? null : null,
                          })
                        }
                      />
                      {p.status === 'mangel' ? (
                        <div className="space-y-2">
                          <Input
                            label="Mangel-Beschreibung (PDF)"
                            value={p.notiz ?? ''}
                            onChange={(e) => patchPunkt(p.id, { notiz: e.target.value })}
                            placeholder={p.beschreibung || 'Was ist mangelhaft?'}
                          />
                          <Input
                            label="Beseitigung bis"
                            type="date"
                            value={p.mangel_frist?.slice(0, 10) ?? ''}
                            onChange={(e) =>
                              patchPunkt(p.id, {
                                mangel_frist: e.target.value.trim() || null,
                              })
                            }
                          />
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
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={uploading}
                          onClick={() => onFotoClick(p.id)}
                        >
                          <Camera className="mr-1 h-3 w-3" aria-hidden />
                          Foto
                        </Button>
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
        <div className="pos-empty rounded-lg border border-bw-border bg-bw-card px-4 py-6 text-center">
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
        <select
          className="input"
          value={addGewerkId}
          onChange={(e) => setAddGewerkId(e.target.value)}
          aria-label="Gewerk auswählen"
        >
          <option value="">Gewerk wählen…</option>
          {unusedGewerke.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn ghost sm gap-1"
          disabled={!addGewerkId}
          onClick={addGewerkFromCatalog}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Abschnitt
        </button>
      </div>

      <div className="pos-add-row">
        <button type="button" className="pos-add-btn" onClick={addOhneGewerk}>
          <span className="icon-wrap">
            <Plus className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Ohne Gewerk</span>
            <span className="sub">Freie Position / Abschnitt</span>
          </span>
        </button>
        <button
          type="button"
          className="pos-add-btn"
          onClick={() => {
            const target = blocks[blocks.length - 1]?.gewerk
            onChange([
              ...punkte,
              target
                ? neueAbnahmeLeistungUnterGewerk(target)
                : neuerAbnahmePunktFreitext(ABNAHME_GEWERK_OHNE),
            ])
          }}
        >
          <span className="icon-wrap">
            <Plus className="h-4 w-4" />
          </span>
          <span className="lbl-block">
            <span>Position hinzufügen</span>
            <span className="sub">
              {blocks.length ? `unter ${blocks[blocks.length - 1]!.gewerk}` : 'neuen Abschnitt'}
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}
