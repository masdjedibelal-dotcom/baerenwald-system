'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useCallback, useState } from 'react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import { toast } from '@/components/ui/app-toast'
import { finalizeRahmenVertrag } from '@/app/(dashboard)/vertraege/wizard-actions'
import { handwerkerAnzeigename } from '@/lib/vertraege/build-vertrag-texte'
import type { RahmenVertragWizardBootstrap } from '@/lib/vertraege/types'
import { TOAST } from '@/lib/copy'
import type { DocCanvasSection } from '@/lib/surfaces/document-canvas-chrome'

/** Rahmenvertrag — DocumentCanvas, eine Scroll-Seite mit Anchors (P5.4). */
export function RahmenvertragWizard({
  bootstrap,
  onClose,
  onDone,
}: {
  bootstrap: RahmenVertragWizardBootstrap
  onClose: () => void
  onDone?: () => void
}) {
  const [notizen, setNotizenState] = useState(bootstrap.notizen)
  const [draftDirty, setDraftDirty] = useState(false)
  const setNotizen = (next: string) => {
    setDraftDirty(true)
    setNotizenState(next)
  }
  const [vertragId, setVertragId] = useState<string | null>(bootstrap.vertrag_id)
  const [vertragsNr, setVertragsNr] = useState(bootstrap.vertrags_nr?.trim() || 'RV-Entwurf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const hw = bootstrap.handwerker

  const handlePdfErzeugen = useCallback(async () => {
    setSaving(true)
    try {
      const res = await finalizeRahmenVertrag({
        vertrag_id: vertragId,
        handwerker_id: bootstrap.handwerker_id,
        notizen,
      })
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      setVertragId(res.vertrag_id)
      setVertragsNr(res.vertrags_nr)
      setPdfUrl(res.pdf_url)
      setDraftDirty(false)
      setLastSavedAt(Date.now())
      toast.success(TOAST.rahmenvertrag_als_pdf_erzeugt_und_hochgeladen)
      onDone?.()
    } finally {
      setSaving(false)
    }
  }, [vertragId, bootstrap.handwerker_id, notizen, onDone])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const canvasSections: DocCanvasSection[] = [
    { id: 'partner', label: 'Partner', complete: Boolean(bootstrap.handwerker_id) },
    { id: 'pdf', label: 'PDF', complete: Boolean(pdfUrl) },
  ]

  return (
    <DocumentCanvas
      title="Rahmenvertrag"
      onClose={onClose}
      draftDirty={draftDirty}
      lastSavedAt={lastSavedAt}
      sections={canvasSections}
      primaryAction={{
        label: pdfUrl ? 'PDF erneut erzeugen' : 'PDF erzeugen',
        onClick: () => void handlePdfErzeugen(),
        busy: saving,
      }}
    >
      <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
        {handwerkerAnzeigename(hw)}
        {vertragsNr !== 'RV-Entwurf' ? ` · ${vertragsNr}` : ''}
      </p>

      <nav className="document-section-nav" aria-label="Abschnitte">
        <MockBtn
          className="document-section-nav__chip"
          type="button"
          data-doc-section="partner"
          onClick={() => scrollTo('rv-sec-partner')}
        >
          Partner
        </MockBtn>
        <MockBtn
          className="document-section-nav__chip"
          type="button"
          data-doc-section="pdf"
          onClick={() => scrollTo('rv-sec-pdf')}
        >
          PDF
        </MockBtn>
      </nav>

      <section
        id="rv-sec-partner"
        data-doc-section="partner"
        className="document-canvas-sec space-y-3"
      >
        <h2 className="text-[length:var(--fs-head)] font-semibold">Partner</h2>
        <p className="text-[length:var(--fs-text)] font-medium text-bw-text">{handwerkerAnzeigename(hw)}</p>
        {hw.firma ? <p className="text-[length:var(--fs-text)] text-bw-text-muted">{hw.firma}</p> : null}
        {hw.adresse ? <p className="text-[length:var(--fs-text)]">{hw.adresse}</p> : null}
        {hw.telefon ? <p className="text-[length:var(--fs-text)]">Tel. {hw.telefon}</p> : null}
        {hw.email ? <p className="text-[length:var(--fs-text)]">{hw.email}</p> : null}
        <SheetEditableField
          label="Interne Notizen (optional)"
          value={notizen}
          onSave={setNotizen}
          multiline
          rows={3}
          placeholder="Interne Notizen…"
        />
        <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
          Der Rahmenvertrag regelt die allgemeinen Partnerschaftsbedingungen. Projektbezogene
          Leistungen werden in separaten Nachunternehmerverträgen festgelegt.
        </p>
      </section>

      <section
        id="rv-sec-pdf"
        data-doc-section="pdf"
        className="document-canvas-sec mt-8 space-y-3"
      >
        <h2 className="text-[length:var(--fs-head)] font-semibold">PDF</h2>
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Der Rahmenvertrag wird im Bärenwald-Design erzeugt und als PDF gespeichert.
        </p>
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">Vertrags-Nr. {vertragsNr}</p>
        {pdfUrl ? (
          <div className="flex flex-wrap gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn primary sm inline-flex gap-1.5"
            >
              <MockIcon n="download" ctx="default" className="h-4 w-4" aria-hidden />
              PDF öffnen
            </a>
            <MockBtn kind="secondary" onClick={onClose}>
<<<<<<< Updated upstream
              Abbrechen
            </MockBtn>
          </div>
        ) : null}
=======
              Schließen
            </MockBtn>
          </div>
        ) : (
          <MockBtn
            type="button"
            kind="primary"
            loading={saving}
            onClick={() => void handlePdfErzeugen()}
          >
            PDF erzeugen
          </MockBtn>
        )}
>>>>>>> Stashed changes
      </section>
    </DocumentCanvas>
  )
}
