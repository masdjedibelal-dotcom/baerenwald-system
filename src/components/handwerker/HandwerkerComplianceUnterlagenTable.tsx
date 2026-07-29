'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { PartnerDokumentEditorSheet } from '@/components/handwerker/PartnerDokumentEditorSheet'
import { toast } from '@/components/ui/app-toast'
import {
  deletePartnerDokument,
  signPartnerDokumentUrl,
} from '@/app/(dashboard)/handwerker/actions'
import {
  complianceDokumentStatus,
  dokumentFuerTyp,
  standardDokumente,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { cn, formatDatum } from '@/lib/utils'

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
  const [sheetTyp, setSheetTyp] = useState<ComplianceDokumentTyp | null>(null)
  const standardDocs = useMemo(() => standardDokumente(dokumente), [dokumente])

  const sheetDoc = useMemo(() => {
    if (!sheetTyp) return null
    return (
      dokumentFuerTyp(standardDocs, sheetTyp.slug, {
        handwerkerId,
        auftragId: null,
      }) ?? null
    )
  }, [sheetTyp, standardDocs, handwerkerId])

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
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
    <>
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
              const gueltigLabel = doc?.gueltig_bis
                ? formatDatum(String(doc.gueltig_bis).slice(0, 10))
                : null

              return (
                <tr key={typ.id}>
                  <td>
                    <button
                      type="button"
                      className="hw-compliance-name-btn"
                      onClick={() => setSheetTyp(typ)}
                    >
                      <div className="hw-compliance-name">{typ.bezeichnung}</div>
                      {doc?.notizen?.trim() || typ.beschreibung ? (
                        <div className="hw-compliance-desc">
                          {doc?.notizen?.trim() || typ.beschreibung}
                        </div>
                      ) : null}
                      {doc?.datei_url ? (
                        <div className="hw-compliance-file-hint">Datei vorhanden</div>
                      ) : null}
                    </button>
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
                    {gueltigLabel ? (
                      <span className="hw-compliance-date-text">{gueltigLabel}</span>
                    ) : (
                      <span className="hw-compliance-muted">—</span>
                    )}
                  </td>
                  <td>
                    <div className="hw-compliance-actions">
                      {doc ? (
                        <>
                          <button
                            type="button"
                            className="btn ghost sm"
                            disabled={pending}
                            onClick={() => void openDatei(doc.datei_url)}
                          >
                            <MockIcon ctx="btn" n="eye" size={14} />
                            Ansehen
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm"
                            disabled={pending}
                            onClick={() => setSheetTyp(typ)}
                          >
                            <MockIcon ctx="btn" n="pencil" size={14} />
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            className="btn ghost sm hw-compliance-danger"
                            disabled={pending}
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
                          disabled={pending}
                          onClick={() => setSheetTyp(typ)}
                        >
                          <MockIcon ctx="btn" n="upload" size={14} />
                          Hochladen
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

      <PartnerDokumentEditorSheet
        open={!!sheetTyp}
        onClose={() => setSheetTyp(null)}
        handwerkerId={handwerkerId}
        typ={sheetTyp}
        existing={sheetDoc}
        onSaved={() => router.refresh()}
      />
    </>
  )
}
