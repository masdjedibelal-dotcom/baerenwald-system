'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import {
  deletePartnerDokument,
  replacePartnerDokumentForTyp,
  signPartnerDokumentUrl,
  updatePartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import { createClient } from '@/lib/supabase'
import {
  complianceDokumentStatus,
  dokumentFuerTyp,
  standardDokumente,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { cn } from '@/lib/utils'

const BUCKET = 'partner-dokumente'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function statusMeta(status: ComplianceDokumentStatus): {
  label: string
  tone: 'ok' | 'warn' | 'bad'
} {
  if (status === 'ok') return { label: 'Vorhanden', tone: 'ok' }
  if (status === 'warnung') return { label: 'Läuft bald ab', tone: 'warn' }
  if (status === 'abgelaufen') return { label: 'Abgelaufen', tone: 'bad' }
  return { label: 'Fehlt', tone: 'bad' }
}

export function HandwerkerComplianceUnterlagenTable({
  handwerkerId,
  dokumente,
  typen,
}: {
  handwerkerId: string
  dokumente: PartnerDokument[]
  typen: ComplianceDokumentTyp[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploadingTyp, setUploadingTyp] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const standardDocs = useMemo(() => standardDokumente(dokumente), [dokumente])
  const busy = pending || uploadingTyp != null

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
  }

  async function uploadForTyp(typ: ComplianceDokumentTyp, file: File) {
    setUploadingTyp(typ.slug)
    const supabase = createClient()
    try {
      const path = `${handwerkerId}/${typ.slug}-${Date.now()}-${safeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      })
      if (upErr) throw new Error(upErr.message)

      const existing = dokumentFuerTyp(standardDocs, typ.slug)
      let gueltigBis: string | null = existing?.gueltig_bis ?? null
      if (typ.erneuerung_monate && typ.erneuerung_monate > 0) {
        const d = new Date()
        d.setMonth(d.getMonth() + typ.erneuerung_monate)
        gueltigBis = d.toISOString().slice(0, 10)
      }

      const ins = await replacePartnerDokumentForTyp({
        handwerker_id: handwerkerId,
        auftrag_id: null,
        typ: typ.slug,
        bezeichnung: typ.bezeichnung,
        gueltig_bis: gueltigBis,
        datei_url: path,
      })
      if (!ins.ok) {
        await supabase.storage.from(BUCKET).remove([path])
        throw new Error(ins.message)
      }
      toast.success(`${typ.bezeichnung} hochgeladen`)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload fehlgeschlagen')
    } finally {
      setUploadingTyp(null)
    }
  }

  function saveGueltigBis(docId: string, value: string) {
    startTransition(async () => {
      const r = await updatePartnerDokument(docId, handwerkerId, {
        gueltig_bis: value.trim() || null,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gültigkeit gespeichert')
        router.refresh()
      }
    })
  }

  function removeDoc(docId: string, titel: string) {
    if (!confirm(`„${titel}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deletePartnerDokument(docId, handwerkerId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gelöscht')
        router.refresh()
      }
    })
  }

  if (typen.length === 0) {
    return (
      <p className="text-[13px] text-[var(--text-3)]">Keine Compliance-Typen konfiguriert.</p>
    )
  }

  return (
    <div className="hw-compliance-table-wrap">
      <table className="hw-compliance-table">
        <thead>
          <tr>
            <th>Unterlage</th>
            <th>Status</th>
            <th>Gültig bis</th>
            <th className="hw-compliance-actions-h">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {typen.map((typ) => {
            const doc = dokumentFuerTyp(standardDocs, typ.slug, {
              handwerkerId,
              auftragId: null,
            })
            const st = complianceDokumentStatus(typ, doc)
            const meta = statusMeta(st)
            const uploading = uploadingTyp === typ.slug

            return (
              <tr key={typ.id}>
                <td>
                  <div className="hw-compliance-name">{typ.bezeichnung}</div>
                  {typ.beschreibung ? (
                    <div className="hw-compliance-desc">{typ.beschreibung}</div>
                  ) : null}
                </td>
                <td>
                  <span
                    className={cn(
                      'hw-compliance-status',
                      meta.tone === 'ok' && 'is-ok',
                      meta.tone === 'warn' && 'is-warn',
                      meta.tone === 'bad' && 'is-bad'
                    )}
                  >
                    {meta.label}
                  </span>
                </td>
                <td>
                  {doc ? (
                    <input
                      type="date"
                      className="input hw-compliance-date"
                      defaultValue={doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''}
                      key={`${doc.id}-${doc.gueltig_bis ?? ''}`}
                      disabled={busy}
                      aria-label={`Gültig bis · ${typ.bezeichnung}`}
                      onBlur={(e) => {
                        const v = e.target.value
                        const cur = doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''
                        if (v === cur) return
                        saveGueltigBis(doc.id, v)
                      }}
                    />
                  ) : (
                    <span className="hw-compliance-muted">—</span>
                  )}
                </td>
                <td>
                  <div className="hw-compliance-actions">
                    <input
                      ref={(el) => {
                        fileRefs.current[typ.slug] = el
                      }}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) void uploadForTyp(typ, f)
                        e.target.value = ''
                      }}
                    />
                    {doc ? (
                      <>
                        <button
                          type="button"
                          className="btn ghost sm"
                          disabled={busy}
                          onClick={() => void openDatei(doc.datei_url)}
                        >
                          <MockIcon ctx="btn" n="eye" size={14} />
                          Ansehen
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm"
                          disabled={busy}
                          onClick={() => fileRefs.current[typ.slug]?.click()}
                        >
                          <MockIcon ctx="btn" n="arrows-exchange" size={14} />
                          {uploading ? 'Lädt…' : 'Ersetzen'}
                        </button>
                        <button
                          type="button"
                          className="btn ghost sm hw-compliance-danger"
                          disabled={busy}
                          onClick={() => removeDoc(doc.id, typ.bezeichnung)}
                        >
                          <MockIcon ctx="btn" n="trash" size={14} />
                          Löschen
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn ghost sm"
                        disabled={busy}
                        onClick={() => fileRefs.current[typ.slug]?.click()}
                      >
                        <MockIcon ctx="btn" n="upload" size={14} />
                        {uploading ? 'Lädt…' : 'Hochladen'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
