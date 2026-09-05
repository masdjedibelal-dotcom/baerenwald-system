'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { Button } from '@/components/ui/Button'
import { FotoDropZone } from '@/components/ui/FotoDropZone'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { createCrmTagebuchEintrag } from '@/app/(dashboard)/auftraege/position-lebenszyklus-actions'
import type { AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'

const MAX_FOTOS = 12

/** Bautagebuch-Eintrag: 0..n Leistungen · Titel · Beschreibung · mehrere Fotos. */
export function CrmPositionEintragModal({
  open,
  onClose,
  auftragId,
  positionen,
  initialPositionId = null,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  positionen: AuftragPosition[]
  initialPositionId?: string | null
  onSaved?: () => void
}) {
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [erledigtIds, setErledigtIds] = useState<string[]>([])
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [fotoPaths, setFotoPaths] = useState<string[]>([])

  const sortedPos = useMemo(
    () =>
      [...positionen]
        .filter((p) => (p.aenderung_typ ?? '').toLowerCase() !== 'entfernt')
        .sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
            (a.leistung_name ?? '').localeCompare(b.leistung_name ?? '', 'de')
        ),
    [positionen]
  )

  useEffect(() => {
    if (!open) return
    const initial = initialPositionId?.trim()
    setSelectedIds(initial ? [initial] : [])
    setErledigtIds([])
    setTitel('')
    setBeschreibung('')
    setFotoPaths([])
  }, [open, initialPositionId])

  function toggleLeistung(id: string) {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setErledigtIds((er) => er.filter((x) => next.includes(x)))
      return next
    })
  }

  function selectKeineLeistung() {
    setSelectedIds([])
    setErledigtIds([])
  }

  function selectAlleLeistungen() {
    const all = sortedPos.map((p) => p.id)
    setSelectedIds(all)
    setErledigtIds((er) => er.filter((x) => all.includes(x)))
  }

  function toggleErledigt(id: string) {
    if (!selectedIds.includes(id)) return
    setErledigtIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function uploadFotos(files: File[]) {
    if (!files.length || uploading) return
    const room = MAX_FOTOS - fotoPaths.length
    if (room <= 0) {
      toast.error(`Maximal ${MAX_FOTOS} Fotos pro Eintrag.`)
      return
    }
    const batch = files.slice(0, room)
    setUploading(true)
    try {
      const added: string[] = []
      for (const file of batch) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('filename', file.name)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) {
          toast.error(json.error || `Upload fehlgeschlagen: ${file.name}`)
          continue
        }
        added.push(json.url)
      }
      if (added.length) {
        setFotoPaths((prev) => [...prev, ...added])
        toast.success(
          added.length === 1 ? 'Foto hochgeladen' : `${added.length} Fotos hochgeladen`
        )
      }
    } finally {
      setUploading(false)
    }
  }

  function removeFoto(url: string) {
    setFotoPaths((prev) => prev.filter((u) => u !== url))
  }

  function speichern() {
    if (!titel.trim() && !beschreibung.trim() && !fotoPaths.length) {
      toast.error('Titel, Text oder Foto angeben.')
      return
    }

    setPending(true)
    void actionBusy
      .run('Tagebuch-Eintrag wird gespeichert…', async () => {
        const r = await createCrmTagebuchEintrag({
          auftragId,
          positionIds: selectedIds,
          erledigtPositionIds: erledigtIds,
          titel: titel.trim() || null,
          beschreibung: beschreibung.trim() || null,
          quelle: 'vor_ort',
          fotoStoragePaths: fotoPaths,
        })
        if (!r.ok) {
          toast.error(r.message)
          throw new Error(r.message)
        }
        toast.success('Eintrag gespeichert')
        onSaved?.()
        onClose()
      })
      .finally(() => setPending(false))
  }

  const busy = pending || uploading
  const dirty = Boolean(
    beschreibung.trim() ||
      titel.trim() ||
      fotoPaths.length ||
      selectedIds.length ||
      erledigtIds.length
  )

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Tagebuch-Eintrag"
      size="lg"
      dirty={dirty && !busy}
      footer={
        <div className="sheet-footer-actions ldr-cta">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="lt-field-lbl">Leistungen</span>
          <p className="sheet-editable-field__hint" style={{ marginTop: 0 }}>
            Optional — keine, eine oder mehrere anhaken.
          </p>
          {sortedPos.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Keine Leistungen am Auftrag — Speichern als freier Eintrag.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    'btn sm',
                    selectedIds.length === 0 ? 'primary' : 'secondary'
                  )}
                  disabled={busy}
                  onClick={selectKeineLeistung}
                >
                  Keine Leistung
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  disabled={busy || selectedIds.length === sortedPos.length}
                  onClick={selectAlleLeistungen}
                >
                  Alle auswählen
                </button>
                <span className="text-xs text-muted">
                  {selectedIds.length === 0
                    ? 'Freier Tageseintrag ohne Leistungsbezug'
                    : `${selectedIds.length} von ${sortedPos.length} ausgewählt`}
                </span>
              </div>
              <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-0.5">
                {sortedPos.map((p) => {
                  const checked = selectedIds.includes(p.id)
                  const erledigt = erledigtIds.includes(p.id)
                  const alreadyDone = String(p.leistung_status ?? '') === 'erledigt'
                  return (
                    <li
                      key={p.id}
                      className={cn(
                        'rounded-lg border px-3 py-2',
                        checked ? 'border-accent bg-accent/5' : 'border-border'
                      )}
                    >
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          disabled={busy}
                          onChange={() => toggleLeistung(p.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {p.leistung_name?.trim() || 'Leistung'}
                          </span>
                          {alreadyDone ? (
                            <span className="text-xs text-muted">bereits erledigt</span>
                          ) : null}
                        </span>
                      </label>
                      {checked && !alreadyDone ? (
                        <label className="mt-1.5 ml-6 flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={erledigt}
                            disabled={busy}
                            onChange={() => toggleErledigt(p.id)}
                          />
                          Als erledigt markieren
                        </label>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <SheetEditableField
          label="Titel"
          value={titel}
          onSave={setTitel}
          kiExtraHint="Bautagebuch-Eintrag — Kurztitel fürs Portal."
          placeholder="Kurzer Titel fürs Portal"
          sheetContext="detail"
        />

        <SheetEditableField
          label="Beschreibung"
          value={beschreibung}
          onSave={setBeschreibung}
          multiline
          rows={4}
          kiExtraHint="Bautagebuch-Eintrag — Was ist auf der Baustelle passiert?"
          placeholder="Was ist auf der Baustelle passiert?"
          sheetContext="detail"
        />

        <div>
          <span className="lt-field-lbl">Fotos</span>
          {fotoPaths.length < MAX_FOTOS ? (
            <FotoDropZone
              disabled={busy}
              multiple
              label={
                uploading
                  ? 'Lädt…'
                  : fotoPaths.length
                    ? 'Weitere Fotos hinzufügen'
                    : 'Fotos tippen oder ablegen'
              }
              labelDragging="Fotos hier ablegen"
              onFiles={(files) => void uploadFotos(files)}
            />
          ) : null}
          {fotoPaths.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {fotoPaths.map((url, i) => (
                <div key={`${url}-${i}`} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full rounded-md border border-bw-border object-cover"
                  />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                    disabled={busy}
                    onClick={() => removeFoto(url)}
                    aria-label={`Foto ${i + 1} entfernen`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <p className="mt-1.5 text-xs text-muted">
            Bis zu {MAX_FOTOS} Fotos — Drag & Drop oder Tippen.
          </p>
        </div>
      </div>
    </EditorSheet>
  )
}
