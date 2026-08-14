'use client'

import { useLocalTransition } from '@/components/ui/action-busy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ConfirmPopup } from '@/components/ui/ConfirmPopup'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  ablehnenPartnerDokument,
  deletePartnerDokument,
  freigebenPartnerDokument,
  replacePartnerDokumentForTyp,
  signPartnerDokumentUrl,
  updatePartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import { createClient } from '@/lib/supabase'
import {
  partnerDokumentIstFreigegeben,
  partnerDokumentStatusLabel,
} from '@/lib/handwerker/partner-dokument-status'
import {
  INDIVIDUELL_TYP_SLUG,
  istEigeneUnterlageTyp,
} from '@/lib/handwerker/compliance-katalog'
import { useOverlayChromeLock } from '@/hooks/useOverlayChromeLock'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

const BUCKET = 'partner-dokumente'
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif'

const EIGENE_UNTERLAGE: ComplianceDokumentTyp = {
  id: 'individuell-fallback',
  slug: INDIVIDUELL_TYP_SLUG,
  bezeichnung: 'Eigene Unterlage',
  beschreibung: null,
  pflicht_fuer_fachbetriebe: false,
  erneuerung_monate: null,
  sort_order: 9999,
  mehrfach_erlaubt: true,
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function defaultGueltigBis(typ: ComplianceDokumentTyp, existing?: PartnerDokument | null): string {
  if (existing?.gueltig_bis) return String(existing.gueltig_bis).slice(0, 10)
  if (typ.erneuerung_monate && typ.erneuerung_monate > 0) {
    const d = new Date()
    d.setMonth(d.getMonth() + typ.erneuerung_monate)
    return d.toISOString().slice(0, 10)
  }
  return ''
}

function fileBaseName(name: string): string {
  return name.replace(/\.[^.]+$/, '').trim() || name
}

function isImagePath(path: string | null | undefined): boolean {
  const clean = (path ?? '').split('?')[0]
  return /\.(jpe?g|png|webp|gif)$/i.test(clean)
}

function isPdfPath(path: string | null | undefined): boolean {
  const clean = (path ?? '').split('?')[0]
  return /\.pdf$/i.test(clean)
}

/**
 * Neu: Upload (Datei + Titel + Gültig bis).
 * Vorhanden: Inline-Vorschau, Bestätigen / Ablehnen (mit Grund).
 */
export function PartnerDokumentEditorSheet({
  open,
  onClose,
  handwerkerId,
  typ,
  typen = [],
  allowTypPick = false,
  existing,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  handwerkerId: string
  typ: ComplianceDokumentTyp | null
  typen?: ComplianceDokumentTyp[]
  allowTypPick?: boolean
  existing: PartnerDokument | null
  onSaved?: () => void
}) {
  const [pending, startTransition] = useLocalTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [titel, setTitel] = useState('')
  const [gueltigBis, setGueltigBis] = useState('')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [dirty, setDirty] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [ablehnenOpen, setAblehnenOpen] = useState(false)
  const [ablehnGrund, setAblehnGrund] = useState('')

  useOverlayChromeLock(lightboxOpen)

  const pickOptions = useMemo(
    () => [
      { value: '', label: 'Eigene Unterlage' },
      ...typen
        .filter((t) => !istEigeneUnterlageTyp(t.slug))
        .map((t) => ({ value: t.slug, label: t.bezeichnung })),
    ],
    [typen]
  )

  const effectiveTyp = useMemo((): ComplianceDokumentTyp | null => {
    if (existing) {
      return (
        typ ??
        typen.find((t) => t.slug === existing.typ) ?? {
          ...EIGENE_UNTERLAGE,
          slug: existing.typ,
          bezeichnung: existing.bezeichnung || existing.typ,
        }
      )
    }
    if (allowTypPick) {
      if (!selectedSlug) return EIGENE_UNTERLAGE
      return typen.find((t) => t.slug === selectedSlug) ?? EIGENE_UNTERLAGE
    }
    return typ
  }, [existing, typ, typen, allowTypPick, selectedSlug])

  const isEdit = Boolean(existing)
  const isReview = Boolean(existing?.datei_url)
  const istBestaetigt = partnerDokumentIstFreigegeben(existing?.status)

  useEffect(() => {
    if (!open) return
    setFile(null)
    setDirty(false)
    setAblehnenOpen(false)
    setAblehnGrund('')
    setLightboxOpen(false)
    setPreviewUrl(null)
    if (fileRef.current) fileRef.current.value = ''

    if (existing) {
      const t =
        typ ??
        typen.find((x) => x.slug === existing.typ) ?? {
          ...EIGENE_UNTERLAGE,
          slug: existing.typ,
          bezeichnung: existing.bezeichnung || existing.typ,
        }
      setSelectedSlug(existing.typ)
      setTitel(existing.bezeichnung?.trim() || t.bezeichnung || '')
      setGueltigBis(defaultGueltigBis(t, existing))
      return
    }

    setSelectedSlug(typ?.slug && !istEigeneUnterlageTyp(typ.slug) ? typ.slug : '')
    const initial = typ && !istEigeneUnterlageTyp(typ.slug) ? typ : EIGENE_UNTERLAGE
    setTitel('')
    setGueltigBis(defaultGueltigBis(initial, null))
  }, [open, typ, existing, typen])

  useEffect(() => {
    if (!open || existing || !allowTypPick) return
    const t = selectedSlug
      ? typen.find((x) => x.slug === selectedSlug) ?? EIGENE_UNTERLAGE
      : EIGENE_UNTERLAGE
    setGueltigBis(defaultGueltigBis(t, null))
  }, [selectedSlug, open, existing, allowTypPick, typen])

  useEffect(() => {
    if (!file) {
      setLocalPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!open || !existing?.datei_url) {
      setPreviewUrl(null)
      setPreviewLoading(false)
      setPreviewError(null)
      return
    }
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewUrl(null)
    void signPartnerDokumentUrl(existing.datei_url).then((r) => {
      if (cancelled) return
      setPreviewLoading(false)
      if (r.ok) {
        setPreviewUrl(r.url)
        setPreviewError(null)
      } else {
        setPreviewUrl(null)
        setPreviewError(r.message || 'Vorschau nicht verfügbar.')
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, existing?.datei_url, existing?.id])

  const canSave = Boolean(effectiveTyp && (isEdit || file))
  const sheetTitle = isReview
    ? titel.trim() || effectiveTyp?.bezeichnung || 'Unterlage'
    : isEdit
      ? 'Unterlage bearbeiten'
      : 'Unterlage hochladen'

  function markDirty() {
    setDirty(true)
  }

  function onPickFile(next: File | null) {
    if (!next) {
      setFile(null)
      markDirty()
      return
    }
    if (next.size > MAX_FILE_BYTES) {
      toast.error('Datei zu groß — maximal 5 MB.')
      if (fileRef.current) fileRef.current.value = ''
      setFile(null)
      return
    }
    setFile(next)
    markDirty()
  }

  function resolvedTitel(): string {
    const manual = titel.trim()
    if (manual) return manual
    if (selectedSlug && effectiveTyp && !istEigeneUnterlageTyp(effectiveTyp.slug)) {
      return effectiveTyp.bezeichnung
    }
    if (file) return fileBaseName(file.name)
    if (existing?.bezeichnung?.trim()) return existing.bezeichnung.trim()
    return effectiveTyp?.bezeichnung || 'Unterlage'
  }

  function removeDoc() {
    if (!existing || !effectiveTyp) return
    if (!confirm(`„${existing.bezeichnung || effectiveTyp.bezeichnung}“ wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deletePartnerDokument(existing.id, handwerkerId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Gelöscht')
      setDirty(false)
      onSaved?.()
      onClose()
    })
  }

  function freigeben() {
    if (!existing) return
    startTransition(async () => {
      const r = await freigebenPartnerDokument(existing.id, handwerkerId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Dokument bestätigt — Partner sieht den Status im Portal.')
      setDirty(false)
      onSaved?.()
      onClose()
    })
  }

  function ablehnenSenden() {
    if (!existing) return
    const grund = ablehnGrund.trim()
    if (!grund) {
      toast.error('Bitte einen Ablehnungsgrund angeben.')
      return
    }
    startTransition(async () => {
      const r = await ablehnenPartnerDokument(existing.id, handwerkerId, grund)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Abgelehnt — Partner sieht den Grund im Portal und kann neu hochladen.')
      setAblehnenOpen(false)
      setAblehnGrund('')
      onSaved?.()
      onClose()
    })
  }

  function speichern() {
    if (!effectiveTyp) return
    if (!isEdit && !file) {
      toast.error('Bitte Dokument oder Foto auswählen (max. 5 MB).')
      return
    }

    const bezeichnung = resolvedTitel()
    const mehrfach =
      Boolean(effectiveTyp.mehrfach_erlaubt) || istEigeneUnterlageTyp(effectiveTyp.slug)

    startTransition(async () => {
      try {
        if (file) {
          const supabase = createClient()
          const path = `${handwerkerId}/${effectiveTyp.slug}-${Date.now()}-${safeFileName(file.name)}`
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          })
          if (upErr) throw new Error(upErr.message)

          const ins = await replacePartnerDokumentForTyp({
            handwerker_id: handwerkerId,
            auftrag_id: null,
            typ: effectiveTyp.slug,
            bezeichnung,
            gueltig_bis: gueltigBis.trim() || null,
            datei_url: path,
            notizen: null,
            mehrfach,
          })
          if (!ins.ok) {
            await supabase.storage.from(BUCKET).remove([path])
            throw new Error(ins.message)
          }
          toast.success(isEdit ? 'Unterlage aktualisiert' : 'Unterlage hochgeladen')
        } else if (existing) {
          const r = await updatePartnerDokument(existing.id, handwerkerId, {
            bezeichnung,
            gueltig_bis: gueltigBis.trim() || null,
            notizen: null,
          })
          if (!r.ok) throw new Error(r.message)
          toast.success('Unterlage gespeichert')
        } else {
          toast.error('Bitte Dokument oder Foto auswählen.')
          return
        }
        setDirty(false)
        onSaved?.()
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Speichern fehlgeschlagen')
      }
    })
  }

  if (!open) return null
  if (!allowTypPick && !effectiveTyp && !existing) return null

  const previewIsImage =
    isImagePath(existing?.datei_url) ||
    isImagePath(previewUrl) ||
    (file ? file.type.startsWith('image/') && !/heic|heif/i.test(file.type) : false)
  const previewIsPdf =
    isPdfPath(existing?.datei_url) || isPdfPath(previewUrl) || file?.type === 'application/pdf'
  const showUrl = localPreviewUrl || previewUrl

  const reviewFooter = isReview ? (
    <div className="flex w-full gap-2">
      <Button
        type="button"
        variant="secondary"
        className="flex-1"
        disabled={pending}
        onClick={() => {
          setAblehnGrund(existing?.ablehnung_grund?.trim() || '')
          setAblehnenOpen(true)
        }}
      >
        Ablehnen
      </Button>
      <Button
        type="button"
        variant="primary"
        className="flex-1"
        disabled={pending}
        loading={pending}
        onClick={freigeben}
      >
        {istBestaetigt ? 'Erneut bestätigen' : 'Bestätigen'}
      </Button>
    </div>
  ) : undefined

  return (
    <>
      <EditorSheet
        open={open}
        onClose={onClose}
        title={sheetTitle}
        context="detail"
        dirty={dirty && !isReview}
        size="md"
        onConfirm={isReview ? undefined : speichern}
        confirmDisabled={!canSave || pending}
        confirmBusy={pending}
        footer={reviewFooter}
        headerEnd={
          isReview ? (
            <button
              type="button"
              className="editor-sheet__confirm-text"
              disabled={pending}
              onClick={removeDoc}
              title="Löschen"
            >
              Löschen
            </button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {isReview ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-left text-[length:var(--fs-meta)] text-bw-text-muted">
                <span>
                  Status:{' '}
                  <strong className="font-medium text-bw-text">
                    {partnerDokumentStatusLabel(existing?.status)}
                  </strong>
                </span>
                {existing?.gueltig_bis ? (
                  <span>Gültig bis {formatDatum(String(existing.gueltig_bis).slice(0, 10))}</span>
                ) : null}
                {existing?.hochgeladen_am ? (
                  <span>Hochgeladen {formatDatum(String(existing.hochgeladen_am).slice(0, 10))}</span>
                ) : null}
              </div>
              {existing?.ablehnung_grund?.trim() ? (
                <p className="m-0 rounded-lg border border-status-cancel-border bg-status-cancel-bg/40 px-3 py-2 text-left text-[length:var(--fs-text)] text-status-cancel-text">
                  Ablehnung: {existing.ablehnung_grund.trim()}
                </p>
              ) : null}

              {previewLoading && !showUrl ? (
                <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
                  Vorschau wird geladen…
                </p>
              ) : showUrl && previewIsImage ? (
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-xl border border-bw-border bg-bw-bg p-0 text-left"
                  onClick={() => setLightboxOpen(true)}
                  aria-label="Dokument vergrößern"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={showUrl}
                    alt=""
                    className="mx-auto max-h-[42vh] w-full object-contain"
                  />
                  <span className="block px-3 py-2 text-center text-[length:var(--fs-meta)] text-bw-text-muted">
                    Tippen zum Vergrößern
                  </span>
                </button>
              ) : showUrl && previewIsPdf ? (
                <div className="overflow-hidden rounded-xl border border-bw-border">
                  <iframe title="Dokument" src={showUrl} className="h-[42vh] w-full bg-white" />
                  <a
                    href={showUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2 text-center text-[length:var(--fs-meta)] font-medium text-bw-primary"
                  >
                    PDF in neuem Tab öffnen
                  </a>
                </div>
              ) : showUrl ? (
                <a
                  href={showUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn secondary flex w-full justify-center"
                >
                  Dokument öffnen
                </a>
              ) : (
                <div className="space-y-2">
                  <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
                    {previewError || 'Keine Vorschau verfügbar.'}
                  </p>
                  {existing?.datei_url ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        void signPartnerDokumentUrl(existing.datei_url).then((r) => {
                          if (!r.ok) {
                            toast.error(r.message)
                            return
                          }
                          window.open(r.url, '_blank', 'noopener,noreferrer')
                        })
                      }}
                    >
                      In neuem Tab öffnen
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="form-field">
                <label className="form-field-label">
                  Dokument oder Foto <span aria-hidden>*</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  className="input"
                  accept={ACCEPT}
                  disabled={pending}
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 mb-0 text-[length:var(--fs-meta)] text-bw-text-muted">
                  PDF oder Foto · max. 5 MB
                </p>
                {file ? (
                  <p className="mt-1 mb-0 text-[length:var(--fs-text)] text-bw-text-muted">
                    {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </p>
                ) : null}
              </div>

              <Input
                label="Gültig bis"
                type="date"
                value={gueltigBis}
                disabled={pending}
                onChange={(e) => {
                  setGueltigBis(e.target.value)
                  markDirty()
                }}
              />

              {allowTypPick ? (
                <Select
                  label="Art des Dokuments"
                  value={selectedSlug}
                  options={pickOptions}
                  disabled={pending}
                  onChange={(e) => {
                    setSelectedSlug(e.target.value)
                    markDirty()
                  }}
                />
              ) : null}

              <Input
                label="Titel"
                value={titel}
                disabled={pending}
                placeholder={effectiveTyp?.bezeichnung || 'Optional'}
                onChange={(e) => {
                  setTitel(e.target.value)
                  markDirty()
                }}
              />
            </>
          )}
        </div>
      </EditorSheet>

      <ConfirmPopup
        open={ablehnenOpen}
        onClose={() => setAblehnenOpen(false)}
        title="Dokument ablehnen?"
        confirmLabel="Ablehnen und senden"
        cancelLabel="Abbrechen"
        danger
        onConfirm={ablehnenSenden}
      >
        <p className="m-0 mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
          Der Handwerker sieht den Grund im Portal und kann eine neue Datei hochladen.
        </p>
        <Textarea
          label="Begründung"
          rows={3}
          plain
          value={ablehnGrund}
          disabled={pending}
          placeholder="z. B. abgelaufen, unleserlich, falsches Dokument…"
          onChange={(e) => setAblehnGrund(e.target.value)}
        />
      </ConfirmPopup>

      {lightboxOpen && showUrl && previewIsImage ? (
        <div
          className="z-modal fixed inset-0 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Dokumentvorschau"
          onClick={() => setLightboxOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={showUrl}
            alt=""
            className={cn('max-h-[90vh] max-w-full object-contain')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  )
}
