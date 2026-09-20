'use client'
import { MockBtn } from '@/components/mock-ui'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

<<<<<<< Updated upstream
=======
import { Modal } from '@/components/ui/Modal'
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
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
    <EditorSheet open={open} onClose={onClose} title="Ursprungsvertrag wählen">
      <p className="mb-4 text-sm text-bw-text-muted">
        Für welchen Nachunternehmervertrag soll die Ergänzungsvereinbarung erstellt werden?
      </p>
      <ul className="space-y-2">
        {vertraege.map((v) => (
          <li key={v.id}>
            <MockBtn fullWidth className="rounded-button border border-bw-border px-3 py-3 text-left transition-colors hover:bg-bw-hover/50" type="button" onClick={() => onSelect(v.id)}>
              <span className="block font-medium text-bw-text">
                {v.gewerk_name?.trim() || 'Projektvertrag'}
                {v.vertrags_nr?.trim() ? ` · ${v.vertrags_nr}` : ''}
              </span>
              <span className="mt-0.5 block text-xs text-bw-text-muted">
                {v.bauvorhaben?.trim() || 'Bauvorhaben gemäß Auftrag'}
              </span>
            </MockBtn>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end">
        <MockBtn kind="secondary" onClick={onClose}>
          Abbrechen
        </MockBtn>
      </div>
    </EditorSheet>
  )
}
