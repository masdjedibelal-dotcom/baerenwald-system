import { toast } from '@/components/ui/app-toast'
import type { ExportField } from '@/hooks/useExport'

/** Einfacher CSV-Export für Card-Listen (Mehrfachauswahl). */
export function exportSimpleCsv(filename: string, rows: Record<string, string>[]) {
  if (!rows.length) return
  const keys = Object.keys(rows[0]!)
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  const lines = [
    keys.join(';'),
    ...rows.map((r) => keys.map((k) => esc(String(r[k] ?? ''))).join(';')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  toast.success('Export gestartet')
}

export function runMockListExport(
  exportToCSV: (
    data: Record<string, unknown>[],
    fields: ExportField[],
    filename: string
  ) => void,
  data: Record<string, unknown>[],
  fields: ExportField[],
  filename: string
) {
  exportToCSV(data, fields, filename)
  toast.success('Export gestartet')
}
