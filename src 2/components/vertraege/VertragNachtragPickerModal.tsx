'use client'

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { HandwerkerVertragRow } from '@/lib/vertraege/types'

export function VertragNachtragPickerModal({
  open,
  vertraege,
  onClose,
  onSelect,
}: {
  open: boolean
  vertraege: HandwerkerVertragRow[]
  onClose: () => void
  onSelect: (vertragId: string) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Ursprungsvertrag wählen">
      <p className="mb-4 text-sm text-bw-text-muted">
        Für welchen Nachunternehmervertrag soll die Ergänzungsvereinbarung erstellt werden?
      </p>
      <ul className="space-y-2">
        {vertraege.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              className="w-full rounded-lg border border-bw-border px-3 py-3 text-left transition-colors hover:bg-bw-hover/50"
              onClick={() => onSelect(v.id)}
            >
              <span className="block font-medium text-bw-text">
                {v.gewerk_name?.trim() || 'Projektvertrag'}
                {v.vertrags_nr?.trim() ? ` · ${v.vertrags_nr}` : ''}
              </span>
              <span className="mt-0.5 block text-xs text-bw-text-muted">
                {v.bauvorhaben?.trim() || 'Bauvorhaben gemäß Auftrag'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
      </div>
    </Modal>
  )
}
