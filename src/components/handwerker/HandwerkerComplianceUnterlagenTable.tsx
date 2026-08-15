'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
import {
  istEigeneUnterlageTyp,
  standardDokumente,
} from '@/lib/handwerker/compliance-katalog'
import {
  partnerDokumentIstFreigegeben,
  partnerDokumentIstGeloescht,
  partnerDokumentStatusLabel,
} from '@/lib/handwerker/partner-dokument-status'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PartnerDokumentEditorSheet } from '@/components/handwerker/PartnerDokumentEditorSheet'

function listStatus(doc: PartnerDokument): {
  label: string
  tone: 'ok' | 'warn' | 'bad' | 'neutral'
} {
  if (partnerDokumentIstGeloescht(doc)) {
    return { label: 'Gelöscht', tone: 'bad' }
  }
  const s = (doc.status ?? '').toLowerCase()
  if (partnerDokumentIstFreigegeben(doc.status)) {
    return { label: 'Angenommen', tone: 'ok' }
  }
  if (s === 'abgelehnt') {
    return { label: 'Abgelehnt', tone: 'bad' }
  }
  return { label: partnerDokumentStatusLabel(doc.status), tone: 'warn' }
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<PartnerDokument | null>(null)

  const hochgeladen = useMemo(() => standardDokumente(dokumente), [dokumente])

  function openAdd() {
    setEditDoc(null)
    setSheetOpen(true)
  }

  function openEdit(doc: PartnerDokument) {
    setEditDoc(doc)
    setSheetOpen(true)
  }

  const editTyp =
    editDoc != null
      ? typen.find((t) => t.slug === editDoc.typ) ?? {
          id: `fallback-${editDoc.typ}`,
          slug: editDoc.typ,
          bezeichnung: editDoc.bezeichnung || editDoc.typ,
          beschreibung: null,
          pflicht_fuer_fachbetriebe: false,
          erneuerung_monate: null,
          sort_order: 9999,
          mehrfach_erlaubt: istEigeneUnterlageTyp(editDoc.typ),
        }
      : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[length:var(--fs-text)] font-semibold text-[var(--text)]">
            Unterlagen
          </h2>
        </div>
        {hochgeladen.length > 0 ? (
          <Button type="button" variant="primary" size="sm" onClick={openAdd}>
            <MockIcon ctx="btn" n="upload" size={14} />
            Upload
          </Button>
        ) : null}
      </div>

      {hochgeladen.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
            Noch keine Unterlagen.
          </p>
          <Button type="button" variant="primary" onClick={openAdd}>
            <MockIcon ctx="btn" n="upload" size={16} />
            Dokument oder Foto hochladen
          </Button>
        </div>
      ) : (
        <div className="dok-list">
          {hochgeladen.map((doc) => {
            const typMeta = typen.find((t) => t.slug === doc.typ)
            const title = doc.bezeichnung || typMeta?.bezeichnung || doc.typ
            const status = listStatus(doc)
            return (
              <div
                key={doc.id}
                className="list-row dok-list__row--openable"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  cursor: 'pointer',
                  alignItems: 'center',
                }}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(doc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openEdit(doc)
                  }
                }}
              >
                <div className="dok-list__main min-w-0">
                  <div className="dok-list__name truncate">{title}</div>
                </div>
                <span
                  className={cn(
                    'dok-card__tag shrink-0 self-center text-center',
                    status.tone === 'ok' && 'is-kunde',
                    (status.tone === 'warn' || status.tone === 'neutral') && 'is-warn',
                    status.tone === 'bad' && 'is-bad'
                  )}
                >
                  {status.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <PartnerDokumentEditorSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditDoc(null)
        }}
        handwerkerId={handwerkerId}
        typ={editTyp}
        typen={typen}
        allowTypPick={!editDoc}
        existing={editDoc}
        onSaved={() => {
          setSheetOpen(false)
          setEditDoc(null)
          router.refresh()
        }}
      />
    </div>
  )
}
