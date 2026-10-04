'use client'
import { EMPTY } from '@/lib/crm-labels'

import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { MockField, MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { FotoDropZone } from '@/components/ui/FotoDropZone'
import { toast } from '@/components/ui/app-toast'
import {
  abnahmePunktErbrachteLeistung,
  bereinigeAbnahmeLeistungName,
  gruppiereAbnahmePunkte,
  neuerMangelCheckItem,
  notizenFuerLeistung,
  setTitelUndNotizFuerLeistung,
  type AbnahmeLeistungGruppe,
  type AbnahmeMangelCheckItem,
  type AbnahmePunkt,
  type AbnahmePunktStatus,
} from '@/lib/auftraege/abnahme-protokoll-types'
import { optimizeImageForAbnahmePdf } from '@/lib/media/optimize-image-for-upload'
import type { AuftragPosition } from '@/lib/types'
import { richTextToPlain } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

const MAX_MANGEL_FOTOS = 4

function leistungKey(p: AbnahmePunkt): string {
  return p.leistung_id?.trim() || p.id
}

function leistungAggregateStatus(punkte: AbnahmePunkt[]): AbnahmePunktStatus {
  if (!punkte.length) return 'offen'
  if (punkte.every((p) => p.status === 'ok')) return 'ok'
  if (punkte.some((p) => p.status === 'mangel')) return 'mangel'
  if (punkte.every((p) => p.status !== 'offen')) return 'ok'
  return 'offen'
}

function removeLeistung(alle: AbnahmePunkt[], leistungId: string): AbnahmePunkt[] {
  return alle.filter((p) => leistungKey(p) !== leistungId)
}

function leistungTitel(leistung: AbnahmeLeistungGruppe): string {
  const name = bereinigeAbnahmeLeistungName(leistung.leistung_name)
  if (name) return name
  return leistung.punkte[0]?.beschreibung?.trim() || 'Leistung'
}

function leistungNotiz(leistung: AbnahmeLeistungGruppe): string {
  const notes = notizenFuerLeistung(leistung.punkte)
    .map((n) => n.trim())
    .filter(Boolean)
  if (notes.length) return notes.join('\n')
  const name = bereinigeAbnahmeLeistungName(leistung.leistung_name)
  const besch = richTextToPlain(leistung.punkte[0]?.beschreibung ?? '')
  if (besch && besch !== name) return besch
  return ''
}

export function countAbgenommeneLeistungen(punkte: AbnahmePunkt[]): {
  done: number
  total: number
} {
  const blocks = gruppiereAbnahmePunkte(punkte)
  let done = 0
  let total = 0
  for (const block of blocks) {
    for (const leistung of block.leistungen) {
      total += 1
      if (leistungAggregateStatus(leistung.punkte) === 'ok') done += 1
    }
  }
  return { done, total }
}

function BegehItem({
  leistung,
  onEdit,
  onRemove,
}: {
  leistung: AbnahmeLeistungGruppe
  onEdit: () => void
  onRemove: () => void
}) {
  const notiz = leistungNotiz(leistung)

  // Eingetragene Leistungen gelten als abgenommen — kein Abhaken
  return (
    <li className="abnahme-inline__item">
      <div className="abnahme-inline__item-body">
        <p className="abnahme-inline__item-title">{leistungTitel(leistung)}</p>
        {notiz ? <p className="abnahme-inline__item-sub">{notiz}</p> : null}
      </div>
      <div className="abnahme-inline__item-actions">
        <MockBtn className="abnahme-inline__icon-btn" type="button" title="Titel & Notiz bearbeiten" aria-label="Titel & Notiz bearbeiten" onClick={onEdit}>
          <MockIcon ctx="btn" n="pencil" size={15} />
        </MockBtn>
        <MockBtn className="abnahme-inline__icon-btn" type="button" title="Löschen" aria-label="Leistung löschen" onClick={onRemove}>
          <MockIcon ctx="btn" n="trash" size={15} />
        </MockBtn>
      </div>
    </li>
  )
}

/** Freie Abnahme-Checkliste: Leistungen per Dropdown oder Freitext hinzufügen. */
export function AbnahmeBegehListe({
  punkte,
  onChange,
  katalogPositionen = [],
}: {
  punkte: AbnahmePunkt[]
  onChange: (next: AbnahmePunkt[]) => void
  /** Auftragspositionen zur Auswahl (Titel + Beschreibung übernehmen). */
  katalogPositionen?: AuftragPosition[]
}) {
  const positionsAuswahl = useMemo(
    () =>
      katalogPositionen
        .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt' && p.leistung_name?.trim())
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [katalogPositionen]
  )
  const [addArt, setAddArt] = useState<'positionen' | 'frei'>('positionen')
  const [draftGewerk, setDraftGewerk] = useState<string | null>(null)
  const blocks = useMemo(() => gruppiereAbnahmePunkte(punkte), [punkte])
  const flatLeistungen = useMemo(
    () => blocks.flatMap((b) => b.leistungen.map((l) => ({ gewerk: b.gewerk, leistung: l }))),
    [blocks]
  )

  const [addOpen, setAddOpen] = useState(false)
  const [draftTitel, setDraftTitel] = useState('')
  const [draftNotiz, setDraftNotiz] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editTitel, setEditTitel] = useState('')
  const [editNotiz, setEditNotiz] = useState('')

  function openAdd() {
    setDraftTitel('')
    setDraftNotiz('')
    setDraftGewerk(null)
    setAddArt(positionsAuswahl.length ? 'positionen' : 'frei')
    setAddOpen(true)
  }

  function confirmAdd() {
    if (!draftTitel.trim()) return
    onChange([...punkte, abnahmePunktErbrachteLeistung(draftTitel, draftNotiz, draftGewerk)])
    setAddOpen(false)
  }

  /** Position wählen → Titel, Beschreibung (und Gewerk) übernehmen und gleich hinzufügen. */
  function pickPosition(p: AuftragPosition) {
    onChange([
      ...punkte,
      abnahmePunktErbrachteLeistung(
        p.leistung_name,
        richTextToPlain(p.beschreibung ?? ''),
        p.gewerk_name?.trim() || null
      ),
    ])
    setAddOpen(false)
  }

  function openEdit(leistung: AbnahmeLeistungGruppe) {
    setEditId(leistung.leistung_id)
    setEditTitel(leistungTitel(leistung))
    setEditNotiz(leistungNotiz(leistung))
  }

  function confirmEdit() {
    if (!editId) return
    onChange(setTitelUndNotizFuerLeistung(punkte, editId, editTitel, editNotiz))
    setEditId(null)
  }

  return (
    <div className="abnahme-begeh">
      {flatLeistungen.length === 0 ? (
        <MockEmpty icon="clipboard-list" title="Noch keine Leistungen" />
      ) : (
        <ul className="abnahme-inline__items">
          {flatLeistungen.map(({ leistung }) => (
            <BegehItem
              key={leistung.leistung_id}
              leistung={leistung}
              onEdit={() => openEdit(leistung)}
              onRemove={() => onChange(removeLeistung(punkte, leistung.leistung_id))}
            />
          ))}
        </ul>
      )}

      <MockBtn className="abnahme-begeh__add" type="button" onClick={openAdd}>
        <MockIcon ctx="btn" n="plus" size={16} />
        <span>Leistung hinzufügen</span>
      </MockBtn>

      <EditorSheet
        primary={
          addArt === 'frei'
            ? { label: 'Hinzufügen', onClick: confirmAdd, disabled: !draftTitel.trim() }
            : null
        }
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Leistung hinzufügen"
        context="canvas"
        size="md"
      >
        {positionsAuswahl.length ? (
          <div className="picker-sheet__chips" role="group" aria-label="Art">
            <MockBtn className={cn('picker-sheet__chip', addArt === 'positionen' && 'is-active')} type="button" onClick={() => setAddArt('positionen')}>
              Aus Positionen
            </MockBtn>
            <MockBtn className={cn('picker-sheet__chip', addArt === 'frei' && 'is-active')} type="button" onClick={() => setAddArt('frei')}>
              Frei
            </MockBtn>
          </div>
        ) : null}
        {addArt === 'positionen' && positionsAuswahl.length ? (
          <ul className="abnahme-inline__items abnahme-pos-pick">
            {positionsAuswahl.map((p) => {
              const besch = richTextToPlain(p.beschreibung ?? '').trim()
              return (
                <li key={p.id}>
                  <MockBtn className="abnahme-inline__item abnahme-pos-pick__item" type="button" onClick={() => pickPosition(p)}>
                    <span className="abnahme-inline__item-body">
                      <span className="abnahme-inline__item-title">{p.leistung_name}</span>
                      {besch ? <span className="abnahme-inline__item-sub">{besch}</span> : null}
                    </span>
                    <MockIcon ctx="btn" n="plus" size={16} />
                  </MockBtn>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="form-grid form-grid--sheet">
            <MockField label="Leistung" required>
              <MockInput value={draftTitel} onChange={(e) => setDraftTitel(e.target.value)} placeholder="z. B. Heizkörper getauscht" autoFocus />
            </MockField>
            <MockField label="Beschreibung">
              <MockTextarea value={draftNotiz} onChange={(e) => setDraftNotiz(e.target.value)} rows={4} className="resize-y py-2" />
            </MockField>
          </div>
        )}
      </EditorSheet>

      <EditorSheet
        primary={{ label: 'Speichern', onClick: confirmEdit, disabled: Boolean(!editTitel.trim()) }}
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title="Leistung bearbeiten"
        context="canvas"
        size="md"
      >
        <div className="form-grid form-grid--sheet">
          <MockField label="Leistung" required>
            <MockInput value={editTitel} onChange={(e) => setEditTitel(e.target.value)} required />
          </MockField>
          <MockField label="Beschreibung">
            <MockTextarea value={editNotiz} onChange={(e) => setEditNotiz(e.target.value)} rows={4} className="resize-y py-2" />
          </MockField>
        </div>
      </EditorSheet>
    </div>
  )
}

export function AbnahmeProgressBar({
  done,
  total,
}: {
  done: number
  total: number
}) {
  return (
    <div className={cn('abnahme-inline__progress', total > 0 && done >= total && 'is-complete')} role="status">
      <MockIcon ctx="default" n={total > 0 && done >= total ? 'check' : 'clock'} size={16} />
      <span>
        {total === 0
          ? EMPTY.leistungenErfasst
          : `${done}/${total} Leistungen abgenommen`}
      </span>
    </div>
  )
}

/** Mängel als Checklisten-Punkte (Titel + optionale Notiz + Fotos). */
export function AbnahmeMaengelCheckliste({
  items,
  onChange,
  auftragId,
}: {
  items: AbnahmeMangelCheckItem[]
  onChange: (next: AbnahmeMangelCheckItem[]) => void
  /** Für Storage-Upload (`timeline-foto`); ohne ID kein Upload. */
  auftragId?: string
}) {
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [draftTitel, setDraftTitel] = useState('')
  const [draftNotiz, setDraftNotiz] = useState('')
  const [draftFotos, setDraftFotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [isNew, setIsNew] = useState(false)

  function openNew() {
    setIsNew(true)
    setEditIdx(-1)
    setDraftTitel('')
    setDraftNotiz('')
    setDraftFotos([])
  }

  function openEdit(i: number) {
    setIsNew(false)
    setEditIdx(i)
    setDraftTitel(items[i]?.titel ?? '')
    setDraftNotiz(items[i]?.notiz ?? '')
    setDraftFotos([...(items[i]?.foto_urls ?? [])].filter(Boolean).slice(0, MAX_MANGEL_FOTOS))
  }

  function confirm() {
    const titel = draftTitel.trim()
    const notiz = draftNotiz.trim()
    const fotos = draftFotos.filter(Boolean).slice(0, MAX_MANGEL_FOTOS)
    if (!titel && !notiz && !fotos.length) {
      setEditIdx(null)
      return
    }
    if (isNew || editIdx === -1) {
      onChange([
        ...items,
        neuerMangelCheckItem(titel || 'Mangel', notiz, fotos),
      ])
    } else if (editIdx != null && editIdx >= 0) {
      onChange(
        items.map((it, i) =>
          i === editIdx
            ? { ...it, titel: titel || 'Mangel', notiz, foto_urls: fotos }
            : it
        )
      )
    }
    setEditIdx(null)
  }

  async function uploadFotos(files: File[]) {
    if (!auftragId) {
      toast.error(TOAST.auftrag_fehlt_fotos_koennen_nicht_hochgeladen_we)
      return
    }
    if (!files.length || uploading) return
    const room = MAX_MANGEL_FOTOS - draftFotos.length
    if (room <= 0) {
      toast.error(`Maximal ${MAX_MANGEL_FOTOS} Fotos pro Mangel.`)
      return
    }
    const batch = files.slice(0, room)
    setUploading(true)
    try {
      const results = await Promise.all(
        batch.map(async (file) => {
          let uploadFile = file
          try {
            uploadFile = await optimizeImageForAbnahmePdf(file)
          } catch {
            uploadFile = file
          }
          const fd = new FormData()
          fd.append('file', uploadFile)
          fd.append('filename', uploadFile.name)
          const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
            method: 'POST',
            body: fd,
          })
          const json = (await res.json()) as { url?: string; error?: string }
          if (!res.ok || !json.url) {
            return {
              ok: false as const,
              name: file.name,
              error: json.error || 'Upload fehlgeschlagen',
            }
          }
          return { ok: true as const, url: json.url }
        })
      )
      const added = results.filter((r): r is { ok: true; url: string } => r.ok).map((r) => r.url)
      const failed = results.filter((r): r is { ok: false; name: string; error: string } => !r.ok)
      for (const f of failed) {
        toast.error(`${f.name}: ${f.error}`)
      }
      if (added.length) {
        setDraftFotos((prev) => [...prev, ...added].slice(0, MAX_MANGEL_FOTOS))
        toast.success(
          added.length === 1 ? 'Foto hochgeladen' : `${added.length} Fotos hochgeladen`
        )
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="abnahme-begeh">
      {items.length === 0 ? (
        null
      ) : (
        <ul className="abnahme-inline__items">
          {items.map((item, i) => {
            const fotos = (item.foto_urls ?? []).filter(Boolean)
            return (
              <li key={item.id} className="abnahme-inline__item">
                <div className="abnahme-inline__item-body">
                  <p className="abnahme-inline__item-title">{item.titel.trim() || 'Mangel'}</p>
                  {item.notiz.trim() ? (
                    <p className="abnahme-inline__item-sub">{item.notiz.trim()}</p>
                  ) : null}
                  {fotos.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {fotos.slice(0, MAX_MANGEL_FOTOS).map((url, fi) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${url}-${fi}`}
                          src={url}
                          alt=""
                          className="h-10 w-10 rounded-card border border-bw-border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="abnahme-inline__item-actions">
                  <MockBtn className="abnahme-inline__icon-btn" type="button" title="Bearbeiten" aria-label="Mangel bearbeiten" onClick={() => openEdit(i)}>
                    <MockIcon ctx="btn" n="pencil" size={15} />
                  </MockBtn>
                  <MockBtn
                    className="abnahme-inline__icon-btn"
                    type="button"
                    title="Löschen"
                    aria-label="Mangel löschen"
                    onClick={() =>
                      openDeleteConfirm('Mangel löschen?', () => onChange(items.filter((_, j) => j !== i)), {
                        body: item.titel.trim() || 'Mangel',
                      })
                    }
                  >
                    <MockIcon ctx="btn" n="trash" size={15} />
                  </MockBtn>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <MockBtn className="abnahme-begeh__add" type="button" onClick={openNew}>
        <MockIcon ctx="btn" n="plus" size={16} />
        <span>Mangel hinzufügen</span>
      </MockBtn>

      <EditorSheet
        primary={{ label: isNew || editIdx === -1 ? 'Hinzufügen' : 'Speichern', onClick: confirm, disabled: Boolean(uploading || !draftTitel.trim()) }}
        open={editIdx != null}
        onClose={() => setEditIdx(null)}
        title={isNew || editIdx === -1 ? 'Mangel hinzufügen' : 'Mangel bearbeiten'}
        context="canvas"
        size="md"
      >
        <div className="form-grid form-grid--sheet">
          <MockField label="Mangel" required>
            <MockInput value={draftTitel} onChange={(e) => setDraftTitel(e.target.value)} placeholder="z. B. Silikonfuge an der Wanne nacharbeiten" autoFocus />
          </MockField>
          <MockField label="Beschreibung">
            <MockTextarea value={draftNotiz} onChange={(e) => setDraftNotiz(e.target.value)} rows={3} className="resize-y py-2" />
          </MockField>
          <div>
            <span className="lt-field-lbl">Fotos</span>
            {draftFotos.length < MAX_MANGEL_FOTOS ? (
              <FotoDropZone
                disabled={uploading || !auftragId}
                multiple
                label={
                  uploading
                    ? 'Lädt…'
                    : !auftragId
                      ? 'Upload nicht verfügbar'
                      : draftFotos.length
                        ? 'Weitere Fotos hinzufügen'
                        : 'Fotos tippen oder ablegen'
                }
                labelDragging="Fotos hier ablegen"
                onFiles={(files) => void uploadFotos(files)}
              />
            ) : null}
            {draftFotos.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {draftFotos.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Mangel-Foto ${i + 1}`}
                      className="h-full w-full rounded-field border border-bw-border object-cover"
                    />
                    <MockBtn className="absolute right-1 top-1 rounded-pill bg-black/55 p-1 text-white" type="button" disabled={uploading} onClick={() =>
                        setDraftFotos((prev) => prev.filter((_, j) => j !== i))} aria-label={`Foto ${i + 1} löschen`}>
                      <MockIcon n="x" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                    </MockBtn>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </EditorSheet>
    </div>
  )
}
