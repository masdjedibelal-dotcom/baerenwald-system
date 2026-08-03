'use client'

import { useCallback, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { DocActionBar } from '@/components/surfaces/primitives'
import { SheetEditableField } from '@/components/surfaces/SheetEditableField'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import { finalizeRahmenVertrag } from '@/app/(dashboard)/vertraege/wizard-actions'
import { handwerkerAnzeigename } from '@/lib/vertraege/build-vertrag-texte'
import type { RahmenVertragWizardBootstrap } from '@/lib/vertraege/types'

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
  const [notizen, setNotizen] = useState(bootstrap.notizen)
  const [vertragId, setVertragId] = useState<string | null>(bootstrap.vertrag_id)
  const [vertragsNr, setVertragsNr] = useState(bootstrap.vertrags_nr?.trim() || 'RV-Entwurf')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const hw = bootstrap.handwerker

  const handlePdfErzeugen = useCallback(async () => {
    await actionBusy.run('PDF wird erzeugt…', async () => {
      setSaving(true)
      try {
        const res = await finalizeRahmenVertrag({
          vertrag_id: vertragId,
          handwerker_id: bootstrap.handwerker_id,
          notizen,
        })
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        setVertragId(res.vertrag_id)
        setVertragsNr(res.vertrags_nr)
        setPdfUrl(res.pdf_url)
        toast.success('Rahmenvertrag als PDF erzeugt und hochgeladen')
        onDone?.()
      } finally {
        setSaving(false)
      }
    })
  }, [vertragId, bootstrap.handwerker_id, notizen, onDone])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <DocumentCanvas
      title="Rahmenvertrag"
      onClose={onClose}
      saveBusy={saving}
      onSave={() => void handlePdfErzeugen()}
      docActions={
        <DocActionBar
          actions={[
            {
              id: 'pdf',
              label: pdfUrl ? 'PDF' : 'PDF erzeugen',
              onClick: () => void handlePdfErzeugen(),
              icon: <FileText size={20} strokeWidth={1.75} aria-hidden />,
            },
          ]}
        />
      }
    >
      <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
        {handwerkerAnzeigename(hw)}
        {vertragsNr !== 'RV-Entwurf' ? ` · ${vertragsNr}` : ''}
      </p>

      <nav className="document-section-nav" aria-label="Abschnitte">
        <button
          type="button"
          className="document-section-nav__chip"
          onClick={() => scrollTo('rv-sec-partner')}
        >
          Partner
        </button>
        <button
          type="button"
          className="document-section-nav__chip"
          onClick={() => scrollTo('rv-sec-pdf')}
        >
          PDF
        </button>
      </nav>

      <section id="rv-sec-partner" className="document-canvas-sec space-y-3">
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

      <section id="rv-sec-pdf" className="document-canvas-sec mt-8 space-y-3">
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
              <Download className="h-4 w-4" aria-hidden />
              PDF öffnen
            </a>
            <Button variant="secondary" onClick={onClose}>
              Schließen
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="primary"
            loading={saving}
            onClick={() => void handlePdfErzeugen()}
          >
            PDF erzeugen
          </Button>
        )}
      </section>
    </DocumentCanvas>
  )
}
