'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { DateInput } from '@/components/ui/DateInput'

import { MockBtn, MockInput, MockTable, MockEmpty } from '@/components/mock-ui'
import { logDbError } from '@/lib/errors/log-db-error'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/app-toast'
<<<<<<< Updated upstream
=======
import { confirmDelete } from '@/components/ui/confirm-delete'
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import type { AuftragCompliancePartner } from '@/lib/auftraege/auftrag-compliance-partners'
import type { ComplianceDokumentTyp, Gewerk, PartnerDokument } from '@/lib/types'
import {
  ablehnenPartnerDokument,
  deletePartnerDokument,
  freigebenPartnerDokument,
  replaceHandwerkerDokumentForTyp,
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
  dokumentFuerTyp,
  filterProjektComplianceTypen,
  individuellTyp,
  istEigeneUnterlageTyp,
  istPflichtTyp,
  projektChecklisteFortschritt,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import { cn, formatDatum, formatPreis } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

const BUCKET = 'partner-dokumente'

function safeFileName(name: string): string {
  return name.replace(/[^\w.\-äöüÄÖÜß]+/gi, '_').slice(0, 120) || 'datei'
}

function complianceStatusPill(status: ComplianceDokumentStatus): string {
  if (status === 'ok') return 'bg-[var(--bw-green-bg)] text-[var(--bw-success)] border-[color-mix(in_srgb,var(--bw-success)_35%,var(--border))]'
  if (status === 'warnung' || status === 'in_pruefung') {
    return 'bg-[var(--yel-bg)] text-[var(--yel-tx)] border-[color-mix(in_srgb,var(--yel-tx)_35%,var(--border))]'
  }
  if (status === 'abgelaufen' || status === 'abgelehnt') {
    return 'bg-[var(--red-bg)] text-[var(--red-tx)] border-[color-mix(in_srgb,var(--red-tx)_35%,var(--border))]'
  }
  return 'bg-bw-bg-soft text-bw-text-muted border-bw-border'
}

function partnerDocStatusPill(status: string | null | undefined): string {
  if (partnerDokumentIstFreigegeben(status)) return 'bg-[var(--bw-green-bg)] text-[var(--bw-success)] border-[color-mix(in_srgb,var(--bw-success)_35%,var(--border))]'
  if ((status ?? '').toLowerCase() === 'abgelehnt') return 'bg-[var(--red-bg)] text-[var(--red-tx)] border-[color-mix(in_srgb,var(--red-tx)_35%,var(--border))]'
  return 'bg-[var(--yel-bg)] text-[var(--yel-tx)] border-[color-mix(in_srgb,var(--yel-tx)_35%,var(--border))]'
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
    () =>
      projektDocs.filter(
        (d) =>
          istEigeneUnterlageTyp(d.typ) &&
          d.handwerker_id === handwerkerId &&
          d.auftrag_id === auftragId &&
          d.datei_url?.trim()
      ),
    [projektDocs, handwerkerId, auftragId]
  )

  const offeneTypen = useMemo(() => {
    return projektTypen.filter((typ) => {
      if (istEigeneUnterlageTyp(typ.slug)) return false
      const doc = dokumentFuerTyp(projektDocs, typ.slug)
      const st = complianceDokumentStatus(typ, doc)
      return st === 'fehlend' || st === 'abgelaufen' || (doc && !partnerDokumentIstFreigegeben(doc.status))
    })
  }, [projektTypen, projektDocs])

  const hochgeladeneZeilen = useMemo(() => {
    const standard = projektTypen
      .filter((t) => !istEigeneUnterlageTyp(t.slug))
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
      if (!r.ok) toast.systemError(r)
      else {
        toast.success(TOAST.dokument_bestaetigt)
        onChanged()
      }
    })
  }

  function ablehnen(docId: string, titel: string) {
    const grund = window.prompt(`Ablehnungsgrund für „${titel}":`)
    if (grund == null) return
    startTransition(async () => {
      const r = await ablehnenPartnerDokument(docId, handwerkerId, grund)
      if (!r.ok) toast.systemError(r)
      else {
        toast.success(TOAST.abgelehnt_neu_hochladen)
        onChanged()
      }
    })
  }

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.systemError(r)
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
      if (upErr) logDbError('components/auftraege/AuftragPartnerCompliancePanel:query', upErr)
      if (upErr) throw new Error(upErr.message)

      const existing = dokumentFuerTyp(projektDocs, typ.slug)
      let gueltigBis: string | null = existing?.gueltig_bis ?? null
      if (typ.erneuerung_monate && typ.erneuerung_monate > 0) {
        const d = new Date()
        d.setMonth(d.getMonth() + typ.erneuerung_monate)
        gueltigBis = d.toISOString().slice(0, 10)
      }

      const ins = await replaceHandwerkerDokumentForTyp({
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
      toast.systemError(e, 'ui', 'Upload fehlgeschlagen')
    } finally {
      setUploadingTyp(null)
    }
  }

  function saveGueltigBis(docId: string, value: string) {
    startTransition(async () => {
      const r = await updatePartnerDokument(docId, handwerkerId, {
        gueltig_bis: value.trim() || null,
      })
      if (!r.ok) toast.systemError(r)
      else onChanged()
    })
  }

  function removeDoc(docId: string, titel: string) {
    openDeleteConfirm(
      `„${titel}“ löschen?`,
      async () => {
        const r = await deletePartnerDokument(docId, handwerkerId)
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(TOAST.geloescht)
        onChanged()
      }
    )
  }

  const pflichtOk = fortschritt.pflicht === 0 || fortschritt.erfuellt >= fortschritt.pflicht

  return (
    <div className="space-y-5">
      {partner.leistungen.length > 0 ? (
        <section>
          <h3 className="mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
            Leistungen
          </h3>
          <MockTable wrapClassName="dok-table-wrap overflow-x-auto" className="dok-table text-[length:var(--fs-text)]">
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
                    <td className="whitespace-nowrap text-[length:var(--fs-meta)] text-bw-text-muted">
                      {pos.start_datum ? formatDatum(pos.start_datum) : '—'}
                      {pos.end_datum ? ` → ${formatDatum(pos.end_datum)}` : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </MockTable>
        </section>
      ) : (
        <MockEmpty title="Keine einzelnen Leistungen zugewiesen." />
      )}

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
            Erforderliche Nachweise
          </h3>
          <span
            className={cn(
              'rounded-pill border px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
              pflichtOk ? 'border-[color-mix(in_srgb,var(--bw-success)_35%,var(--border))] bg-[var(--bw-green-bg)] text-[var(--bw-success)]' : 'border-[color-mix(in_srgb,var(--yel-tx)_35%,var(--border))] bg-[var(--yel-bg)] text-[var(--yel-tx)]'
            )}
          >
            {fortschritt.pflicht > 0
              ? `${fortschritt.erfuellt}/${fortschritt.pflicht} Pflicht erfüllt`
              : `${fortschritt.gesamt} Nachweise`}
          </span>
        </div>

        {offeneTypen.length === 0 ? (
          <p className="rounded-card border border-bw-border bg-bw-bg-soft/40 px-3 py-2 text-[length:var(--fs-text)] text-bw-text-muted">
            Alle Pflichtnachweise sind hochgeladen und bestätigt.
          </p>
        ) : (
          <ul className="divide-y divide-bw-border rounded-card border border-bw-border">
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
                    <p className="text-[length:var(--fs-text)] font-medium text-bw-text">
                      {typ.bezeichnung}
                      {pflicht ? (
                        <span className="ml-1.5 text-[length:var(--fs-meta)] font-semibold uppercase text-bw-primary">
                          Pflicht
                        </span>
                      ) : null}
                    </p>
                    {typ.beschreibung ? (
                      <p className="text-[length:var(--fs-meta)] text-bw-text-muted line-clamp-2">{typ.beschreibung}</p>
                    ) : null}
                    <span
                      className={cn(
                        'mt-1 inline-flex rounded-pill border px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
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
                      <p className="mt-1 text-[length:var(--fs-meta)] text-status-cancel-text">{doc.ablehnung_grund}</p>
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
                    <MockBtn
                      type="button"
                      kind="secondary" sm
                      className="h-8 gap-1 text-[length:var(--fs-meta)]"
                      disabled={busy}
                      onClick={() => typRefs.current[typ.slug]?.click()}
                    >
                      <MockIcon n="upload" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                      {uploading ? '…' : doc ? 'Ersetzen' : 'Hochladen'}
                    </MockBtn>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {indTyp ? (
          <div className="mt-3 space-y-2 rounded-card border border-dashed border-bw-border p-3">
            <p className="text-[length:var(--fs-text)] font-medium text-bw-text">{indTyp.bezeichnung}</p>
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
              Frei benennbarer Nachweis — z. B. SiGeKo-Unterweisung, Gerüstfreigabe.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <MockInput type="text" className="flex-1 py-1.5 text-[length:var(--fs-text)]" value={individuellTitel} onChange={(e) => setIndividuellTitel(e.target.value)} placeholder="Bezeichnung des Nachweises" disabled={busy} />
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
              <MockBtn
                type="button"
                kind="secondary" sm
                className="h-8 gap-1 text-[length:var(--fs-meta)]"
                disabled={busy}
                onClick={() => individuellRef.current?.click()}
              >
                <MockIcon n="upload" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                Individuell hochladen
              </MockBtn>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className="mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
          Hochgeladene Dokumente
        </h3>
        {hochgeladeneZeilen.length === 0 ? (
          <p className="rounded-card border border-bw-border bg-bw-bg-soft/40 px-3 py-2 text-[length:var(--fs-text)] text-bw-text-muted">
            Noch keine Dokumente hochgeladen.
          </p>
        ) : (
          <MockTable wrapClassName="dok-table-wrap overflow-x-auto" className="dok-table text-[length:var(--fs-text)]">
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
                      {typ && !istEigeneUnterlageTyp(typ.slug) ? (
                        <span className="mt-0.5 block text-[length:var(--fs-meta)] font-normal text-bw-text-muted">
                          {typ.bezeichnung}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
                          partnerDocStatusPill(doc.status)
                        )}
                      >
                        {partnerDokumentIstFreigegeben(doc.status) ? (
                          <>
                            <MockIcon n="circle-check-filled" ctx="default" className="h-3.5 w-3.5 shrink-0 text-[var(--bw-success)]" aria-hidden />
                            Bestätigt
                          </>
                        ) : (
                          partnerDokumentStatusLabel(doc.status)
                        )}
                      </span>
                      {compStatus === 'warnung' || compStatus === 'abgelaufen' ? (
                        <span className="mt-0.5 block text-[length:var(--fs-meta)] text-[var(--yel-tx)]">
                          {compStatus === 'abgelaufen' ? 'Abgelaufen' : 'Läuft bald ab'}
                        </span>
                      ) : null}
                      {doc.status === 'abgelehnt' && doc.ablehnung_grund ? (
                        <span className="mt-0.5 block text-[length:var(--fs-meta)] text-status-cancel-text">
                          {doc.ablehnung_grund}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <DateInput className="py-1 text-[length:var(--fs-meta)] w-[9rem]" defaultValue={doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''} key={`${doc.id}-${doc.gueltig_bis ?? ''}`} disabled={busy} onBlur={(e) => {
                          const v = e.target.value
                          const cur = doc.gueltig_bis ? String(doc.gueltig_bis).slice(0, 10) : ''
                          if (v !== cur) saveGueltigBis(doc.id, v)
                        }} />
                    </td>
                    <td className="whitespace-nowrap text-[length:var(--fs-meta)] text-bw-text-muted">
                      {doc.hochgeladen_am ? formatDatum(doc.hochgeladen_am) : '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <MockBtn className="inline-flex h-8 w-8 items-center justify-center rounded-button border border-bw-border" type="button" disabled={busy} title="Dokument ansehen" onClick={() => void openDatei(doc.datei_url)}>
                          <MockIcon n="file-text" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                        </MockBtn>
                        {needsOk ? (
                          <>
                            <MockBtn
                              type="button"
                              kind="primary" sm
                              className="h-8 gap-1 px-2 text-[length:var(--fs-meta)]"
                              disabled={busy}
                              onClick={() => freigeben(doc.id)}
                            >
                              <MockIcon n="circle-check-filled" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                              Bestätigen
                            </MockBtn>
                            <MockBtn
                              type="button"
                              kind="ghost" sm
                              className="h-8 text-[length:var(--fs-meta)] text-status-cancel-text"
                              disabled={busy}
                              onClick={() => ablehnen(doc.id, titel)}
                            >
                              Ablehnen
                            </MockBtn>
                          </>
                        ) : null}
<<<<<<< Updated upstream
                        <MockBtn className="icon-btn text-status-cancel-text" type="button" disabled={busy} title="Löschen" onClick={() => removeDoc(doc.id, titel)}>
                          <MockIcon n="trash" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                        </MockBtn>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </MockTable>
=======
                        {doc.status === 'abgelehnt' && doc.ablehnung_grund ? (
                          <span className="mt-0.5 block text-[length:var(--fs-meta)] text-status-cancel-text">
                            {doc.ablehnung_grund}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <input
                          type="date"
                          className="input py-1 text-[length:var(--fs-meta)] w-[9rem]"
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
                      <td className="whitespace-nowrap text-[length:var(--fs-meta)] text-bw-text-muted">
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
                              <MockBtn
                                type="button"
                                kind="primary" sm
                                className="h-8 gap-1 px-2 text-[length:var(--fs-meta)]"
                                disabled={busy}
                                onClick={() => freigeben(doc.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Bestätigen
                              </MockBtn>
                              <MockBtn
                                type="button"
                                kind="ghost" sm
                                className="h-8 text-[length:var(--fs-meta)] text-status-cancel-text"
                                disabled={busy}
                                onClick={() => ablehnen(doc.id, titel)}
                              >
                                Ablehnen
                              </MockBtn>
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
>>>>>>> Stashed changes
        )}
      </section>
    </div>
  )
}
