'use client'

import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockEntityRowMenu } from '@/components/mock-ui/MockEntityRowMenu'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { FotoDropZone } from '@/components/ui/FotoDropZone'
import { toast } from '@/components/ui/app-toast'
import { confirmDelete } from '@/components/ui/confirm-delete'
import { ACTION_ICON_STROKE } from '@/components/ui/ActionIcon'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { KiAssistIconButton } from '@/components/assistent/KiAssistIconButton'
import { useKiAssistDraftConsumer } from '@/components/assistent/useKiAssistDraftConsumer'
import {
  abnahmePunktAusAuftragPosition,
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
import { optimizeImageForUpload } from '@/lib/media/optimize-image-for-upload'
import type { AuftragPosition } from '@/lib/types'
import type { EntityMenuItem } from '@/lib/entity-menu'
import { richTextToPlain } from '@/lib/rich-text'
import { cn } from '@/lib/utils'
import type { KiAssistDraft } from '@/lib/copilot/ki-assist-scopes'

const MAX_MANGEL_FOTOS = 4

function applyTextDraftToTitelNotiz(
  d: Extract<KiAssistDraft, { type: 'text' }>,
  setTitel: (v: string) => void,
  setNotiz: (v: string) => void
) {
  const titel = d.titel?.trim() || ''
  const text = d.text?.trim() || ''
  if (titel) {
    setTitel(titel)
    setNotiz(text)
    return
  }
  if (!text) return
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length >= 2) {
    setTitel(lines[0]!)
    setNotiz(lines.slice(1).join('\n'))
  } else {
    setTitel(text)
  }
}

function maengelLinesFromDraft(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean)
}

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

/** Nur erledigt ↔ nicht erledigt — kein Mangel-Zyklus. */
function toggleErledigt(current: AbnahmePunktStatus): AbnahmePunktStatus {
  return current === 'ok' ? 'offen' : 'ok'
}

function setLeistungStatus(
  alle: AbnahmePunkt[],
  leistungId: string,
  status: AbnahmePunktStatus
): AbnahmePunkt[] {
  return alle.map((p) => {
    if (leistungKey(p) !== leistungId) return p
    return {
      ...p,
      status,
      mangel_frist: status === 'mangel' ? p.mangel_frist ?? null : null,
    }
  })
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
  onToggle,
  onEdit,
  onRemove,
}: {
  leistung: AbnahmeLeistungGruppe
  onToggle: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  const status = leistungAggregateStatus(leistung.punkte)
  const notiz = leistungNotiz(leistung)

  return (
    <li className={cn('abnahme-inline__item', status === 'ok' && 'is-done')}>
      <button
        type="button"
        className={cn('abnahme-inline__check', status === 'ok' && 'is-ok')}
        aria-label={status === 'ok' ? 'Erledigt — tippen für offen' : 'Offen — tippen für erledigt'}
        aria-pressed={status === 'ok'}
        onClick={onToggle}
      >
        {status === 'ok' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
      </button>
      <div className="abnahme-inline__item-body">
        <p className="abnahme-inline__item-title">{leistungTitel(leistung)}</p>
        {notiz ? <p className="abnahme-inline__item-sub">{notiz}</p> : null}
      </div>
      <div className="abnahme-inline__item-actions">
        <button
          type="button"
          className="abnahme-inline__icon-btn"
          title="Titel & Notiz bearbeiten"
          aria-label="Titel & Notiz bearbeiten"
          onClick={onEdit}
        >
          <MockIcon ctx="btn" n="pencil" size={15} />
        </button>
        <button
          type="button"
          className="abnahme-inline__icon-btn"
          title="Entfernen"
          aria-label="Leistung entfernen"
          onClick={onRemove}
        >
          <MockIcon ctx="btn" n="trash" size={15} />
        </button>
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
  /** Auftragspositionen zur Auswahl (optional). */
  katalogPositionen?: AuftragPosition[]
}) {
  const blocks = useMemo(() => gruppiereAbnahmePunkte(punkte), [punkte])
  const flatLeistungen = useMemo(
    () => blocks.flatMap((b) => b.leistungen.map((l) => ({ gewerk: b.gewerk, leistung: l }))),
    [blocks]
  )

  const usedPosIds = useMemo(() => {
    const s = new Set<string>()
    for (const p of punkte) {
      const lid = p.leistung_id?.trim()
      if (lid) s.add(lid)
    }
    return s
  }, [punkte])

  const katalogOpts = useMemo(
    () =>
      katalogPositionen
        .filter((p) => p.id && !usedPosIds.has(p.id))
        .map((p) => ({
          value: p.id,
          label: (p.leistung_name ?? '').trim() || 'Leistung',
          sub: (p.gewerk_name ?? '').trim() || undefined,
        })),
    [katalogPositionen, usedPosIds]
  )

  const [addOpen, setAddOpen] = useState(false)
  const [addMode, setAddMode] = useState<'katalog' | 'frei'>('katalog')
  const [pickId, setPickId] = useState('')
  const [draftTitel, setDraftTitel] = useState('')
  const [draftNotiz, setDraftNotiz] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editTitel, setEditTitel] = useState('')
  const [editNotiz, setEditNotiz] = useState('')

  function openAdd() {
    const hasKatalog = katalogOpts.length > 0
    setAddMode(hasKatalog ? 'katalog' : 'frei')
    setPickId(katalogOpts[0]?.value ?? '')
    setDraftTitel('')
    setDraftNotiz('')
    setAddOpen(true)
  }

  function confirmAdd() {
    if (addMode === 'katalog' && pickId) {
      const pos = katalogPositionen.find((p) => p.id === pickId)
      if (!pos) return
      const neu = abnahmePunktAusAuftragPosition(pos)
      if (draftNotiz.trim()) neu.notizen = [draftNotiz.trim()]
      if (draftTitel.trim()) {
        neu.leistung_name = draftTitel.trim()
        neu.beschreibung = draftTitel.trim()
      }
      onChange([...punkte, neu])
    } else {
      onChange([...punkte, abnahmePunktErbrachteLeistung(draftTitel, draftNotiz)])
    }
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

  useKiAssistDraftConsumer(addOpen, 'text', (d) => {
    if (d.type !== 'text') return
    // Nur strukturierte Übernahme (Titel gesetzt) — reine Feld-KI läuft über KiAssistFieldLabel
    if (!d.titel?.trim()) return
    setAddMode('frei')
    applyTextDraftToTitelNotiz(d, setDraftTitel, setDraftNotiz)
  })

  useKiAssistDraftConsumer(Boolean(editId), 'text', (d) => {
    if (d.type !== 'text') return
    if (!d.titel?.trim()) return
    applyTextDraftToTitelNotiz(d, setEditTitel, setEditNotiz)
  })

  const leistungKiHint =
    'Abnahmeprotokoll: erbrachte Leistung für den Kunden (Titel + optionale Notiz). Keine Preise.'

  return (
    <div className="abnahme-begeh">
      {flatLeistungen.length === 0 ? (
        <p className="abnahme-begeh__empty">
          Noch keine Leistungen — per Dropdown aus dem Auftrag wählen oder frei als erbrachte
          Leistung erfassen.
        </p>
      ) : (
        <ul className="abnahme-inline__items">
          {flatLeistungen.map(({ gewerk, leistung }) => (
            <BegehItem
              key={leistung.leistung_id}
              leistung={leistung}
              onToggle={() => {
                const cur = leistungAggregateStatus(leistung.punkte)
                onChange(setLeistungStatus(punkte, leistung.leistung_id, toggleErledigt(cur)))
              }}
              onEdit={() => openEdit(leistung)}
              onRemove={() => onChange(removeLeistung(punkte, leistung.leistung_id))}
            />
          ))}
        </ul>
      )}

      <button type="button" className="abnahme-begeh__add" onClick={openAdd}>
        <MockIcon ctx="btn" n="plus" size={16} />
        <span>Leistung hinzufügen</span>
      </button>

      <EditorSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Leistung hinzufügen"
        context="canvas"
        size="md"
        headerEnd={
          <div className="flex items-center gap-1">
            <KiAssistIconButton
              overSheet
              scope="abnahme_leistung"
              title="Leistung mit KI formulieren"
              extraHint={leistungKiHint}
              draftInput={[draftTitel.trim(), draftNotiz.trim()].filter(Boolean).join('\n') || null}
              onBeforeOpen={() => setAddMode('frei')}
            />
            <button
              type="button"
              className="editor-sheet__confirm"
              disabled={
                addMode === 'katalog' ? !pickId : !draftTitel.trim() && !draftNotiz.trim()
              }
              onClick={confirmAdd}
              aria-label="Speichern"
              title="Speichern"
            >
              <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
            </button>
          </div>
        }
      >
        <div className="form-grid form-grid--sheet">
          {katalogOpts.length > 0 ? (
            <div className="abnahme-begeh__seg" role="group" aria-label="Art">
              <button
                type="button"
                className={cn('abnahme-begeh__seg-btn', addMode === 'katalog' && 'is-active')}
                onClick={() => setAddMode('katalog')}
              >
                Aus Auftrag
              </button>
              <button
                type="button"
                className={cn('abnahme-begeh__seg-btn', addMode === 'frei' && 'is-active')}
                onClick={() => setAddMode('frei')}
              >
                Freitext
              </button>
            </div>
          ) : null}

          {addMode === 'katalog' && katalogOpts.length > 0 ? (
            <Select
              label="Leistung"
              value={pickId}
              onChange={(e) => {
                setPickId(e.target.value)
                const pos = katalogPositionen.find((p) => p.id === e.target.value)
                if (pos && !draftTitel.trim()) {
                  setDraftTitel((pos.leistung_name ?? '').trim())
                }
              }}
              options={[{ value: '', label: 'Leistung wählen…' }, ...katalogOpts]}
            />
          ) : null}

          <KiAssistFieldLabel
            label={addMode === 'katalog' ? 'Titel (optional anpassen)' : 'Titel'}
            value={draftTitel}
            onApply={setDraftTitel}
            extraHint="Kurztitel der erbrachten Leistung im Abnahmeprotokoll."
          >
            <Input
              value={draftTitel}
              onChange={(e) => setDraftTitel(e.target.value)}
              placeholder={
                addMode === 'katalog' ? 'Wie im Auftrag — oder umbenennen' : 'z. B. Heizkörper getauscht'
              }
            />
          </KiAssistFieldLabel>
          <KiAssistFieldLabel
            label="Notiz (optional)"
            value={draftNotiz}
            onApply={setDraftNotiz}
            extraHint="Kurzbeschreibung unter dem Titel im PDF."
          >
            <Textarea
              long
              plain
              value={draftNotiz}
              onChange={(e) => setDraftNotiz(e.target.value)}
              placeholder="Kurzbeschreibung fürs Protokoll…"
            />
          </KiAssistFieldLabel>
        </div>
      </EditorSheet>

      <EditorSheet
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title="Leistung bearbeiten"
        context="canvas"
        size="md"
        headerEnd={
          <div className="flex items-center gap-1">
            <KiAssistIconButton
              overSheet
              scope="abnahme_leistung"
              title="Leistung mit KI formulieren"
              extraHint={leistungKiHint}
              draftInput={[editTitel.trim(), editNotiz.trim()].filter(Boolean).join('\n') || null}
            />
            <button
              type="button"
              className="editor-sheet__confirm"
              disabled={!editTitel.trim()}
              onClick={confirmEdit}
              aria-label="Speichern"
              title="Speichern"
            >
              <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
            </button>
          </div>
        }
      >
        <div className="form-grid form-grid--sheet">
          <KiAssistFieldLabel
            label="Titel"
            value={editTitel}
            onApply={setEditTitel}
            required
            extraHint="Kurztitel der erbrachten Leistung im Abnahmeprotokoll."
          >
            <Input
              value={editTitel}
              onChange={(e) => setEditTitel(e.target.value)}
              required
            />
          </KiAssistFieldLabel>
          <KiAssistFieldLabel
            label="Notiz (optional)"
            value={editNotiz}
            onApply={setEditNotiz}
            extraHint="Beschreibung unter dem Titel im PDF."
          >
            <Textarea
              long
              plain
              value={editNotiz}
              onChange={(e) => setEditNotiz(e.target.value)}
              placeholder="Beschreibung unter dem Titel im PDF…"
            />
          </KiAssistFieldLabel>
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
    <div className="abnahme-inline__progress" role="status">
      <MockIcon ctx="default" n="clock" size={16} />
      <span>
        {total === 0
          ? 'Keine Leistungen erfasst'
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
      toast.error('Auftrag fehlt — Fotos können nicht hochgeladen werden.')
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
            uploadFile = await optimizeImageForUpload(file)
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

  useKiAssistDraftConsumer(editIdx != null, ['maengel', 'text'], (d) => {
    if (d.type === 'maengel') {
      const lines = maengelLinesFromDraft(d.text)
      if (!lines.length) return
      if (lines.length > 1 && (isNew || editIdx === -1)) {
        onChange([...items, ...lines.map((l) => neuerMangelCheckItem(l, ''))])
        setEditIdx(null)
        return
      }
      setDraftTitel(lines[0]!)
      if (lines.length > 1) setDraftNotiz(lines.slice(1).join('\n'))
      return
    }
    if (d.type === 'text') {
      applyTextDraftToTitelNotiz(d, setDraftTitel, setDraftNotiz)
    }
  })

  return (
    <div className="abnahme-begeh">
      {items.length === 0 ? (
        <p className="abnahme-begeh__empty">Keine Mängel — optional Punkte hinzufügen.</p>
      ) : (
        <ul className="abnahme-inline__items">
          {items.map((item, i) => {
            const fotos = (item.foto_urls ?? []).filter(Boolean)
            return (
              <li key={item.id} className="abnahme-inline__item abnahme-inline__item--mangel">
                <span className="abnahme-inline__check is-mangel" aria-hidden>
                  <span className="text-[11px] font-bold text-amber-800">!</span>
                </span>
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
                          className="h-10 w-10 rounded border border-bw-border object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="abnahme-inline__item-actions">
                  <MockEntityRowMenu
                    title="Mangel"
                    items={
                      [
                        {
                          icon: 'pencil',
                          label: 'Bearbeiten',
                          onClick: () => openEdit(i),
                        },
                        'sep',
                        {
                          icon: 'trash',
                          label: 'Löschen',
                          danger: true,
                          onClick: () => {
                            const preview =
                              [item.titel.trim() || 'Mangel', item.notiz.trim()]
                                .filter(Boolean)
                                .join('\n')
                                .slice(0, 240) || 'Mangel'
                            confirmDelete(
                              'Mangel löschen?',
                              () => onChange(items.filter((_, j) => j !== i)),
                              { body: preview }
                            )
                          },
                        },
                      ] satisfies EntityMenuItem[]
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <button type="button" className="abnahme-begeh__add" onClick={openNew}>
        <MockIcon ctx="btn" n="plus" size={16} />
        <span>Mangel hinzufügen</span>
      </button>

      <EditorSheet
        open={editIdx != null}
        onClose={() => setEditIdx(null)}
        title={isNew || editIdx === -1 ? 'Mangel hinzufügen' : 'Mangel bearbeiten'}
        context="canvas"
        size="md"
        headerEnd={
          <div className="flex items-center gap-1">
            <KiAssistIconButton
              overSheet
              scope="mangel"
              title="Mangel mit KI formulieren"
              extraHint="Abnahmeprotokoll: Mängel klar und prüfbar (Ort + Mangel). Ein Punkt oder Liste."
              draftInput={[draftTitel.trim(), draftNotiz.trim()].filter(Boolean).join('\n') || null}
            />
            <button
              type="button"
              className="editor-sheet__confirm"
              disabled={
                uploading ||
                (!draftTitel.trim() && !draftNotiz.trim() && !draftFotos.length)
              }
              onClick={confirm}
              aria-label="Speichern"
              title="Speichern"
            >
              <Check className="h-5 w-5" strokeWidth={ACTION_ICON_STROKE} aria-hidden />
            </button>
          </div>
        }
      >
        <div className="form-grid form-grid--sheet">
          <KiAssistFieldLabel
            label="Titel"
            value={draftTitel}
            onApply={setDraftTitel}
            extraHint="Kurzer Mangel-Titel fürs Abnahmeprotokoll."
          >
            <Input
              value={draftTitel}
              onChange={(e) => setDraftTitel(e.target.value)}
              placeholder="z. B. Dichtung nachziehen"
            />
          </KiAssistFieldLabel>
          <KiAssistFieldLabel
            label="Notiz (optional)"
            value={draftNotiz}
            onApply={setDraftNotiz}
            extraHint="Details zur Nacharbeit im Protokoll."
          >
            <Textarea
              long
              plain
              value={draftNotiz}
              onChange={(e) => setDraftNotiz(e.target.value)}
              placeholder="Details zur Nacharbeit…"
            />
          </KiAssistFieldLabel>
          <div>
            <span className="lt-field-lbl">Fotos (optional)</span>
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
                      className="h-full w-full rounded-md border border-bw-border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                      disabled={uploading}
                      onClick={() =>
                        setDraftFotos((prev) => prev.filter((_, j) => j !== i))
                      }
                      aria-label={`Foto ${i + 1} entfernen`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-1.5 text-[length:var(--fs-meta)] text-[var(--text-3)]">
              Max. {MAX_MANGEL_FOTOS} Fotos · werden fürs Protokoll optimiert
            </p>
          </div>
        </div>
      </EditorSheet>
    </div>
  )
}
