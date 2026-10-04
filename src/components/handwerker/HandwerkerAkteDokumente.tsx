'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { Card } from '@/components/ui/Card'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { useMemo,useState } from 'react'
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
import type { ComplianceDokumentTyp,PartnerDokument } from '@/lib/types'
import { resolveAkteVorgangTitel } from '@/lib/vorgang/vorgang-anzeige-titel'
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

/** Handwerkskarte als fester Typ (auch ohne Eintrag in den Stammdaten-Typen) */
const HANDWERKSKARTE_TYP: ComplianceDokumentTyp = {
  id: 'handwerkskarte',
  slug: 'handwerkskarte',
  bezeichnung: 'Handwerkskarte',
  beschreibung: null,
  pflicht_fuer_fachbetriebe: false,
  erneuerung_monate: null,
  sort_order: 1,
  mehrfach_erlaubt: false,
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
 * Freie Stamm-Uploads unter „Allgemein“; projektbezogene eigene Unterlagen
 * unter Angebotstitel → Auftragstitel.
 */
export function HandwerkerAkteDokumente({
  handwerkerId,
  dokumente,
  auftraege = [],
  handwerkskarteTyp: handwerkskarteTypProp = null,
}: {
  handwerkerId: string
  dokumente: PartnerDokument[]
  /** Handwerkskarte liegt mit in der Akte (kein eigener Tab mehr) */
  handwerkskarteTyp?: ComplianceDokumentTyp | null
  auftraege?: {
    id: string
    titel: string | null
    angebot_leistungsumfang?: string | null
    angebot_notizen?: string | null
  }[]
}) {
  const isMobile = useIsMobile()
  const handwerkskarteTyp = handwerkskarteTypProp ?? HANDWERKSKARTE_TYP
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editDoc, setEditDoc] = useState<PartnerDokument | null>(null)

  const titelByAuftrag = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of auftraege) {
      m.set(
        a.id,
        resolveAkteVorgangTitel({
          angebot: {
            leistungsumfang: a.angebot_leistungsumfang,
            notizen: a.angebot_notizen,
          },
          auftragTitel: a.titel,
          fallback: 'Auftrag',
        })
      )
    }
    return m
  }, [auftraege])

  const rows = useMemo((): AkteDocRow[] => {
    return dokumente
      .filter(
        (d) => d.datei_url?.trim() && (istEigeneUnterlageTyp(d.typ) || d.typ === 'handwerkskarte')
      )
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
      ? editDoc.typ === 'handwerkskarte'
        ? handwerkskarteTyp
        : {
            ...AKTE_UPLOAD_TYP,
            slug: editDoc.typ,
            bezeichnung: editDoc.bezeichnung || 'Dokument',
          }
      : handwerkskarteTyp
  const uploadTypen = [handwerkskarteTyp, AKTE_UPLOAD_TYP]

  function rowMeta(doc: PartnerDokument) {
    const istKarte = doc.typ === 'handwerkskarte'
    const title = istKarte ? 'Handwerkskarte' : doc.bezeichnung?.trim() || 'Dokument'
    const teile = [
      doc.hochgeladen_am ? `Hochgeladen ${formatDate(doc.hochgeladen_am)}` : null,
      istKarte && doc.gueltig_bis ? `gültig bis ${formatDate(doc.gueltig_bis)}` : null,
    ].filter(Boolean)
    return { title, meta: teile.length ? teile.join(' · ') : null }
  }

  function renderItems(items: AkteDocRow[]) {
    if (isMobile) {
      return (
        <div className="dok-mobiles">
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

  // Gleiches Bild wie die Dokumente im Vorgang — auch wenn noch leer
  return (
    <div className="auftrag-dok-panel pb-4">
      <Card className="dshell-framed" collapsible={false} title={`Dokumente · ${rows.length}`} icon="files">
        {!isMobile ? (
          <div
            className="dok-upload-zone"
            onClick={openAdd}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openAdd()
            }}
          >
            <MockIcon ctx="btn" n="cloud-upload" size={18} />
            Handwerkskarte oder Dokument hochladen
          </div>
        ) : null}
        {rows.length === 0 ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-bw-text-muted">
            {isMobile ? 'Noch keine Dokumente. Über „Dokument“ oben hochladen.' : 'Noch keine Dokumente.'}
          </p>
        ) : (
          <DokumenteVorgangAccordions groups={groups} renderItems={renderItems} />
        )}
      </Card>

      <PartnerDokumentEditorSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false)
          setEditDoc(null)
        }}
        handwerkerId={handwerkerId}
        typ={sheetTyp}
        typen={editDoc ? undefined : uploadTypen}
        allowTypPick={!editDoc && uploadTypen.length > 1}
        existing={editDoc}
        onSaved={() => {
          setSheetOpen(false)
          setEditDoc(null)
          afterServerActionRefresh()
        }}
      />
    </div>
  )
}
