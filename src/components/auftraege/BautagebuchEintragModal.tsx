'use client'

import { useEffect, useRef, useState } from 'react'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { BAUTAGEBUCH_MAX_FOTOS, mergeBautagebuchFotoUrls } from '@/lib/auftraege/bautagebuch-fotos'
import { toast } from '@/components/ui/app-toast'

export type BautagebuchEditorDraft = {
  id?: string
  titel: string
  beschreibung: string
  datum: string
  foto_urls: string[]
  foto_display_urls: string[]
}

export function BautagebuchEintragModal({
  open,
  onClose,
  draft,
  auftragId,
  saving,
  onChange,
  onSave,
  onRemove,
}: {
  open: boolean
  onClose: () => void
  draft: BautagebuchEditorDraft | null
  auftragId: string
  saving: boolean
  onChange: (patch: Partial<BautagebuchEditorDraft>) => void
  onSave: () => Promise<void>
  onRemove?: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const e = draft

  useEffect(() => {
    if (!open) setUploading(false)
  }, [open])

  if (!e) return null

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    const slots = BAUTAGEBUCH_MAX_FOTOS - e!.foto_urls.length
    if (slots <= 0) {
      toast.error(`Maximal ${BAUTAGEBUCH_MAX_FOTOS} Fotos.`)
      return
    }
    const list = Array.from(files).slice(0, slots)
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of list) {
        const fd = new FormData()
        fd.set('file', file)
        fd.set('filename', file.name)
        const res = await fetch(`/api/auftraege/${auftragId}/timeline-foto/upload`, {
          method: 'POST',
          body: fd,
        })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
        urls.push(json.url)
      }
      onChange({
        foto_urls: mergeBautagebuchFotoUrls(e!.foto_urls, urls),
        foto_display_urls: mergeBautagebuchFotoUrls(e!.foto_display_urls, urls),
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }

  function removeFoto(index: number) {
    onChange({
      foto_urls: e!.foto_urls.filter((_, i) => i !== index),
      foto_display_urls: e!.foto_display_urls.filter((_, i) => i !== index),
    })
  }

  const isEdit = Boolean(e.id)
  const dirty = Boolean(e.titel.trim() || e.beschreibung.trim() || e.foto_urls.length)

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={e.titel.trim() || (isEdit ? 'Eintrag' : 'Eintrag')}
      context="detail"
      dirty={dirty}
      confirmBusy={saving || uploading}
      confirmDisabled={saving || uploading || !e.titel.trim()}
      onConfirm={() => void onSave()}
    >
      <div className="form-grid">
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label>Titel</label>
          <input
            className="inp"
            value={e.titel}
            onChange={(ev) => onChange({ titel: ev.target.value })}
            placeholder="z.B. Rohinstallation"
            autoFocus={!e.titel}
          />
        </div>
        <div className="fg" style={{ gridColumn: '1 / -1' }}>
          <label>Beschreibung</label>
          <textarea
            className="ta"
            rows={3}
            value={e.beschreibung}
            onChange={(ev) => onChange({ beschreibung: ev.target.value })}
            placeholder="Was wurde gemacht…"
          />
        </div>
        <div className="fg">
          <label>Datum</label>
          <input
            className="inp"
            type="date"
            value={e.datum}
            onChange={(ev) => onChange({ datum: ev.target.value })}
          />
        </div>
      </div>

      <div className="section-h" style={{ margin: '14px 2px 8px' }}>
        Fotos
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(ev) => {
          void uploadFiles(ev.target.files)
          ev.target.value = ''
        }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {e.foto_display_urls.map((src, i) => (
          <div
            key={`${src}-${i}`}
            style={{
              width: 88,
              height: 66,
              borderRadius: 8,
              overflow: 'hidden',
              position: 'relative',
              background: 'var(--bg-soft)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              type="button"
              onClick={() => removeFoto(i)}
              style={{
                position: 'absolute',
                top: 3,
                right: 3,
                width: 20,
                height: 20,
                borderRadius: 20,
                border: 'none',
                background: 'rgba(0,0,0,0.6)',
                color: '#fff',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
              }}
              aria-label="Foto entfernen"
            >
              <MockIcon ctx="row" n="x" size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={uploading || e.foto_urls.length >= BAUTAGEBUCH_MAX_FOTOS}
          onClick={() => fileRef.current?.click()}
          style={{
            width: 88,
            height: 66,
            borderRadius: 8,
            border: '1px dashed var(--border-strong)',
            background: 'var(--bg-soft)',
            color: 'var(--text-3)',
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
          aria-label="Foto hinzufügen"
        >
          <MockIcon ctx="row" n="photo-plus" size={20} />
        </button>
      </div>

      {isEdit && onRemove ? (
        <div style={{ marginTop: 16 }}>
          <MockBtn sm kind="danger" icon="trash" onClick={onRemove} disabled={saving}>
            Entfernen
          </MockBtn>
        </div>
      ) : null}
    </EditorSheet>
  )
}
