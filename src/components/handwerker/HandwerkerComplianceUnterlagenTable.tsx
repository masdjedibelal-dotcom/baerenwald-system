'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import {
  complianceDokumentStatus,
  standardDokumente,
  type ComplianceDokumentStatus,
} from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { cn } from '@/lib/utils'
import { PartnerDokumentEditorSheet } from '@/components/handwerker/PartnerDokumentEditorSheet'
import { signPartnerDokumentUrl } from '@/app/(dashboard)/handwerker/actions'
import { toast } from '@/components/ui/app-toast'
import { useIsMobile } from '@/hooks/useIsMobile'

function statusMeta(status: ComplianceDokumentStatus): {
  label: string
  tone: 'ok' | 'warn' | 'bad'
} {
  if (status === 'ok') return { label: 'Gültig', tone: 'ok' }
  if (status === 'warnung') return { label: 'Bald fällig', tone: 'warn' }
  if (status === 'abgelaufen') return { label: 'Abgelaufen', tone: 'bad' }
  return { label: 'Fehlt', tone: 'bad' }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-')
  if (y && m && d) return `${d}.${m}.${y}`
  return s
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
  const isMobile = useIsMobile()
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

  async function openDatei(stored: string | null | undefined) {
    const r = await signPartnerDokumentUrl(stored)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    window.open(r.url, '_blank', 'noopener,noreferrer')
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
          mehrfach_erlaubt: editDoc.typ === 'individuell',
        }
      : null

  function rowMeta(doc: PartnerDokument) {
    const typMeta = typen.find((t) => t.slug === doc.typ)
    const st = complianceDokumentStatus(
      typMeta ?? {
        id: doc.typ,
        slug: doc.typ,
        bezeichnung: doc.bezeichnung || doc.typ,
        beschreibung: null,
        pflicht_fuer_fachbetriebe: false,
        erneuerung_monate: null,
        sort_order: 0,
      },
      doc
    )
    const status = statusMeta(st)
    const title = doc.bezeichnung || typMeta?.bezeichnung || doc.typ
    const meta = [
      doc.hochgeladen_am ? `Hochgeladen ${formatDate(doc.hochgeladen_am)}` : null,
      doc.gueltig_bis ? `gültig bis ${formatDate(doc.gueltig_bis)}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
    return { title, meta, status, typMeta }
  }

  const uploadBtn = (
    <Button type="button" variant="primary" size="sm" onClick={openAdd}>
      <MockIcon ctx="btn" n="upload" size={14} />
      Upload
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[length:var(--fs-text)] font-semibold text-[var(--text)]">
            Unterlagen
          </h2>
          <p className="mt-1 mb-0 text-[length:var(--fs-meta)] text-[var(--text-3)]">
            Hochgeladene Nachweise und Dokumente dieses Handwerkers.
          </p>
        </div>
        {uploadBtn}
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
      ) : isMobile ? (
        <div className="dok-cards">
          {hochgeladen.map((doc) => {
            const { title, meta, status } = rowMeta(doc)
            return (
              <DokMobileCard
                key={doc.id}
                title={title}
                meta={meta || null}
                onClick={() => openEdit(doc)}
                badge={
                  <span
                    className={cn(
                      'dok-card__tag',
                      status.tone === 'ok' && 'is-kunde',
                      status.tone === 'warn' && 'is-warn',
                      status.tone === 'bad' && 'is-bad'
                    )}
                  >
                    {status.label}
                  </span>
                }
              />
            )
          })}
        </div>
      ) : (
        <div className="dok-list">
          {hochgeladen.map((doc) => {
            const { title, meta, status } = rowMeta(doc)
            return (
              <div
                key={doc.id}
                className="list-row dok-list__row--openable"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
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
                  <div className="dok-list__name">
                    {title}
                    {meta ? <span className="dok-list__name-size"> · {meta}</span> : null}
                  </div>
                </div>
                <span
                  className={cn(
                    'dok-card__tag',
                    status.tone === 'ok' && 'is-kunde',
                    status.tone === 'warn' && 'is-warn',
                    status.tone === 'bad' && 'is-bad'
                  )}
                >
                  {status.label}
                </span>
                <div
                  className="dok-list__actions inline-flex justify-end gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {doc.datei_url ? (
                    <button
                      type="button"
                      className="icon-btn"
                      title="Ansehen"
                      onClick={() => void openDatei(doc.datei_url)}
                    >
                      <MockIcon ctx="btn" n="eye" size={15} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="icon-btn"
                    title="Bearbeiten"
                    onClick={() => openEdit(doc)}
                  >
                    <MockIcon ctx="btn" n="pencil" size={15} />
                  </button>
                </div>
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
