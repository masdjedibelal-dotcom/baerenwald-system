'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, FileText, Trash2, Upload } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import {
  ablehnenPartnerDokument,
  deletePartnerDokument,
  freigebenPartnerDokument,
  replacePartnerDokumentForTyp,
  signPartnerDokumentUrl,
  updatePartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import {
  partnerDokumentIstFreigegeben,
  partnerDokumentStatusLabel,
} from '@/lib/handwerker/partner-dokument-status'
import { createClient } from '@/lib/supabase'
import { complianceAblaufHinweis, COMPLIANCE_EBENE_LABELS } from '@/lib/handwerker/compliance-partner-profile'
import {
  complianceDokumentStatus,
  dokumenteFuerProjekt,
  dokumenteFuerTyp,
  dokumentFuerTyp,
  filterProjektComplianceTypen,
  gruppeComplianceTypen,
  INDIVIDUELL_TYP_SLUG,
  individuellTyp,
  isStandardScope,
  istPflichtTyp,
  projektChecklisteFortschritt,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { Gewerk } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

const BUCKET = 'partner-dokumente'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function statusLabel(s: ComplianceDokumentStatus, docStatus?: string | null): string {
  if (docStatus && !partnerDokumentIstFreigegeben(docStatus)) {
    return partnerDokumentStatusLabel(docStatus)
  }
  if (s === 'ok') return 'Vorhanden'
  if (s === 'warnung') return 'Läuft bald ab'
  if (s === 'abgelaufen') return 'Abgelaufen'
  return 'Fehlt'
}

function StatusIcon({ status }: { status: ComplianceDokumentStatus }) {
  if (status === 'ok') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
  }
  return (
    <AlertCircle
      className={cn(
        'h-4 w-4 shrink-0',
        status === 'warnung' ? 'text-amber-600' : 'text-status-cancel-text'
      )}
      aria-hidden
    />
  )
}

export function ProjektComplianceCheckliste({
  handwerkerId,
  handwerkerName,
  auftragId,
  auftragTitel,
  dokumente,
  complianceTypen,
  handwerkerGewerke = [],
  projektGewerkSlugs = [],
  gewerke = [],
  istBauprojekt = null,
  compact = false,
  showAuftragLink = false,
}: {
  handwerkerId: string
  handwerkerName?: string | null
  auftragId: string
  auftragTitel?: string | null
  dokumente: PartnerDokument[]
  complianceTypen: ComplianceDokumentTyp[]
  handwerkerGewerke?: string[]
  projektGewerkSlugs?: string[]
  gewerke?: Gewerk[]
  istBauprojekt?: boolean | null
  compact?: boolean
  showAuftragLink?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploadingTyp, setUploadingTyp] = useState<string | null>(null)
  const [freierTyp, setFreierTyp] = useState('')
  const [individuellTitel, setIndividuellTitel] = useState('')
  const typRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const freiRef = useRef<HTMLInputElement>(null)
  const individuellRef = useRef<HTMLInputElement>(null)

  const projektTypen = useMemo(
    () =>
      filterProjektComplianceTypen(
        complianceTypen,
        projektGewerkSlugs,
        handwerkerGewerke,
        gewerke,
        istBauprojekt
      ),
    [complianceTypen, projektGewerkSlugs, handwerkerGewerke, gewerke, istBauprojekt]
  )
  const gruppen = useMemo(() => gruppeComplianceTypen(projektTypen), [projektTypen])
  const projektDocs = useMemo(
    () => dokumenteFuerProjekt(dokumente, handwerkerId, auftragId),
    [dokumente, handwerkerId, auftragId]
  )
  const fortschritt = useMemo(
    () =>
      projektChecklisteFortschritt(
        complianceTypen,
        dokumente,
        handwerkerId,
        auftragId,
        projektGewerkSlugs,
        handwerkerGewerke,
        gewerke,
        istBauprojekt
      ),
    [
      complianceTypen,
      dokumente,
      handwerkerId,
      auftragId,
      projektGewerkSlugs,
      handwerkerGewerke,
      gewerke,
      istBauprojekt,
    ]
  )
  const indTyp = useMemo(() => individuellTyp(complianceTypen), [complianceTypen])
  const individuelleDocs = useMemo(
    () => dokumenteFuerTyp(projektDocs, INDIVIDUELL_TYP_SLUG, handwerkerId, auftragId),
    [projektDocs, handwerkerId, auftragId]
  )
  const alleProjektTypen = useMemo(
    () => complianceTypen.filter((t) => t.aktiv !== false && !isStandardScope(t)),
    [complianceTypen]
  )

  function freigeben(docId: string) {
    startTransition(async () => {
      const r = await freigebenPartnerDokument(docId, handwerkerId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Dokument bestätigt')
        router.refresh()
      }
    })
  }

  function ablehnen(docId: string, titel: string) {
    const grund = window.prompt(`Ablehnungsgrund für „${titel}":`)
    if (grund == null) return
    startTransition(async () => {
      const r = await ablehnenPartnerDokument(docId, handwerkerId, grund)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Abgelehnt — Partner kann neu hochladen')
        router.refresh()
      }
    })
  }

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
  }

  async function uploadForTyp(typ: ComplianceDokumentTyp, file: File, customBezeichnung?: string) {
    setUploadingTyp(typ.slug)
    const supabase = createClient()
    try {
      const path = `${handwerkerId}/${auftragId}/${typ.slug}-${Date.now()}-${safeFileName(file.name)}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      })
      if (upErr) throw new Error(upErr.message)

      const existing = dokumentFuerTyp(projektDocs, typ.slug)
      let gueltigBis: string | null = existing?.gueltig_bis ?? null
      if (typ.erneuerung_monate && typ.erneuerung_monate > 0) {
        const d = new Date()
        d.setMonth(d.getMonth() + typ.erneuerung_monate)
        gueltigBis = d.toISOString().slice(0, 10)
      }

      const ins = await replacePartnerDokumentForTyp({
        handwerker_id: handwerkerId,
        auftrag_id: auftragId,
        typ: typ.slug,
        bezeichnung: customBezeichnung?.trim() || typ.bezeichnung,
        gueltig_bis: gueltigBis,
        datei_url: path,
        mehrfach: typ.mehrfach_erlaubt,
      })
      if (!ins.ok) {
        await supabase.storage.from(BUCKET).remove([path])
        throw new Error(ins.message)
      }
      toast.success(`${customBezeichnung?.trim() || typ.bezeichnung} hochgeladen`)
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
      else router.refresh()
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

  const busy = pending || uploadingTyp != null
  const pflichtOk = fortschritt.pflicht === 0 || fortschritt.erfuellt >= fortschritt.pflicht

  return (
    <div className={cn('space-y-3', compact && 'text-sm')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          {handwerkerName ? (
            <p className="font-medium text-bw-text">{handwerkerName}</p>
          ) : null}
          {auftragTitel && !compact ? (
            <p className="text-xs text-bw-text-muted">{auftragTitel}</p>
          ) : null}
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              pflichtOk ? 'text-emerald-700' : 'text-status-cancel-text'
            )}
          >
            {fortschritt.pflicht > 0
              ? `${fortschritt.erfuellt}/${fortschritt.pflicht} Pflichtnachweise · ${fortschritt.gesamt}/${projektTypen.length} gesamt`
              : `${fortschritt.gesamt}/${projektTypen.length} Nachweise hochgeladen`}
          </p>
          {!compact ? (
            <p className="mt-1 text-[11px] text-bw-text-muted">
              {COMPLIANCE_EBENE_LABELS.leistung} — Anlagen zum Leistungsvertrag. Rahmen- und
              Projektvertrag im Portal unter Verträge.
            </p>
          ) : null}
        </div>
        {showAuftragLink ? (
          <Link href={`/auftraege/${auftragId}#compliance`} className="text-xs text-bw-link hover:underline">
            Im Auftrag öffnen
          </Link>
        ) : null}
      </div>

      {gruppen.map((gruppe) => (
        <div key={gruppe.kategorie} className="space-y-1.5">
          {!compact ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
              {gruppe.kategorie}
            </p>
          ) : null}
          <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
            {gruppe.typen.map((typ) => {
              const doc = dokumentFuerTyp(projektDocs, typ.slug)
              const status = complianceDokumentStatus(typ, doc)
              const pflicht = istPflichtTyp(typ, {
                projektKontext: true,
                projektGewerkSlugs,
                handwerkerGewerke,
                alleGewerke: gewerke,
                istBauprojekt,
              })
              const ablaufHinweis = complianceAblaufHinweis(status, doc?.gueltig_bis)
              const uploading = uploadingTyp === typ.slug

              return (
                <li
                  key={typ.id}
                  className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <StatusIcon status={status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-bw-text">
                        {typ.bezeichnung}
                        {pflicht ? (
                          <span className="ml-1.5 text-[10px] font-semibold uppercase text-bw-primary">
                            Pflicht
                          </span>
                        ) : null}
                      </p>
                      {!compact && typ.beschreibung ? (
                        <p className="text-xs text-bw-text-muted line-clamp-1">{typ.beschreibung}</p>
                      ) : null}
                      <p className="text-[11px] text-bw-text-muted">
                        {statusLabel(status, doc?.status)}
                        {doc?.status === 'abgelehnt' && doc.ablehnung_grund ? (
                          <span className="block text-status-cancel-text">{doc.ablehnung_grund}</span>
                        ) : null}
                      </p>
                      {ablaufHinweis ? (
                        <p className="text-[11px] font-medium text-amber-800">{ablaufHinweis}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
                    {doc ? (
                      <>
                        {doc.status && !partnerDokumentIstFreigegeben(doc.status) ? (
                          <>
                            <button
                              type="button"
                              className="btn-primary py-1 text-xs"
                              disabled={busy}
                              onClick={() => freigeben(doc.id)}
                            >
                              Bestätigen
                            </button>
                            <button
                              type="button"
                              className="btn-secondary py-1 text-xs"
                              disabled={busy}
                              onClick={() => ablehnen(doc.id, typ.bezeichnung)}
                            >
                              Ablehnen
                            </button>
                          </>
                        ) : null}
                        <input
                          type="date"
                          className="input py-1 text-xs w-[8.5rem]"
                          defaultValue={doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''}
                          key={`${doc.id}-${doc.gueltig_bis ?? ''}`}
                          disabled={busy}
                          onBlur={(e) => {
                            const v = e.target.value
                            const cur = doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''
                            if (v !== cur) saveGueltigBis(doc.id, v)
                          }}
                          title="Gültig bis"
                        />
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-bw-border"
                          disabled={busy}
                          onClick={() => void openDatei(doc.datei_url)}
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="icon-btn text-status-cancel-text"
                          disabled={busy}
                          onClick={() => removeDoc(doc.id, typ.bezeichnung)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </>
                    ) : null}
                    <input
                      ref={(el) => {
                        typRefs.current[typ.slug] = el
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
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary inline-flex items-center gap-1"
                      disabled={busy}
                      onClick={() => typRefs.current[typ.slug]?.click()}
                    >
                      <Upload className="h-3 w-3" aria-hidden />
                      {uploading ? '…' : doc ? 'Ersetzen' : 'Hochladen'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {indTyp ? (
        <div className="space-y-2 rounded-lg border border-dashed border-bw-border p-2.5">
          <p className="text-sm font-medium text-bw-text">{indTyp.bezeichnung}</p>
          <p className="text-xs text-bw-text-muted">
            {indTyp.beschreibung ?? 'Frei benennbarer Nachweis — mehrere Dateien möglich.'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="input-label text-xs" htmlFor={`ind-bez-${auftragId}`}>
                Bezeichnung
              </label>
              <input
                id={`ind-bez-${auftragId}`}
                type="text"
                className="input w-full py-1.5 text-sm"
                value={individuellTitel}
                onChange={(e) => setIndividuellTitel(e.target.value)}
                placeholder="z. B. SiGeKo-Unterweisung, Gerüstfreigabe…"
                disabled={busy}
              />
            </div>
            <input
              ref={individuellRef}
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  void uploadForTyp(
                    indTyp,
                    f,
                    individuellTitel.trim() || f.name.replace(/\.[^.]+$/, '')
                  )
                  setIndividuellTitel('')
                }
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={busy}
              onClick={() => individuellRef.current?.click()}
            >
              <Upload className="h-3 w-3 inline mr-1" aria-hidden />
              Individuell hochladen
            </button>
          </div>
          {individuelleDocs.length > 0 ? (
            <ul className="space-y-1 border-t border-bw-border pt-2">
              {individuelleDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-bw-text">
                    {d.bezeichnung}
                    {d.hochgeladen_am ? (
                      <span className="ml-1 text-bw-text-muted">· {formatDatum(d.hochgeladen_am)}</span>
                    ) : null}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => void openDatei(d.datei_url)}
                    >
                      <FileText className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="icon-btn text-status-cancel-text"
                      onClick={() => removeDoc(d.id, d.bezeichnung)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!compact ? (
        <div className="flex flex-col gap-2 rounded-lg border border-bw-border p-2.5 sm:flex-row sm:items-end">
          <div className="min-w-[12rem] flex-1">
            <label className="input-label text-xs">Weiterer Typ</label>
            <select
              className="input w-full py-1.5 text-sm"
              value={freierTyp}
              onChange={(e) => setFreierTyp(e.target.value)}
              disabled={busy}
            >
              <option value="">— Typ wählen —</option>
              {alleProjektTypen.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.bezeichnung}
                </option>
              ))}
            </select>
          </div>
          <input
            ref={freiRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => {
              const f = e.target.files?.[0]
              const meta = alleProjektTypen.find((t) => t.slug === freierTyp)
              if (f && meta) void uploadForTyp(meta, f)
              e.target.value = ''
              setFreierTyp('')
            }}
          />
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={busy || !freierTyp}
            onClick={() => freiRef.current?.click()}
          >
            Hochladen
          </button>
        </div>
      ) : null}
    </div>
  )
}
