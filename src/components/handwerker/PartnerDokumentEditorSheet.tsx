'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  deletePartnerDokument,
  replacePartnerDokumentForTyp,
  signPartnerDokumentUrl,
  updatePartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import { createClient } from '@/lib/supabase'
import { partnerDokumentStatusLabel } from '@/lib/handwerker/partner-dokument-status'
import { INDIVIDUELL_TYP_SLUG } from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'

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

/**
 * Compliance-Unterlage hochladen / bearbeiten.
 * Neu: Datei (Dok/Foto ≤5 MB) → Gültig bis → Art → Titel/Beschreibung optional.
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
  /** Neu-Upload: Art des Dokuments wählbar */
  allowTypPick?: boolean
  existing: PartnerDokument | null
  onSaved?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [titel, setTitel] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [gueltigBis, setGueltigBis] = useState('')
  const [selectedSlug, setSelectedSlug] = useState('')
  const [dirty, setDirty] = useState(false)

  const pickOptions = useMemo(
    () => [
      { value: '', label: 'Eigene Unterlage' },
      ...typen
        .filter((t) => t.slug !== INDIVIDUELL_TYP_SLUG)
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

  useEffect(() => {
    if (!open) return
    setFile(null)
    setDirty(false)
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
      setTitel(existing.bezeichnung?.trim() || '')
      setBeschreibung(existing.notizen?.trim() || '')
      setGueltigBis(defaultGueltigBis(t, existing))
      return
    }

    setSelectedSlug(typ?.slug && typ.slug !== INDIVIDUELL_TYP_SLUG ? typ.slug : '')
    const initial = typ && typ.slug !== INDIVIDUELL_TYP_SLUG ? typ : EIGENE_UNTERLAGE
    setTitel('')
    setBeschreibung('')
    setGueltigBis(defaultGueltigBis(initial, null))
  }, [open, typ, existing, typen])

  useEffect(() => {
    if (!open || existing || !allowTypPick) return
    const t = selectedSlug
      ? typen.find((x) => x.slug === selectedSlug) ?? EIGENE_UNTERLAGE
      : EIGENE_UNTERLAGE
    setGueltigBis(defaultGueltigBis(t, null))
  }, [selectedSlug, open, existing, allowTypPick, typen])

  const isEdit = Boolean(existing)
  const canSave = Boolean(effectiveTyp && (isEdit || file))

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
    if (selectedSlug && effectiveTyp && effectiveTyp.slug !== INDIVIDUELL_TYP_SLUG) {
      return effectiveTyp.bezeichnung
    }
    if (file) return fileBaseName(file.name)
    if (existing?.bezeichnung?.trim()) return existing.bezeichnung.trim()
    return effectiveTyp?.bezeichnung || 'Unterlage'
  }

  async function openDatei() {
    if (!existing?.datei_url) return
    const r = await signPartnerDokumentUrl(existing.datei_url)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
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

  function speichern() {
    if (!effectiveTyp) return
    if (!isEdit && !file) {
      toast.error('Bitte Dokument oder Foto auswählen (max. 5 MB).')
      return
    }

    const bezeichnung = resolvedTitel()
    const mehrfach =
      Boolean(effectiveTyp.mehrfach_erlaubt) || effectiveTyp.slug === INDIVIDUELL_TYP_SLUG

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
            notizen: beschreibung.trim() || null,
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
            notizen: beschreibung.trim() || null,
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

  const partnerHint =
    existing &&
    existing.status &&
    !['freigegeben', 'genehmigt'].includes(String(existing.status).toLowerCase())
      ? partnerDokumentStatusLabel(existing.status)
      : existing?.datei_url
        ? 'Vorhanden — bearbeiten, ersetzen oder löschen'
        : null

  const crumbLabel =
    allowTypPick && !existing
      ? selectedSlug
        ? effectiveTyp?.bezeichnung ?? 'Unterlage'
        : 'Eigene Unterlage'
      : effectiveTyp?.bezeichnung ?? 'Unterlage'

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Unterlage bearbeiten' : 'Unterlage hochladen'}
      crumb={`${crumbLabel} >`}
      context="detail"
      dirty={dirty}
      size="md"
      onConfirm={speichern}
      confirmDisabled={!canSave || pending}
      confirmBusy={pending}
    >
      <div className="space-y-4">
        {partnerHint ? (
          <p className="m-0 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-[length:var(--fs-text)] text-bw-text-muted">
            {partnerHint}
            {existing?.hochgeladen_am
              ? ` · ${String(existing.hochgeladen_am).slice(0, 10)}`
              : null}
          </p>
        ) : null}

        <div className="form-field">
          <label className="form-field-label">
            Dokument oder Foto {!isEdit ? <span aria-hidden>*</span> : null}
          </label>
          {existing?.datei_url && !file ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button type="button" className="btn ghost sm" onClick={() => void openDatei()}>
                <ActionIcon n="file" size={14} />
                Aktuelle Datei öffnen
              </button>
              <span className="text-[length:var(--fs-text)] text-bw-text-muted">
                oder neue Datei wählen zum Ersetzen
              </span>
            </div>
          ) : null}
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

        {allowTypPick && !existing ? (
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

        {effectiveTyp?.beschreibung && selectedSlug ? (
          <p className="m-0 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-[length:var(--fs-text)] text-bw-text-muted">
            {effectiveTyp.beschreibung}
          </p>
        ) : null}

        <Input
          label="Titel"
          value={titel}
          disabled={pending}
          placeholder="Optional"
          onChange={(e) => {
            setTitel(e.target.value)
            markDirty()
          }}
        />

        <Textarea
          label="Beschreibung"
          rows={3}
          plain
          value={beschreibung}
          disabled={pending}
          placeholder="Optional"
          onChange={(e) => {
            setBeschreibung(e.target.value)
            markDirty()
          }}
          hint="Optional — z. B. Versicherungsnummer oder Hinweise."
        />

        {existing ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {existing.datei_url ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() => void openDatei()}
              >
                <ActionIcon n="eye" size={14} />
                Ansehen
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-status-cancel-text"
              disabled={pending}
              onClick={removeDoc}
            >
              <ActionIcon n="trash" size={14} />
              Löschen
            </Button>
          </div>
        ) : null}
      </div>
    </EditorSheet>
  )
}
