'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Button } from '@/components/ui/Button'
import { DokMobileCard } from '@/components/ui/DokMobileCard'
import {
  DokumenteVorgangAccordions,
  groupByVorgangTitel,
} from '@/components/ui/DokumenteVorgangAccordions'
import { PartnerDokumentEditorSheet } from '@/components/handwerker/PartnerDokumentEditorSheet'
import {
  INDIVIDUELL_TYP_SLUG,
  istEigeneUnterlageTyp,
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

const ALLGEMEIN_KEY = 'allgemein'
const ALLGEMEIN_TITLE = 'Allgemein'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const s = String(value).slice(0, 10)
  const [y, m, d] = s.split('-')
  if (y && m && d) return `${d}.${m}.${y}`
  return s
}

type AkteDocRow = PartnerDokument & {
  groupKey: string
  groupTitle: string
}

/**
 * Akte → Dokumente: nach Vorgangstitel gruppiert (Accordions).
 * Freie Stamm-Uploads unter „Allgemein“; projektbezogene eigene Unterlagen unter dem Auftragstitel.
 */
export function HandwerkerAkteDokumente({
  handwerkerId,
  dokumente,
  auftraege = [],
}: {
  handwerkerId: string
  dokumente: PartnerDokument[]
  auftraege?: { id: string; titel: string | null }[]
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<PartnerDokument | null>(null)

  const titelByAuftrag = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of auftraege) {
      m.set(a.id, a.titel?.trim() || 'Auftrag')
    }
    return m
  }, [auftraege])

  const rows = useMemo((): AkteDocRow[] => {
    return dokumente
      .filter((d) => d.datei_url?.trim() && istEigeneUnterlageTyp(d.typ))
      .map((d) => {
        const aid = d.auftrag_id?.trim()
        if (aid) {
          return {
            ...d,
            groupKey: `auftrag:${aid}`,
            groupTitle: titelByAuftrag.get(aid) || 'Auftrag',
          }
        }
        return {
          ...d,
          groupKey: ALLGEMEIN_KEY,
          groupTitle: ALLGEMEIN_TITLE,
        }
      })
      .sort((a, b) => String(b.hochgeladen_am).localeCompare(String(a.hochgeladen_am)))
  }, [dokumente, titelByAuftrag])

  const groups = useMemo(() => groupByVorgangTitel(rows), [rows])

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

  function renderItems(items: AkteDocRow[]) {
    if (isMobile) {
      return (
        <div className="dok-cards">
          {items.map((doc) => {
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
      )
    }
    return (
      <div className="dok-list">
        {items.map((doc) => {
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
    )
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
      ) : (
        <DokumenteVorgangAccordions groups={groups} renderItems={renderItems} />
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
