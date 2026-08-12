'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import { PartnerDokumentEditorSheet } from '@/components/handwerker/PartnerDokumentEditorSheet'
import {
  INDIVIDUELL_TYP_SLUG,
  istEigeneUnterlageTyp,
  standardDokumente,
} from '@/lib/handwerker/compliance-katalog'
import type { ComplianceDokumentTyp, PartnerDokument } from '@/lib/types'
import { useIsMobile } from '@/hooks/useIsMobile'

const AKTE_UPLOAD_TYP: ComplianceDokumentTyp = {
  id: 'akte-eigene',
  slug: INDIVIDUELL_TYP_SLUG,
  bezeichnung: 'Dokument',
  beschreibung: null,
  pflicht_fuer_fachbetriebe: false,
  erneuerung_monate: null,
  sort_order: 9999,
  mehrfach_erlaubt: true,
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-')
  if (y && m && d) return `${d}.${m}.${y}`
  return s
}

/**
 * Akte → Dokumente: flache Liste wie Compliance-Unterlagen (keine äußere Card).
 * Nur freie Stamm-Uploads — Pflichtnachweise bleiben unter Compliance.
 */
export function HandwerkerAkteDokumente({
  handwerkerId,
  dokumente,
}: {
  handwerkerId: string
  dokumente: PartnerDokument[]
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<PartnerDokument | null>(null)

  const rows = useMemo(
    () => standardDokumente(dokumente).filter((d) => istEigeneUnterlageTyp(d.typ)),
    [dokumente]
  )

  function openAdd() {
    setEditDoc(null)
    setSheetOpen(true)
  }

  function openEdit(doc: PartnerDokument) {
    setEditDoc(doc)
    setSheetOpen(true)
  }

  const sheetTyp: ComplianceDokumentTyp =
    editDoc != null
      ? {
          ...AKTE_UPLOAD_TYP,
          slug: editDoc.typ,
          bezeichnung: editDoc.bezeichnung || 'Dokument',
        }
      : AKTE_UPLOAD_TYP

  function rowMeta(doc: PartnerDokument) {
    const title = doc.bezeichnung?.trim() || 'Dokument'
    const meta = doc.hochgeladen_am
      ? `Hochgeladen ${formatDate(doc.hochgeladen_am)}`
      : null
    return { title, meta }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-[length:var(--fs-text)] font-semibold text-[var(--text)]">
            Dokumente
          </h2>
        </div>
        {rows.length > 0 ? (
          <Button type="button" variant="primary" size="sm" onClick={openAdd}>
            <MockIcon ctx="btn" n="upload" size={14} />
            Upload
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="m-0 text-[length:var(--fs-meta)] text-bw-text-muted">
            Noch keine Dokumente.
          </p>
          <Button type="button" variant="primary" onClick={openAdd}>
            <MockIcon ctx="btn" n="upload" size={16} />
            Dokument oder Foto hochladen
          </Button>
        </div>
      ) : isMobile ? (
        <div className="dok-cards">
          {rows.map((doc) => {
            const { title, meta } = rowMeta(doc)
            return (
              <DokMobileCard
                key={doc.id}
                title={title}
                meta={meta}
                onClick={() => openEdit(doc)}
              />
            )
          })}
        </div>
      ) : (
        <div className="dok-list">
          {rows.map((doc) => {
            const { title, meta } = rowMeta(doc)
            return (
              <div
                key={doc.id}
                className="list-row dok-list__row--openable"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr)',
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
        typ={sheetTyp}
        allowTypPick={false}
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
