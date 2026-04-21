'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { ExportField } from '@/hooks/useExport'

export function CsvExportModal({
  open,
  onClose,
  title = 'CSV exportieren',
  fields,
  onDownload,
}: {
  open: boolean
  onClose: () => void
  title?: string
  fields: ExportField[]
  onDownload: (opts: { scope: 'view' | 'all'; keys: string[] }) => void
}) {
  const [scope, setScope] = useState<'view' | 'all'>('view')
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      const init: Record<string, boolean> = {}
      for (const f of fields) init[f.key] = true
      setSelected(init)
      setScope('view')
    }
  }, [open, fields])

  function toggle(key: string) {
    setSelected((s) => ({ ...s, [key]: !s[key] }))
  }

  function handleDownload() {
    const keys = fields.filter((f) => selected[f.key]).map((f) => f.key)
    if (keys.length === 0) return
    onDownload({ scope, keys })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <p className="text-sm text-bw-text-muted">Was exportieren?</p>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="csv-scope"
              checked={scope === 'view'}
              onChange={() => setScope('view')}
              className="text-bw-primary"
            />
            Aktuelle Ansicht (mit aktiven Filtern)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
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
          <p className="mb-2 text-sm font-medium text-bw-text">Felder auswählen</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fields.map((f) => (
              <label key={f.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected[f.key] ?? true}
                  onChange={() => toggle(f.key)}
                  className="rounded border-bw-border text-bw-primary"
                />
                {f.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-bw-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleDownload}
            disabled={!fields.some((f) => selected[f.key])}
          >
            CSV herunterladen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
