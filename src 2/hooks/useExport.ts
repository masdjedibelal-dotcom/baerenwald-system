'use client'

import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'

function escapeCsvCell(val: string): string {
  if (val.includes(';') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function cellToString(val: unknown): string {
  if (val == null || val === '') return ''
  if (val instanceof Date) {
    return format(val, 'dd.MM.yyyy', { locale: de })
  }
  if (typeof val === 'number' && Number.isFinite(val)) {
    return val.toLocaleString('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }
  if (typeof val === 'boolean') {
    return val ? 'Ja' : 'Nein'
  }
  return String(val)
}

export type ExportField = { key: string; label: string }

export function useExport() {
  const exportToCSV = (
    data: Record<string, unknown>[],
    fields: ExportField[],
    filename: string
  ) => {
    const BOM = '\uFEFF'
    const header = fields.map((f) => f.label).join(';')
    const rows = data.map((row) =>
      fields
        .map((f) => {
          let val: unknown = row[f.key] ?? ''
          if (typeof val === 'number' && Number.isFinite(val)) {
            val = val.toLocaleString('de-DE', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })
          } else if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val) && val.length >= 10) {
            try {
              const d = parseISO(val.includes('T') ? val : `${val}T12:00:00`)
              if (!Number.isNaN(d.getTime())) {
                val = format(d, 'dd.MM.yyyy', { locale: de })
              }
            } catch {
              /* Rohstring */
            }
          }
          return escapeCsvCell(cellToString(val))
        })
        .join(';')
    )
    const csv = BOM + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const datePart = new Date().toLocaleDateString('de-DE').replace(/\./g, '-')
    a.download = `${filename}_${datePart}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return { exportToCSV }
}
