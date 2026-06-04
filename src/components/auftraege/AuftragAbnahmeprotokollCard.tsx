'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardCheck, ExternalLink, Pencil, Smartphone } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AbnahmeprotokollModal } from '@/components/auftraege/AbnahmeprotokollModal'
import { loadAbnahmeprotokollSummary } from '@/app/(dashboard)/auftraege/abnahmeprotokoll-actions'
import type { AuftragPosition } from '@/lib/types'
import { formatDatum } from '@/lib/utils'

export function AuftragAbnahmeprotokollCard({
  auftragId,
  kundeName,
  positionen,
  abnahmeProtokollUrl,
  abnahmeDatum,
  onChanged,
}: {
  auftragId: string
  kundeName: string
  positionen: AuftragPosition[]
  abnahmeProtokollUrl: string | null
  abnahmeDatum: string | null
  onChanged: () => void
}) {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof loadAbnahmeprotokollSummary>>>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [initialStep, setInitialStep] = useState<1 | 2 | 3 | 4>(1)

  const reload = useCallback(() => {
    void loadAbnahmeprotokollSummary(auftragId).then(setSummary)
  }, [auftragId])

  useEffect(() => {
    reload()
  }, [reload, abnahmeProtokollUrl, abnahmeDatum])

  function openWizard(step: 1 | 2 | 3 | 4) {
    setInitialStep(step)
    setModalOpen(true)
  }

  const hasProtokoll = Boolean(summary?.punkte.length || abnahmeProtokollUrl)
  const pdfUrl = summary?.pdf_url ?? abnahmeProtokollUrl

  return (
    <>
      <Card
        id="auftrag-abnahmeprotokoll"
        title="Abnahmeprotokoll"
        className="scroll-mt-24"
        bodyClassName="p-4"
        action={
          hasProtokoll && summary ? (
            <span className="text-[12px] tabular-nums text-bw-text-muted">
              {summary.statistik.ok}/{summary.statistik.gesamt} OK
              {summary.statistik.mangel > 0 ? ` · ${summary.statistik.mangel} Mangel` : ''}
            </span>
          ) : null
        }
      >
        {!hasProtokoll ? (
          <div className="space-y-3">
            <p className="text-sm text-bw-text-muted">
              Checkliste aus Gewerken und Leistungen des Auftrags — PDF zum Ausdrucken oder digital vor Ort
              abhaken.
            </p>
            <Button type="button" variant="primary" size="sm" onClick={() => openWizard(1)}>
              <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
              Abnahmeprotokoll erstellen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-bw-text">
              <span>
                Abnahme:{' '}
                <strong>
                  {formatDatum(summary?.abnahme_datum ?? abnahmeDatum ?? '')}
                </strong>
              </span>
              {summary?.an_kunde_gesendet_at ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                  An Kunde gesendet
                </span>
              ) : (
                <span className="rounded-full bg-bw-hover px-2 py-0.5 text-[11px] font-medium text-bw-text-muted">
                  Entwurf / lokal
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" size="sm" onClick={() => openWizard(2)}>
                <Smartphone className="mr-1.5 h-4 w-4" aria-hidden />
                Vor Ort (Abhaken)
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => openWizard(1)}>
                <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
                Checkliste bearbeiten
              </Button>
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm inline-flex items-center"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                  PDF
                </a>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => openWizard(4)}>
                  PDF erstellen
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <AbnahmeprotokollModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        auftragId={auftragId}
        positionen={positionen}
        kundeName={kundeName}
        initialStep={initialStep}
        onDone={() => {
          reload()
          onChanged()
        }}
      />
    </>
  )
}
