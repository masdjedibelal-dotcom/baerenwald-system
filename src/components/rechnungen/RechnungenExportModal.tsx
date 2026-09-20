'use client'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockBtn } from '@/components/mock-ui'
import { MockField } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { DateInput } from '@/components/ui/DateInput'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from '@/components/ui/app-toast'
import type { ExportField } from '@/hooks/useExport'
import { getZeitraumRange, type ZeitraumPreset } from '@/lib/listZeitraum'
import { RECHNUNGEN_PDF_ZIP_MAX } from '@/lib/rechnungen/export-constants'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

type ExportMode = 'csv' | 'pdf_zip'

function defaultPdfDates(
  zeitraum: ZeitraumPreset,
  customFrom: string,
  customTo: string
): { von: string; bis: string } {
  const range = getZeitraumRange(zeitraum, customFrom, customTo)
  if (range) {
    return {
      von: format(range.from, 'yyyy-MM-dd'),
      bis: format(range.to, 'yyyy-MM-dd'),
    }
  }
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    von: format(first, 'yyyy-MM-dd'),
    bis: format(last, 'yyyy-MM-dd'),
  }
}

export function RechnungenExportModal({
  open,
  onClose,
  fields,
  onCsvDownload,
  zeitraum,
  customFrom,
  customTo,
}: {
  open: boolean
  onClose: () => void
  fields: ExportField[]
  onCsvDownload: (opts: { scope: 'view' | 'all'; keys: string[] }) => void
  zeitraum: ZeitraumPreset
  customFrom: string
  customTo: string
}) {
  const [mode, setMode] = useState<ExportMode>('csv')
  const [scope, setScope] = useState<'view' | 'all'>('view')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pdfVon, setPdfVon] = useState('')
  const [pdfBis, setPdfBis] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const pdfDefaults = useMemo(
    () => defaultPdfDates(zeitraum, customFrom, customTo),
    [zeitraum, customFrom, customTo]
  )

  useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {}
      for (const f of fields) init[f.key] = true
      setSelected(init)
      setScope('view')
      setMode('csv')
      setPdfVon(pdfDefaults.von)
      setPdfBis(pdfDefaults.bis)
    }
  }, [open, fields, pdfDefaults])

  function toggle(key: string) {
    setSelected((s) => ({ ...s, [key]: !s[key] }))
  }

  function handleCsvDownload() {
    const keys = fields.filter((f) => selected[f.key]).map((f) => f.key)
    if (keys.length === 0) return
    onCsvDownload({ scope, keys })
    onClose()
  }

  async function handlePdfZipDownload() {
    if (!pdfVon.trim() || !pdfBis.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_von_und_bis_datum_angeben })
      return
    }
    setPdfLoading(true)
    try {
      const params = new URLSearchParams({ von: pdfVon.trim(), bis: pdfBis.trim() })
      const res = await fetch(`/api/rechnungen/export-pdf-zip?${params.toString()}`)
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { message?: string; error?: string }
        throw new Error(json.message ?? json.error ?? 'Export fehlgeschlagen')
      }
      const count = res.headers.get('X-Rechnungen-Count')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rechnungen_${pdfVon.trim()}_bis_${pdfBis.trim()}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(
        count ? `${count} Rechnungs-PDF${count === '1' ? '' : 's'} als ZIP heruntergeladen` : 'ZIP heruntergeladen'
      )
      onClose()
    } catch (e) {
      toast.systemError(e, 'ui', 'Export fehlgeschlagen')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <EditorSheet open={open} onClose={onClose} title="Rechnungen exportieren" size="md">
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <MockBtn className={`rounded-pill px-3 py-1 text-[length:var(--fs-text)] font-medium ${
              mode === 'csv'
                ? 'bg-bw-primary text-white'
                : 'bg-bw-bg text-bw-text-muted hover:bg-bw-hover'
            }`} type="button" onClick={() => setMode('csv')}>
            CSV
          </MockBtn>
          <MockBtn className={`rounded-pill px-3 py-1 text-[length:var(--fs-text)] font-medium ${
              mode === 'pdf_zip'
                ? 'bg-bw-primary text-white'
                : 'bg-bw-bg text-bw-text-muted hover:bg-bw-hover'
            }`} type="button" onClick={() => setMode('pdf_zip')}>
            PDF-ZIP
          </MockBtn>
        </div>

        {mode === 'csv' ? (
          <>
            <p className="text-[length:var(--fs-text)] text-bw-text-muted">Tabellenexport als CSV-Datei.</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-text)]">
                <input
                  type="radio"
                  name="csv-scope"
                  checked={scope === 'view'}
                  onChange={() => setScope('view')}
                  className="text-bw-primary"
                />
                Aktuelle Ansicht (mit aktiven Filtern)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-text)]">
                <input
                  type="radio"
                  name="csv-scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="text-bw-primary"
                />
                Alles
              </label>
            </div>

            <div>
              <p className="mb-2 text-[length:var(--fs-text)] font-medium text-bw-text">Felder auswählen</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {fields.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-text)]">
                    <MockCheckbox
                      checked={selected[f.key] ?? true}
                      onChange={() => toggle(f.key)}
                      className="rounded-card border-bw-border text-bw-primary"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
              <MockBtn type="button" kind="secondary" onClick={onClose}>
                Abbrechen
              </MockBtn>
              <MockBtn
                type="button"
                kind="primary"
                onClick={handleCsvDownload}
                disabled={!fields.some((f) => selected[f.key])}
              >
                CSV herunterladen
              </MockBtn>
            </div>
          </>
        ) : (
          <>
            <p className="text-[length:var(--fs-text)] text-bw-text-muted">
              Alle versendeten Rechnungen (Status Gesendet oder Bezahlt) im Zeitraum als PDFs in
              einer ZIP-Datei. Es wird das Rechnungsdatum verwendet.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <MockField label="Von" required><DateInput required value={pdfVon} onChange={(e) => setPdfVon(e.target.value)} /></MockField>
              <MockField label="Bis" required><DateInput required value={pdfBis} onChange={(e) => setPdfBis(e.target.value)} /></MockField>
            </div>
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
              Maximal {RECHNUNGEN_PDF_ZIP_MAX} Rechnungen pro Export.
            </p>
            <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
              <MockBtn type="button" kind="secondary" onClick={onClose} disabled={pdfLoading}>
                Abbrechen
              </MockBtn>
              <MockBtn
                type="button"
                kind="primary"
                onClick={() => void handlePdfZipDownload()}
                disabled={pdfLoading}
              >
                {pdfLoading ? 'ZIP wird erstellt …' : 'PDF-ZIP herunterladen'}
              </MockBtn>
            </div>
          </>
        )}
      </div>
    </EditorSheet>
  )
}
