'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
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

function SheetFooter({
  pending,
  canSave,
  existing,
  onSave,
  onView,
  onDelete,
}: {
  pending: boolean
  canSave: boolean
  existing: PartnerDokument | null
  onSave: () => void
  onView: () => void
  onDelete: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="ldr-cta" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" loading={pending} disabled={!canSave} onClick={onSave}>
          ✓ Speichern
        </Button>
        {existing?.datei_url ? (
          <Button type="button" variant="secondary" disabled={pending} onClick={onView}>
            <ActionIcon n="eye" size={14} />
            Ansehen
          </Button>
        ) : null}
        {existing ? (
          <Button
            type="button"
            variant="ghost"
            className="text-status-cancel-text"
            disabled={pending}
            onClick={onDelete}
          >
            <ActionIcon n="trash" size={14} />
            Löschen
          </Button>
        ) : null}
      </div>
      <Button type="button" variant="secondary" onClick={() => requestClose?.()} disabled={pending}>
        Abbrechen
      </Button>
    </div>
  )
}

/**
 * Compliance-Unterlage hochladen / bearbeiten — EditorSheet Split-over.
 * Beim Neu-Upload optional Vorlage aus dem Katalog wählen oder leer lassen (eigene Unterlage).
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
  /** Neu-Upload: Vorlage wählbar oder leer = selbst hochladen */
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
      { value: '', label: 'Ohne Vorlage — selbst hochladen' },
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
      setTitel(existing.bezeichnung?.trim() || t.bezeichnung)
      setBeschreibung(existing.notizen?.trim() || t.beschreibung?.trim() || '')
      setGueltigBis(defaultGueltigBis(t, existing))
      return
    }

    setSelectedSlug(typ?.slug && typ.slug !== INDIVIDUELL_TYP_SLUG ? typ.slug : '')
    const initial = typ && typ.slug !== INDIVIDUELL_TYP_SLUG ? typ : EIGENE_UNTERLAGE
    setTitel(initial.bezeichnung === EIGENE_UNTERLAGE.bezeichnung ? '' : initial.bezeichnung)
    setBeschreibung(initial.beschreibung?.trim() || '')
    setGueltigBis(defaultGueltigBis(initial, null))
  }, [open, typ, existing, typen])

  useEffect(() => {
    if (!open || existing || !allowTypPick) return
    const t = selectedSlug
      ? typen.find((x) => x.slug === selectedSlug) ?? EIGENE_UNTERLAGE
      : EIGENE_UNTERLAGE
    setTitel(selectedSlug ? t.bezeichnung : '')
    setBeschreibung(t.beschreibung?.trim() || '')
    setGueltigBis(defaultGueltigBis(t, null))
  }, [selectedSlug, open, existing, allowTypPick, typen])

  const isEdit = Boolean(existing)
  const canSave = Boolean(effectiveTyp && titel.trim() && (isEdit || file || existing?.datei_url))

  function markDirty() {
    setDirty(true)
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
    if (!effectiveTyp || !titel.trim()) {
      toast.error('Bitte Titel angeben.')
      return
    }
    if (!isEdit && !file) {
      toast.error('Bitte eine Datei auswählen.')
      return
    }

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
            bezeichnung: titel.trim(),
            gueltig_bis: gueltigBis.trim() || null,
            datei_url: path,
            notizen: beschreibung.trim() || null,
            mehrfach,
          })
          if (!ins.ok) {
            await supabase.storage.from(BUCKET).remove([path])
            throw new Error(ins.message)
          }
          toast.success(isEdit ? 'Unterlage aktualisiert' : `${effectiveTyp.bezeichnung} hochgeladen`)
        } else if (existing) {
          const r = await updatePartnerDokument(existing.id, handwerkerId, {
            bezeichnung: titel.trim(),
            gueltig_bis: gueltigBis.trim() || null,
            notizen: beschreibung.trim() || null,
          })
          if (!r.ok) throw new Error(r.message)
          toast.success('Unterlage gespeichert')
        } else {
          toast.error('Bitte eine Datei auswählen.')
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

  const crumbLabel = allowTypPick && !existing
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
      footer={
        <SheetFooter
          pending={pending}
          canSave={canSave}
          existing={existing}
          onSave={speichern}
          onView={() => void openDatei()}
          onDelete={removeDoc}
        />
      }
    >
      <div className="space-y-4">
        {partnerHint ? (
          <p className="m-0 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-[length:var(--fs-meta)] text-bw-text-muted">
            {partnerHint}
            {existing?.hochgeladen_am
              ? ` · ${String(existing.hochgeladen_am).slice(0, 10)}`
              : null}
          </p>
        ) : (
          <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
            Optional Vorlage wählen oder leer lassen und eigene Datei hochladen.
          </p>
        )}

        {allowTypPick && !existing ? (
          <Select
            label="Vorlage"
            value={selectedSlug}
            options={pickOptions}
            disabled={pending}
            onChange={(e) => {
              setSelectedSlug(e.target.value)
              markDirty()
            }}
            hint="Aus dem Katalog oder ohne Vorlage selbst hochladen."
          />
        ) : null}

        {effectiveTyp?.beschreibung && selectedSlug ? (
          <p className="m-0 rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-[length:var(--fs-meta)] text-bw-text-muted">
            {effectiveTyp.beschreibung}
          </p>
        ) : null}

        <div className="form-field">
          <label className="form-field-label">
            Datei {!isEdit ? <span aria-hidden>*</span> : null}
          </label>
          {existing?.datei_url && !file ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button type="button" className="btn ghost sm" onClick={() => void openDatei()}>
                <ActionIcon n="file" size={14} />
                Aktuelle Datei öffnen
              </button>
              <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                oder neue Datei wählen zum Ersetzen
              </span>
            </div>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            className="input"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            disabled={pending}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              markDirty()
            }}
          />
          {file ? (
            <p className="mt-1 text-[length:var(--fs-meta)] text-bw-text-muted">{file.name}</p>
          ) : null}
        </div>

        <Input
          label="Titel"
          value={titel}
          required
          disabled={pending}
          onChange={(e) => {
            setTitel(e.target.value)
            markDirty()
          }}
        />

        <Textarea
          label="Beschreibung"
          rows={4}
          plain
          value={beschreibung}
          disabled={pending}
          onChange={(e) => {
            setBeschreibung(e.target.value)
            markDirty()
          }}
          hint="Optional — z. B. Versicherungsnummer, Hinweise zur Prüfung."
        />

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
      </div>
    </EditorSheet>
  )
}
