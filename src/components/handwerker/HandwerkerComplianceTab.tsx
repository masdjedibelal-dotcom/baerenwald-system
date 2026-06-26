'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, FileText, Trash2, Upload } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'
import { RAHMENVERTRAG_TYP_SLUG, rahmenvertragErfuellt } from '@/lib/handwerker/compliance-vertrag-status'
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
  complianceAblaufHinweis,
  COMPLIANCE_EBENE_LABELS,
  partnerHatMeisterGewerke,
  partnerLeistetBauleistung,
} from '@/lib/handwerker/compliance-partner-profile'
import {
  complianceDokumentStatus,
  dokumentFuerTyp,
  filterPartnerComplianceTypen,
  gruppeComplianceTypen,
  istPflichtTyp,
  standardDokumente,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { Gewerk } from '@/lib/types'
import {
  partnerDokumentIstFreigegeben,
  partnerDokumentStatusLabel,
} from '@/lib/handwerker/partner-dokument-status'
import { cn } from '@/lib/utils'

const BUCKET = 'partner-dokumente'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function statusLabel(s: ComplianceDokumentStatus): string {
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

export function HandwerkerComplianceTab({
  handwerkerId,
  handwerkerGewerke,
  gewerke = [],
  dokumente,
  complianceTypen,
  rahmenVertrag = null,
}: {
  handwerkerId: string
  handwerkerGewerke: string[]
  gewerke?: Gewerk[]
  dokumente: PartnerDokument[]
  complianceTypen: ComplianceDokumentTyp[]
  rahmenVertrag?: HandwerkerVertragRow | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploadingTyp, setUploadingTyp] = useState<string | null>(null)
  const typRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const profil = useMemo(
    () => ({
      bau: partnerLeistetBauleistung(handwerkerGewerke, gewerke),
      meister: partnerHatMeisterGewerke(handwerkerGewerke, gewerke),
    }),
    [handwerkerGewerke, gewerke]
  )

  const ebenen = useMemo(
    () =>
      (['allgemein', 'meister'] as const)
        .map((ebene) => ({
          ebene,
          label: COMPLIANCE_EBENE_LABELS[ebene],
          typen: filterPartnerComplianceTypen(
            complianceTypen,
            ebene,
            handwerkerGewerke,
            gewerke
          ),
        }))
        .filter((e) => e.typen.length > 0),
    [complianceTypen, handwerkerGewerke, gewerke]
  )
  const standardDocs = useMemo(() => standardDokumente(dokumente), [dokumente])

  async function openDatei(stored: string | null | undefined, fallbackUrl?: string | null) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      if (fallbackUrl?.trim()) {
        window.open(fallbackUrl.trim(), '_blank', 'noopener,noreferrer')
        return
      }
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
      else router.refresh()
    })
  }

  function freigeben(docId: string) {
    startTransition(async () => {
      const r = await freigebenPartnerDokument(docId, handwerkerId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Dokument bestätigt — Partner sieht den Status im Portal.')
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
        toast.success('Abgelehnt — Partner kann neu hochladen.')
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

  const busy = pending || uploadingTyp != null

  return (
    <div className="space-y-6 pb-4">
      <p className="text-sm text-bw-text-muted">
        Stamm-Unterlagen pflegt der Partner im Portal. Leistungsbezogene Anlagen (Leistungsvertrag)
        erscheinen je Auftrag unter Tab „Aufträge“ bzw. Auftrag → Dokumente.
      </p>
      <p className="text-xs text-bw-text-muted">
        Profil: {profil.bau ? 'Bauleistungen' : 'keine Bau-Gewerke'}
        {profil.meister ? ' · Meister/Fachbetrieb' : ''}
      </p>

      {ebenen.map(({ ebene, label, typen }) => {
        const gruppen = gruppeComplianceTypen(typen)
        return (
        <section key={ebene} className="space-y-3">
          <h2 className="text-sm font-semibold text-bw-text">{label}</h2>
          {gruppen.map((gruppe) => (
        <div key={`${ebene}-${gruppe.kategorie}`} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{gruppe.kategorie}</h3>
          <div className="overflow-hidden rounded-xl border border-bw-border">
            <ul className="divide-y divide-bw-border">
              {gruppe.typen.map((typ) => {
                const doc = dokumentFuerTyp(standardDocs, typ.slug)
                const rvOk =
                  typ.slug === RAHMENVERTRAG_TYP_SLUG &&
                  rahmenvertragErfuellt(standardDocs, rahmenVertrag)
                const status = rvOk ? 'ok' : complianceDokumentStatus(typ, doc)
                const rvPdf = rahmenVertrag?.pdf_url?.trim()
                const pflicht = istPflichtTyp(typ, {
                  handwerkerGewerke,
                  alleGewerke: gewerke,
                })
                const ablaufHinweis = complianceAblaufHinweis(status, doc?.gueltig_bis)
                const uploading = uploadingTyp === typ.slug

                return (
                  <li
                    key={typ.id}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <StatusIcon status={status} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-bw-text">
                            {typ.bezeichnung}
                            {pflicht ? (
                              <span className="ml-2 rounded bg-bw-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-bw-primary">
                                Pflicht
                              </span>
                            ) : null}
                          </p>
                          {typ.beschreibung ? (
                            <p className="mt-0.5 text-xs text-bw-text-muted line-clamp-2">
                              {typ.beschreibung}
                            </p>
                          ) : null}
                          {typ.vertrag_referenz ? (
                            <p className="mt-0.5 text-[11px] text-bw-text-muted">
                              Vertrag: {typ.vertrag_referenz}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[11px] text-bw-text-muted">{statusLabel(status)}</p>
                          {doc?.status ? (
                            <span
                              className={cn(
                                'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                partnerDokumentIstFreigegeben(doc.status)
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : (doc.status ?? '').toLowerCase() === 'abgelehnt'
                                    ? 'border-red-200 bg-red-50 text-red-800'
                                    : 'border-amber-200 bg-amber-50 text-amber-900'
                              )}
                            >
                              {partnerDokumentStatusLabel(doc.status)}
                            </span>
                          ) : null}
                          {doc?.status === 'abgelehnt' && doc.ablehnung_grund ? (
                            <p className="mt-1 text-[11px] text-status-cancel-text">{doc.ablehnung_grund}</p>
                          ) : null}
                          {ablaufHinweis ? (
                            <p className="mt-0.5 text-[11px] font-medium text-amber-800">{ablaufHinweis}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      {rvOk && rvPdf && !doc ? (
                        <a
                          href={rvPdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-bw-link hover:underline"
                        >
                          RV-PDF öffnen
                        </a>
                      ) : null}
                      {doc ? (
                        <>
                          <label className="flex items-center gap-1.5 text-xs text-bw-text-muted">
                            Gültig bis
                            <input
                              type="date"
                              className="input py-1 text-xs"
                              defaultValue={
                                doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''
                              }
                              key={`${doc.id}-${doc.gueltig_bis ?? ''}`}
                              disabled={busy}
                              onBlur={(e) => {
                                const v = e.target.value
                                const cur = doc.gueltig_bis
                                  ? String(doc.gueltig_bis).slice(0, 10)
                                  : ''
                                if (v === cur) return
                                saveGueltigBis(doc.id, v)
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-bw-border bg-bw-card text-[#c62828]"
                            title="Öffnen"
                            disabled={busy}
                            onClick={() =>
                              void openDatei(
                                doc.datei_url,
                                typ.slug === RAHMENVERTRAG_TYP_SLUG ? rvPdf : null
                              )
                            }
                          >
                            <FileText className="h-4 w-4" aria-hidden />
                          </button>
                          {doc.status && !partnerDokumentIstFreigegeben(doc.status) ? (
                            <>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                className="h-9 gap-1 px-2 text-xs"
                                disabled={busy}
                                onClick={() => freigeben(doc.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Bestätigen
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-9 text-xs text-status-cancel-text"
                                disabled={busy}
                                onClick={() => ablehnen(doc.id, typ.bezeichnung)}
                              >
                                Ablehnen
                              </Button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="icon-btn text-status-cancel-text hover:bg-red-500/10"
                            title="Löschen"
                            disabled={busy}
                            onClick={() => removeDoc(doc.id, typ.bezeichnung)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
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
                        className="btn btn-sm btn-secondary inline-flex items-center gap-1.5"
                        disabled={busy}
                        onClick={() => typRefs.current[typ.slug]?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden />
                        {uploading ? 'Lädt…' : doc ? 'Ersetzen' : 'Hochladen'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
          ))}
        </section>
        )
      })}
    </div>
  )
}
