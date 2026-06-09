'use client'

import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'
import { ImagePlus, Sparkles, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { MobileEditableBlock, MobileOverviewField } from '@/components/ui/MobileEditSheet'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useIsMobile } from '@/hooks/useIsMobile'
import { richTextToPlain } from '@/lib/rich-text'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'
import { cn } from '@/lib/utils'

function imageFilesFromFileList(list: FileList | File[]): File[] {
  return Array.from(list).filter(
    (f) =>
      f.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(f.name)
  )
}

function FotoBeschreibungField({
  foto,
  disabled,
  editing,
  onStartEdit,
  onChange,
  onEndEdit,
}: {
  foto: AngebotProjektFoto
  disabled?: boolean
  editing: boolean
  onStartEdit: () => void
  onChange: (text: string) => void
  onEndEdit: () => void
}) {
  const isMobile = useIsMobile()
  const ref = useRef<HTMLDivElement>(null)
  const hasText = richTextToPlain(foto.beschreibung).length > 0
  /** Nur-Lese-Ansicht nur mit Inhalt und ohne aktiven Bearbeitungsmodus */
  const showReadOnly = hasText && !editing

  useEffect(() => {
    if (!isMobile && !showReadOnly && editing && ref.current) {
      ref.current.focus()
      const sel = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isMobile, showReadOnly, editing])

  function ensureEditing() {
    if (!editing) onStartEdit()
  }

  const editor = (
    <label className="wizard-projekt-field min-w-0 flex-1">
      <span className="wizard-projekt-field-label">Beschreibung (optional)</span>
      <RichTextEditor
        ref={ref}
        minHeight={72}
        placeholder="z. B. Istzustand Dusche…"
        value={foto.beschreibung}
        onFocus={ensureEditing}
        onChange={(v) => {
          ensureEditing()
          onChange(v)
        }}
        onBlur={onEndEdit}
        disabled={disabled}
      />
    </label>
  )

  const overview = (
    <MobileOverviewField
      label="Beschreibung"
      value={
        hasText ? (
          <RichTextContent html={foto.beschreibung} className="text-sm" />
        ) : (
          <span className="text-bw-text-muted">Keine Beschreibung</span>
        )
      }
    />
  )

  if (isMobile) {
    return (
      <div className="wizard-projekt-field min-w-0 flex-1">
        <MobileEditableBlock
          sheetTitle="Foto-Beschreibung"
          overview={overview}
          disabled={disabled}
          editLabel={hasText ? 'Beschreibung bearbeiten' : 'Beschreibung hinzufügen'}
        >
          {editor}
        </MobileEditableBlock>
      </div>
    )
  }

  if (!showReadOnly) {
    return editor
  }

  return (
    <div className="wizard-projekt-field min-w-0 flex-1">
      <span className="wizard-projekt-field-label">Beschreibung</span>
      <button
        type="button"
        className="wizard-foto-beschreibung-read w-full text-left text-[13px] leading-snug text-bw-text"
        onClick={onStartEdit}
        disabled={disabled}
      >
        <RichTextContent html={foto.beschreibung} />
      </button>
      <p className="wizard-projekt-field-hint">Klicken zum Bearbeiten</p>
    </div>
  )
}

function WizardFotoRow({
  foto,
  disabled,
  editingBeschreibung,
  onStartEditBeschreibung,
  onEndEditBeschreibung,
  onPatchBeschreibung,
  onPreview,
  onRemove,
  onVisualisieren,
  visualisierenLoading,
}: {
  foto: AngebotProjektFoto
  disabled?: boolean
  editingBeschreibung: boolean
  onStartEditBeschreibung: () => void
  onEndEditBeschreibung: () => void
  onPatchBeschreibung: (text: string) => void
  onPreview: () => void
  onRemove: () => void
  onVisualisieren?: () => void
  visualisierenLoading?: boolean
}) {
  return (
    <div className="wizard-foto-item">
      <div className="flex flex-wrap gap-3 sm:flex-nowrap">
        <button
          type="button"
          className="wizard-foto-thumb shrink-0"
          onClick={onPreview}
          title="Vorschau"
          disabled={disabled}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto.url} alt="" className="h-full w-full object-cover" />
        </button>
        <FotoBeschreibungField
          foto={foto}
          disabled={disabled}
          editing={editingBeschreibung}
          onStartEdit={onStartEditBeschreibung}
          onChange={onPatchBeschreibung}
          onEndEdit={onEndEditBeschreibung}
        />
        <div className="flex shrink-0 flex-col gap-1 self-start sm:ml-0">
          {onVisualisieren ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm gap-1 px-2 py-1 text-xs"
              title="KI-Visualisierung für dieses Foto"
              disabled={disabled || visualisierenLoading}
              onClick={onVisualisieren}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Visualisieren
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm p-1.5"
            title="Bild entfernen"
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AngebotWizardFotodokumentation({
  fotos,
  onChange,
  notizFotos,
  uploading,
  disabled,
  onUploadFiles,
  onVisualisierenFoto,
  visualisierenFotoUrl,
}: {
  fotos: AngebotProjektFoto[]
  onChange: (next: AngebotProjektFoto[]) => void
  notizFotos: { url: string }[]
  uploading: boolean
  disabled?: boolean
  onUploadFiles: (files: File[]) => void
  /** Öffnet KI-Visualisierung mit diesem Foto als Ist-Bild (neuer Tab). */
  onVisualisierenFoto?: (fotoUrl: string) => void | Promise<void>
  visualisierenFotoUrl?: string | null
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [editBeschreibungUrl, setEditBeschreibungUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const selectedUrls = new Set(fotos.map((f) => f.url))

  function toggleUrl(url: string) {
    if (selectedUrls.has(url)) {
      onChange(fotos.filter((f) => f.url !== url))
      if (editBeschreibungUrl === url) setEditBeschreibungUrl(null)
      if (lightboxUrl === url) setLightboxUrl(null)
    } else {
      onChange([...fotos, { url, beschreibung: '' }])
    }
  }

  function patchBeschreibung(url: string, beschreibung: string) {
    onChange(fotos.map((f) => (f.url === url ? { ...f, beschreibung } : f)))
  }

  function removeFoto(url: string) {
    onChange(fotos.filter((f) => f.url !== url))
    if (editBeschreibungUrl === url) setEditBeschreibungUrl(null)
    if (lightboxUrl === url) setLightboxUrl(null)
  }

  const unselectedNotiz = notizFotos.filter(({ url }) => !selectedUrls.has(url))
  const uploadBlocked = uploading || disabled

  function submitFiles(raw: FileList | File[]) {
    const images = imageFilesFromFileList(raw)
    if (!images.length) return
    onUploadFiles(images)
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!uploadBlocked) setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    const rel = e.relatedTarget as Node | null
    if (!rel || !e.currentTarget.contains(rel)) setIsDragging(false)
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (uploadBlocked) return
    submitFiles(e.dataTransfer.files)
  }

  return (
    <Card
      className="wizard-projekt-fotos"
      title={
        <>
          <ImagePlus className="h-3.5 w-3.5 shrink-0 text-bw-text-muted" aria-hidden />
          Fotodokumentation
        </>
      }
    >
      {unselectedNotiz.length > 0 ? (
        <div className="wizard-foto-add">
          <p className="wizard-projekt-field-hint mb-2">Aus Notizen hinzufügen:</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {unselectedNotiz.map(({ url }) => (
              <button
                key={url}
                type="button"
                onClick={() => toggleUrl(url)}
                className="wizard-foto-pick relative overflow-hidden rounded-md border border-bw-border bg-bw-hover/60 text-left"
                disabled={disabled}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={cn(unselectedNotiz.length > 0 && 'mt-3')}>
        <label
          className={cn(
            'wizard-foto-upload flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-bw-border bg-bw-hover/40 p-3 text-center text-[13px] text-bw-text-muted transition-colors',
            isDragging && 'border-bw-link bg-blue-50',
            uploadBlocked && 'pointer-events-none opacity-60'
          )}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {uploading
            ? 'Wird hochgeladen…'
            : isDragging
              ? 'Bilder hier ablegen'
              : 'Fotos hochladen oder hierher ziehen'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={uploadBlocked}
            onChange={(e) => {
              submitFiles(e.target.files ?? [])
              e.target.value = ''
            }}
          />
        </label>
        <p className="wizard-projekt-field-hint mt-1">
          Optional — per Klick oder Drag & Drop; erscheint im PDF unter dem Foto. Pro Foto kannst du
          eine KI-Visualisierung starten.
        </p>
      </div>

      {fotos.length > 0 ? (
        <>
          <hr className="wizard-projekt-divider mt-4" aria-hidden />
          <div className="wizard-foto-list">
          {fotos.map((f, i) => (
            <Fragment key={f.url}>
              {i > 0 ? <hr className="wizard-projekt-divider" aria-hidden /> : null}
              <WizardFotoRow
                foto={f}
                disabled={disabled}
                editingBeschreibung={editBeschreibungUrl === f.url}
                onStartEditBeschreibung={() => setEditBeschreibungUrl(f.url)}
                onEndEditBeschreibung={() => setEditBeschreibungUrl(null)}
                onPatchBeschreibung={(text) => patchBeschreibung(f.url, text)}
                onPreview={() => setLightboxUrl(f.url)}
                onRemove={() => removeFoto(f.url)}
                onVisualisieren={
                  onVisualisierenFoto ? () => void onVisualisierenFoto(f.url) : undefined
                }
                visualisierenLoading={visualisierenFotoUrl === f.url}
              />
            </Fragment>
          ))}
          </div>
        </>
      ) : null}

      <Modal open={Boolean(lightboxUrl)} onClose={() => setLightboxUrl(null)} title="Foto" size="xl">
        {lightboxUrl ? (
          <div className="flex max-h-[min(85vh,800px)] flex-col items-center justify-center gap-3 overflow-auto p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Foto" className="max-h-full max-w-full object-contain" />
            {(() => {
              const cap = fotos.find((x) => x.url === lightboxUrl)?.beschreibung.trim()
              return cap ? (
                <RichTextContent
                  html={cap}
                  className="max-w-prose text-center text-[12px] leading-snug text-bw-text-muted"
                />
              ) : null
            })()}
          </div>
        ) : null}
      </Modal>
    </Card>
  )
}
