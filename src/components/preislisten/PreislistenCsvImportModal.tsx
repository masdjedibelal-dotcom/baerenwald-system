'use client'

import { useMemo, useState } from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import type { PreislistenImportMapping, PreislistenImportResponse } from '@/lib/preislisten-import'

const MAP_FIELDS: { key: keyof PreislistenImportMapping; label: string }[] = [
  { key: 'gewerk', label: 'Gewerk (Slug oder Name)' },
  { key: 'kategorie', label: 'Kategorie' },
  { key: 'leistung', label: 'Leistung' },
  { key: 'einheit', label: 'Einheit' },
  { key: 'preis', label: 'Preis (netto)' },
]

type Props = {
  open: boolean
  onClose: () => void
  onDone: (result: PreislistenImportResponse) => void
}

export function PreislistenCsvImportModal({ open, onClose, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<PreislistenImportMapping>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const headerOptions = useMemo(
    () => [{ value: '', label: '— Spalte wählen —' }, ...headers.map((h) => ({ value: h, label: h }))],
    [headers]
  )

  function reset() {
    setFile(null)
    setHeaders([])
    setPreviewRows([])
    setMapping({})
    setErr(null)
    setBusy(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function onPickFile(f: File | null) {
    reset()
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
      })
      if (parsed.errors.length > 0) {
        setErr(parsed.errors[0]?.message ?? 'CSV-Fehler')
        return
      }
      const cols = parsed.meta.fields?.filter(Boolean) as string[] | undefined
      if (!cols?.length) {
        setErr('Keine Kopfzeile erkannt.')
        return
      }
      setHeaders(cols)
      const rows = (parsed.data ?? []).filter((row) =>
        Object.values(row).some((v) => String(v ?? '').trim() !== '')
      )
      setPreviewRows(rows.slice(0, 5))
      const guess = (needle: string) =>
        cols.find((c) => c.toLowerCase().includes(needle.toLowerCase())) ?? ''
      setMapping({
        gewerk: guess('gewerk') || guess('slug') || '',
        kategorie: guess('kategorie') || guess('category') || '',
        leistung: guess('leistung') || guess('service') || guess('title') || '',
        einheit: guess('einheit') || guess('unit') || '',
        preis: guess('preis') || guess('preis_min') || guess('min') || '',
      })
    }
    reader.readAsText(f, 'UTF-8')
  }

  async function runImport() {
    setErr(null)
    if (!file) {
      setErr('Bitte eine CSV-Datei wählen.')
      return
    }
    const m = mapping as PreislistenImportMapping
    for (const { key } of MAP_FIELDS) {
      if (!m[key]?.trim()) {
        setErr(`Bitte für „${MAP_FIELDS.find((x) => x.key === key)?.label}“ eine Spalte wählen.`)
        return
      }
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      fd.set('mapping', JSON.stringify(m))
      const res = await fetch('/api/preislisten/import', { method: 'POST', body: fd })
      const json = (await res.json()) as PreislistenImportResponse & { error?: string }
      if (!res.ok) {
        setErr(json.error ?? res.statusText)
        return
      }
      onDone({
        importiert: json.importiert ?? 0,
        uebersprungen: json.uebersprungen ?? 0,
        fehler: Array.isArray(json.fehler) ? json.fehler : [],
      })
      reset()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="CSV-Import" size="lg">
      {err ? (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{err}</p>
      ) : null}

      <div className="max-h-[55vh] space-y-4 overflow-y-auto">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Datei (.csv)</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="w-full text-sm text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-white"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {previewRows.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-ink">Vorschau (erste 5 Zeilen)</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[480px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-canvas text-muted">
                    {headers.map((h) => (
                      <th key={h} className="max-w-[140px] truncate px-2 py-1.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {headers.map((h) => (
                        <td key={h} className="max-w-[140px] truncate px-2 py-1.5 text-ink">
                          {row[h] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {headers.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-border bg-canvas/40 p-3">
            <p className="text-sm font-medium text-ink">Spalten-Mapping</p>
            {MAP_FIELDS.map(({ key, label }) => (
              <Select
                key={key}
                label={label}
                name={`map-${key}`}
                value={mapping[key] ?? ''}
                onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                options={headerOptions}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={() => void runImport()} disabled={busy || !file}>
          {busy ? 'Importiere…' : 'Importieren'}
        </Button>
        <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
          Abbrechen
        </Button>
      </div>
    </Modal>
  )
}
