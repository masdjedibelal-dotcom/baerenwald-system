'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { CheckCircle2, FileText, Trash2, Upload } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import type { AuftragCompliancePartner } from '@/lib/auftraege/auftrag-compliance-partners'
import type { ComplianceDokumentTyp, Gewerk, PartnerDokument } from '@/lib/types'
import {
  ablehnenPartnerDokument,
  deletePartnerDokument,
  freigebenPartnerDokument,
  replacePartnerDokumentForTyp,
  signPartnerDokumentUrl,
  updatePartnerDokument,
} from '@/app/(dashboard)/handwerker/actions'
import {
  leistungStatusBadgeClass,
  leistungStatusLabel,
  normalizeLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  partnerDokumentIstFreigegeben,
  partnerDokumentStatusLabel,
} from '@/lib/handwerker/partner-dokument-status'
import { createClient } from '@/lib/supabase'
import {
  complianceDokumentStatus,
  dokumenteFuerProjekt,
  dokumenteFuerTyp,
  dokumentFuerTyp,
  filterProjektComplianceTypen,
  INDIVIDUELL_TYP_SLUG,
  individuellTyp,
  istPflichtTyp,
  projektChecklisteFortschritt,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import { cn, formatDatum, formatPreis } from '@/lib/utils'

const BUCKET = 'partner-dokumente'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function complianceStatusPill(status: ComplianceDokumentStatus): string {
  if (status === 'ok') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (status === 'warnung') return 'bg-amber-50 text-amber-900 border-amber-200'
  if (status === 'abgelaufen') return 'bg-red-50 text-red-800 border-red-200'
  return 'bg-bw-bg-soft text-bw-text-muted border-bw-border'
}

function partnerDocStatusPill(status: string | null | undefined): string {
  if (partnerDokumentIstFreigegeben(status)) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if ((status ?? '').toLowerCase() === 'abgelehnt') return 'bg-red-50 text-red-800 border-red-200'
  return 'bg-amber-50 text-amber-900 border-amber-200'
}

export function AuftragPartnerCompliancePanel({
  partner,
  auftragId,
  dokumente,
  complianceTypen,
  projektGewerkSlugs,
  gewerke,
  istBauprojekt,
  onChanged,
}: {
  partner: AuftragCompliancePartner
  auftragId: string
  dokumente: PartnerDokument[]
  complianceTypen: ComplianceDokumentTyp[]
  projektGewerkSlugs: string[]
  gewerke: Gewerk[]
  istBauprojekt: boolean | null
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [uploadingTyp, setUploadingTyp] = useState<string | null>(null)
  const [individuellTitel, setIndividuellTitel] = useState('')
  const typRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const individuellRef = useRef<HTMLInputElement>(null)

  const handwerkerId = partner.handwerkerId
  const handwerkerGewerke = partner.gewerkSlugs

  const projektTypen = useMemo(() => {
    let typen = filterProjektComplianceTypen(
      complianceTypen,
      projektGewerkSlugs,
      handwerkerGewerke,
      gewerke,
      istBauprojekt
    )
    const crmSlugs = partner.compliancePflichtSlugs
    if (crmSlugs != null) {
      const slugSet = new Set(crmSlugs)
      typen = typen.filter((t) => slugSet.has(t.slug))
    }
    return typen
  }, [
    complianceTypen,
    projektGewerkSlugs,
    handwerkerGewerke,
    gewerke,
    istBauprojekt,
    partner.compliancePflichtSlugs,
  ])

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

  const offeneTypen = useMemo(() => {
    return projektTypen.filter((typ) => {
      if (typ.slug === INDIVIDUELL_TYP_SLUG) return false
      const doc = dokumentFuerTyp(projektDocs, typ.slug)
      const st = complianceDokumentStatus(typ, doc)
      return st === 'fehlend' || st === 'abgelaufen' || (doc && !partnerDokumentIstFreigegeben(doc.status))
    })
  }, [projektTypen, projektDocs])

  const hochgeladeneZeilen = useMemo(() => {
    const standard = projektTypen
      .filter((t) => t.slug !== INDIVIDUELL_TYP_SLUG)
      .map((typ) => {
        const doc = dokumentFuerTyp(projektDocs, typ.slug)
        if (!doc) return null
        return { typ, doc, key: doc.id }
      })
      .filter(Boolean) as { typ: ComplianceDokumentTyp; doc: PartnerDokument; key: string }[]

    const individuell = individuelleDocs.map((doc) => ({
      typ: indTyp,
      doc,
      key: doc.id,
    }))

    return [...standard, ...individuell.filter((r) => r.typ)]
  }, [projektTypen, projektDocs, individuelleDocs, indTyp])

  const busy = pending || uploadingTyp != null

  function freigeben(docId: string) {
    startTransition(async () => {
      const r = await freigebenPartnerDokument(docId, handwerkerId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Dokument bestätigt — Partner sieht den Status im Portal.')
        onChanged()
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
        onChanged()
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
      onChanged()
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
      else onChanged()
    })
  }

  function removeDoc(docId: string, titel: string) {
    if (!confirm(`„${titel}" wirklich löschen?`)) return
    startTransition(async () => {
      const r = await deletePartnerDokument(docId, handwerkerId)
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Gelöscht')
        onChanged()
      }
    })
  }

  const pflichtOk = fortschritt.pflicht === 0 || fortschritt.erfuellt >= fortschritt.pflicht

  return (
    <div className="space-y-5">
      {partner.leistungen.length > 0 ? (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
            Leistungen
          </h3>
          <div className="dok-table-wrap overflow-x-auto">
            <table className="dok-table text-sm">
              <thead>
                <tr>
                  <th>Leistung</th>
                  <th>Gewerk</th>
                  <th>Status</th>
                  <th className="text-right">VK</th>
                  <th>Zeitraum</th>
                </tr>
              </thead>
              <tbody>
                {partner.leistungen.map((pos) => {
                  const ls = normalizeLeistungStatus(pos.leistung_status)
                  return (
                    <tr key={pos.id}>
                      <td className="font-medium text-bw-text">{pos.leistung_name}</td>
                      <td className="text-bw-text-muted">{pos.gewerk_name}</td>
                      <td>
                        <span className={cn('leistung-status-badge', leistungStatusBadgeClass(ls))}>
                          {leistungStatusLabel(ls)}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">
                        {formatPreis(pos.preis_fix ?? null, null, null)}
                      </td>
                      <td className="whitespace-nowrap text-xs text-bw-text-muted">
                        {pos.start_datum ? formatDatum(pos.start_datum) : '—'}
                        {pos.end_datum ? ` → ${formatDatum(pos.end_datum)}` : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="text-sm text-bw-text-muted">Keine einzelnen Leistungen zugewiesen.</p>
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
            Erforderliche Nachweise
          </h3>
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium',
              pflichtOk ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'
            )}
          >
            {fortschritt.pflicht > 0
              ? `${fortschritt.erfuellt}/${fortschritt.pflicht} Pflicht erfüllt`
              : `${fortschritt.gesamt} Nachweise`}
          </span>
        </div>

        {offeneTypen.length === 0 ? (
          <p className="rounded-lg border border-bw-border bg-bw-bg-soft/40 px-3 py-2 text-sm text-bw-text-muted">
            Alle Pflichtnachweise sind hochgeladen und bestätigt.
          </p>
        ) : (
          <ul className="divide-y divide-bw-border rounded-lg border border-bw-border">
            {offeneTypen.map((typ) => {
              const doc = dokumentFuerTyp(projektDocs, typ.slug)
              const status = complianceDokumentStatus(typ, doc)
              const pflicht = istPflichtTyp(typ, {
                projektKontext: true,
                projektGewerkSlugs,
                handwerkerGewerke,
                alleGewerke: gewerke,
                istBauprojekt,
              })
              const uploading = uploadingTyp === typ.slug

              return (
                <li
                  key={typ.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bw-text">
                      {typ.bezeichnung}
                      {pflicht ? (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-bw-primary">
                          Pflicht
                        </span>
                      ) : null}
                    </p>
                    {typ.beschreibung ? (
                      <p className="text-xs text-bw-text-muted line-clamp-2">{typ.beschreibung}</p>
                    ) : null}
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        complianceStatusPill(status)
                      )}
                    >
                      {doc && !partnerDokumentIstFreigegeben(doc.status)
                        ? partnerDokumentStatusLabel(doc.status)
                        : status === 'fehlend'
                          ? 'Fehlt'
                          : status === 'abgelaufen'
                            ? 'Abgelaufen'
                            : 'Offen'}
                    </span>
                    {doc?.status === 'abgelehnt' && doc.ablehnung_grund ? (
                      <p className="mt-1 text-xs text-status-cancel-text">{doc.ablehnung_grund}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      disabled={busy}
                      onClick={() => typRefs.current[typ.slug]?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" aria-hidden />
                      {uploading ? '…' : doc ? 'Ersetzen' : 'Hochladen'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {indTyp ? (
          <div className="mt-3 space-y-2 rounded-lg border border-dashed border-bw-border p-3">
            <p className="text-sm font-medium text-bw-text">{indTyp.bezeichnung}</p>
            <p className="text-xs text-bw-text-muted">
              Frei benennbarer Nachweis — z. B. SiGeKo-Unterweisung, Gerüstfreigabe.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <input
                type="text"
                className="input flex-1 py-1.5 text-sm"
                value={individuellTitel}
                onChange={(e) => setIndividuellTitel(e.target.value)}
                placeholder="Bezeichnung des Nachweises"
                disabled={busy}
              />
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
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 gap-1 text-xs"
                disabled={busy}
                onClick={() => individuellRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5" aria-hidden />
                Individuell hochladen
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
          Hochgeladene Dokumente
        </h3>
        {hochgeladeneZeilen.length === 0 ? (
          <p className="rounded-lg border border-bw-border bg-bw-bg-soft/40 px-3 py-2 text-sm text-bw-text-muted">
            Noch keine Dokumente hochgeladen.
          </p>
        ) : (
          <div className="dok-table-wrap overflow-x-auto">
            <table className="dok-table text-sm">
              <thead>
                <tr>
                  <th>Dokument</th>
                  <th>Status</th>
                  <th>Gültig bis</th>
                  <th>Hochgeladen</th>
                  <th className="text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {hochgeladeneZeilen.map(({ typ, doc, key }) => {
                  const compStatus = typ ? complianceDokumentStatus(typ, doc) : 'ok'
                  const titel = doc.bezeichnung || typ?.bezeichnung || 'Dokument'
                  const needsOk = doc.status && !partnerDokumentIstFreigegeben(doc.status)

                  return (
                    <tr key={key}>
                      <td className="font-medium text-bw-text">
                        {titel}
                        {typ?.slug !== INDIVIDUELL_TYP_SLUG && typ ? (
                          <span className="mt-0.5 block text-xs font-normal text-bw-text-muted">
                            {typ.bezeichnung}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium',
                            partnerDocStatusPill(doc.status)
                          )}
                        >
                          {partnerDokumentIstFreigegeben(doc.status)
                            ? 'Bestätigt'
                            : partnerDokumentStatusLabel(doc.status)}
                        </span>
                        {compStatus === 'warnung' || compStatus === 'abgelaufen' ? (
                          <span className="mt-0.5 block text-[10px] text-amber-800">
                            {compStatus === 'abgelaufen' ? 'Abgelaufen' : 'Läuft bald ab'}
                          </span>
                        ) : null}
                        {doc.status === 'abgelehnt' && doc.ablehnung_grund ? (
                          <span className="mt-0.5 block text-[10px] text-status-cancel-text">
                            {doc.ablehnung_grund}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <input
                          type="date"
                          className="input py-1 text-xs w-[9rem]"
                          defaultValue={doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''}
                          key={`${doc.id}-${doc.gueltig_bis ?? ''}`}
                          disabled={busy}
                          onBlur={(e) => {
                            const v = e.target.value
                            const cur = doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''
                            if (v !== cur) saveGueltigBis(doc.id, v)
                          }}
                        />
                      </td>
                      <td className="whitespace-nowrap text-xs text-bw-text-muted">
                        {doc.hochgeladen_am ? formatDatum(doc.hochgeladen_am) : '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-bw-border"
                            disabled={busy}
                            title="Dokument ansehen"
                            onClick={() => void openDatei(doc.datei_url)}
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          {needsOk ? (
                            <>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                className="h-8 gap-1 px-2 text-xs"
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
                                className="h-8 text-xs text-status-cancel-text"
                                disabled={busy}
                                onClick={() => ablehnen(doc.id, titel)}
                              >
                                Ablehnen
                              </Button>
                            </>
                          ) : null}
                          <button
                            type="button"
                            className="icon-btn text-status-cancel-text"
                            disabled={busy}
                            title="Löschen"
                            onClick={() => removeDoc(doc.id, titel)}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
