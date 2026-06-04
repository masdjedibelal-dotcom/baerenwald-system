'use client'

import { useEffect, useState, useTransition } from 'react'
import { Download, Mail } from 'lucide-react'
import { loadEmailLogDetail, type EmailLogDetail } from '@/app/(dashboard)/email-log/actions'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { freitextMailTypLabel } from '@/lib/kommunikation/types'
import { formatDatumZeit } from '@/lib/utils'

export function EmailLogPreviewModal({
  emailLogId,
  open,
  onClose,
}: {
  emailLogId: string | null
  open: boolean
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [row, setRow] = useState<EmailLogDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !emailLogId) {
      setRow(null)
      setError(null)
      return
    }
    startTransition(async () => {
      const res = await loadEmailLogDetail(emailLogId)
      if (!res.ok) {
        setError(res.message)
        setRow(null)
        return
      }
      setRow(res.row)
      setError(null)
    })
  }, [open, emailLogId])

  const pdfHref = row?.angebot_id ? `/api/angebote/${row.angebot_id}/pdf` : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gesendete E-Mail"
      size="lg"
      footer={
        <Button type="button" variant="secondary" onClick={onClose}>
          Schließen
        </Button>
      }
    >
      {pending && !row ? <p className="text-sm text-bw-text-muted">Lade Vorschau …</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {row ? (
        <div className="space-y-4">
          <dl className="grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
            <dt className="text-bw-text-muted">Typ</dt>
            <dd>{freitextMailTypLabel(row.typ, row.kontext_typ)}</dd>
            <dt className="text-bw-text-muted">Richtung</dt>
            <dd>{row.richtung === 'empfangen' ? 'Empfangen' : 'Gesendet'}</dd>
            <dt className="text-bw-text-muted">Datum</dt>
            <dd>{formatDatumZeit(row.created_at)}</dd>
            {row.richtung === 'empfangen' && row.von_email ? (
              <>
                <dt className="text-bw-text-muted">Von</dt>
                <dd>{row.von_email}</dd>
              </>
            ) : null}
            <dt className="text-bw-text-muted">An</dt>
            <dd>{row.an_email}</dd>
            {row.cc_email ? (
              <>
                <dt className="text-bw-text-muted">CC</dt>
                <dd>{row.cc_email}</dd>
              </>
            ) : null}
            <dt className="text-bw-text-muted">Betreff</dt>
            <dd className="font-medium text-bw-text">{row.betreff}</dd>
            {row.anhang_dateiname ? (
              <>
                <dt className="text-bw-text-muted">Anhang</dt>
                <dd className="flex flex-wrap items-center gap-2">
                  <span>{row.anhang_dateiname}</span>
                  {pdfHref ? (
                    <a
                      href={pdfHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-bw-green hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden />
                      PDF öffnen
                    </a>
                  ) : null}
                </dd>
              </>
            ) : null}
            {row.status === 'fehler' && row.fehler_nachricht ? (
              <>
                <dt className="text-bw-text-muted">Fehler</dt>
                <dd className="text-red-700">{row.fehler_nachricht}</dd>
              </>
            ) : null}
          </dl>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
              <Mail className="h-3.5 w-3.5" aria-hidden />
              Nachricht
            </p>
            <div
              className="max-h-[420px] overflow-auto rounded-lg border border-bw-border bg-white p-4"
              dangerouslySetInnerHTML={{ __html: row.inhalt_html ?? '<p>Kein Inhalt gespeichert.</p>' }}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
