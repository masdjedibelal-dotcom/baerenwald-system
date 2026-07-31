'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { ActionIcon } from '@/components/ui/ActionIcon'
import { toast } from '@/components/ui/app-toast'
import { addLeadNotizRow } from '@/app/(dashboard)/anfragen/actions'
import { insertLeadDokument } from '@/app/(dashboard)/anfragen/dokumente-actions'
import { updateAuftragNotizen } from '@/app/(dashboard)/auftraege/actions'
import { createAuftragDokumentEintrag } from '@/app/(dashboard)/auftraege/dokumente-actions'
import { addKundenNotiz } from '@/app/actions/kunden'
import { insertKundeDokument } from '@/app/(dashboard)/kunden/dokumente-actions'
import {
  insertPartnerDokument,
  updateHandwerkerNotizen,
} from '@/app/(dashboard)/handwerker/actions'
import { INDIVIDUELL_TYP_SLUG } from '@/lib/handwerker/compliance-katalog'
import { createClient } from '@/lib/supabase'
import type { QuickBarAction } from '@/components/vorgang/DetailQuickBar'

const DOC_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp'

const PARTNER_DOCS_BUCKET = 'partner-dokumente'

function telHref(raw: string) {
  return `tel:${raw.replace(/\s/g, '')}`
}

function mailHref(raw: string) {
  return `mailto:${raw.trim()}`
}

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

export type DetailQuickNotizTarget =
  | { kind: 'lead'; leadId: string }
  | { kind: 'auftrag'; auftragId: string; initial?: string }
  | { kind: 'kunde'; kundeId: string }
  | { kind: 'handwerker'; handwerkerId: string; initial?: string }

export type DetailQuickDokumentTarget =
  | { kind: 'lead'; leadId: string }
  | { kind: 'auftrag'; auftragId: string }
  | { kind: 'kunde'; kundeId: string }
  | { kind: 'handwerker'; handwerkerId: string }

/**
 * Mobil-Schnellaktionen: Anrufen / Mail / Notiz-Sheet / Dokument-Upload — ohne Tab-Wechsel.
 */
export function useDetailQuickActions({
  telefon,
  email,
  notiz,
  dokument,
  onSaved,
}: {
  telefon?: string | null
  email?: string | null
  notiz?: DetailQuickNotizTarget | null
  dokument?: DetailQuickDokumentTarget | null
  onSaved?: () => void
}): { quickBar: QuickBarAction[]; sheets: ReactNode } {
  const [notizOpen, setNotizOpen] = useState(false)
  const [notizText, setNotizText] = useState('')
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!notizOpen) return
    if (notiz?.kind === 'auftrag') setNotizText(notiz.initial ?? '')
    else setNotizText('')
  }, [notizOpen, notiz])

  const openPhone = useCallback(() => {
    const t = telefon?.trim()
    if (!t) return
    window.location.href = telHref(t)
  }, [telefon])

  const openMail = useCallback(() => {
    const e = email?.trim()
    if (!e) return
    window.location.href = mailHref(e)
  }, [email])

  const saveNotiz = useCallback(() => {
    if (!notiz || pending) return
    const text = notizText.trim()
    if (!text) {
      toast.error('Bitte Notiz eingeben.')
      return
    }
    startTransition(async () => {
      if (notiz.kind === 'lead') {
        const r = await addLeadNotizRow(notiz.leadId, text)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      } else if (notiz.kind === 'kunde') {
        const r = await addKundenNotiz(notiz.kundeId, text)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      } else if (notiz.kind === 'handwerker') {
        const next = notiz.initial?.trim()
          ? `${notiz.initial.trim()}\n\n${text}`
          : text
        const r = await updateHandwerkerNotizen(notiz.handwerkerId, next)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      } else {
        const next = notiz.initial?.trim()
          ? `${notiz.initial.trim()}\n\n${text}`
          : text
        const r = await updateAuftragNotizen(notiz.auftragId, next)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      toast.success('Notiz gespeichert')
      setNotizOpen(false)
      setNotizText('')
      onSaved?.()
    })
  }, [notiz, notizText, onSaved, pending])

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!dokument) return
      const list = Array.from(files).slice(0, 5)
      if (!list.length) return
      setUploading(true)
      try {
        if (dokument.kind === 'lead') {
          for (const file of list) {
            const fd = new FormData()
            fd.set('file', file)
            fd.set('filename', file.name)
            const res = await fetch(`/api/anfragen/${dokument.leadId}/dokument/upload`, {
              method: 'POST',
              body: fd,
            })
            const json = (await res.json()) as {
              url?: string
              groesse_bytes?: number
              error?: string
            }
            if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
            const ins = await insertLeadDokument({
              leadId: dokument.leadId,
              name: file.name,
              datei_url: json.url,
              groesse_bytes: json.groesse_bytes ?? file.size,
            })
            if (!ins.ok) throw new Error(ins.message)
          }
        } else if (dokument.kind === 'kunde') {
          for (const file of list) {
            const fd = new FormData()
            fd.set('file', file)
            fd.set('filename', file.name)
            const res = await fetch(`/api/kunden/${dokument.kundeId}/dokument/upload`, {
              method: 'POST',
              body: fd,
            })
            const json = (await res.json()) as {
              url?: string
              groesse_bytes?: number
              error?: string
            }
            if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
            const ins = await insertKundeDokument({
              kundeId: dokument.kundeId,
              name: file.name,
              datei_url: json.url,
              groesse_bytes: json.groesse_bytes ?? file.size,
            })
            if (!ins.ok) throw new Error(ins.message)
          }
        } else if (dokument.kind === 'handwerker') {
          const supabase = createClient()
          for (const file of list) {
            const path = `${dokument.handwerkerId}/${INDIVIDUELL_TYP_SLUG}-${Date.now()}-${safeFileName(file.name)}`
            const { error: upErr } = await supabase.storage
              .from(PARTNER_DOCS_BUCKET)
              .upload(path, file, {
                upsert: false,
                contentType: file.type || undefined,
              })
            if (upErr) throw new Error(upErr.message)
            const ins = await insertPartnerDokument({
              handwerker_id: dokument.handwerkerId,
              auftrag_id: null,
              typ: INDIVIDUELL_TYP_SLUG,
              bezeichnung: file.name,
              gueltig_bis: null,
              datei_url: path,
              notizen: null,
            })
            if (!ins.ok) {
              await supabase.storage.from(PARTNER_DOCS_BUCKET).remove([path])
              throw new Error(ins.message)
            }
          }
        } else {
          const urls: string[] = []
          for (const file of list) {
            const fd = new FormData()
            fd.set('file', file)
            fd.set('filename', file.name)
            const res = await fetch(
              `/api/auftraege/${dokument.auftragId}/timeline-foto/upload`,
              { method: 'POST', body: fd }
            )
            const json = (await res.json()) as { url?: string; error?: string }
            if (!res.ok || !json.url) throw new Error(json.error ?? 'Upload fehlgeschlagen')
            urls.push(json.url)
          }
          const name = list.length === 1 ? list[0]!.name : `${list.length} Dateien`
          const r = await createAuftragDokumentEintrag({
            auftragId: dokument.auftragId,
            titel: name,
            beschreibung: null,
            foto_urls: urls,
            fuerKunde: false,
          })
          if (!r.ok) throw new Error(r.message)
        }
        toast.success(
          list.length === 1 ? 'Dokument hochgeladen' : `${list.length} Dokumente hochgeladen`
        )
        onSaved?.()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
      } finally {
        setUploading(false)
        if (fileRef.current) fileRef.current.value = ''
      }
    },
    [dokument, onSaved]
  )

  const quickBar: QuickBarAction[] = [
    {
      id: 'call',
      label: 'Anrufen',
      icon: 'phone',
      disabled: !telefon?.trim(),
      onClick: openPhone,
    },
    {
      id: 'mail',
      label: 'Mail',
      icon: 'mail',
      disabled: !email?.trim(),
      onClick: openMail,
    },
    {
      id: 'notiz',
      label: 'Notiz',
      icon: 'messages',
      disabled: !notiz,
      onClick: () => setNotizOpen(true),
    },
    {
      id: 'dokument',
      label: 'Dokument',
      icon: 'files',
      disabled: !dokument || uploading,
      onClick: () => fileRef.current?.click(),
    },
  ]

  const sheets = (
    <>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={DOC_ACCEPT}
        className="hidden"
        disabled={!dokument || uploading}
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files)
        }}
      />

      <EditorSheet
        open={notizOpen}
        onClose={() => {
          if (pending) return
          setNotizOpen(false)
        }}
        title="Notiz schreiben"
        size="md"
        dirty={notizText.trim().length > 0}
        footer={
          <div className="phase-sheet-footer">
            <button
              type="button"
              className="btn secondary"
              disabled={pending}
              onClick={() => setNotizOpen(false)}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={pending || !notizText.trim()}
              onClick={saveNotiz}
            >
              <ActionIcon n="check" size={14} />
              Speichern
            </button>
          </div>
        }
      >
        <label className="field">
          <span>Notiz</span>
          <textarea
            className="input"
            rows={6}
            value={notizText}
            onChange={(e) => setNotizText(e.target.value)}
            placeholder="Kurz notieren…"
            autoFocus
            disabled={pending}
          />
        </label>
      </EditorSheet>
    </>
  )

  return { quickBar, sheets }
}
