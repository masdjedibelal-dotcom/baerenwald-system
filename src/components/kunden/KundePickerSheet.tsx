'use client'

import { useEffect, useMemo, useState } from 'react'
import { listKundenFuerCombobox } from '@/app/(dashboard)/kunden/kunde-combobox-actions'
import { Combobox } from '@/components/ui/Combobox'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { EditorSheetContext } from '@/components/surfaces/EditorSheet'
import type { Kunde } from '@/lib/types'

/**
 * Kundenwahl als Overlay (kein weißer Host).
 * Bestand: Combobox. Neu: direkt Create-Formular (`onNeu`) — ohne Extra-Klick.
 */
export function KundePickerSheet({
  open,
  onClose,
  onPick,
  onNeu,
  title = 'Kunde',
  context = 'canvas',
  manageHistory = true,
}: {
  open: boolean
  onClose: () => void
  onPick: (kunde: Kunde) => void
  onNeu?: () => void
  title?: string
  context?: EditorSheetContext
  manageHistory?: boolean
}) {
  const [rows, setRows] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (!open) return
    setValue('')
    setLoading(true)
    void listKundenFuerCombobox()
      .then((r) => setRows(r.kunden))
      .finally(() => setLoading(false))
  }, [open])

  const options = useMemo(
    () =>
      rows.map((k) => ({
        value: k.id,
        label: kundeDisplayName(k),
        sub:
          [k.email, k.telefon, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ') ||
          undefined,
      })),
    [rows]
  )

  const byId = useMemo(() => new Map(rows.map((k) => [k.id, k])), [rows])

  function pickValue(id: string) {
    setValue(id)
    const k = byId.get(id)
    if (k) onPick(k)
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      size="md"
      manageHistory={manageHistory}
    >
      <div className="kunde-pick space-y-4">
        <div>
          <p className="kunde-pick__q">Kunde auswählen</p>
          <div className="hw-anfrage-seg" role="group" aria-label="Neu oder Bestand">
            <button
              type="button"
              className="hw-anfrage-seg-btn is-active"
              disabled
            >
              Bestand
            </button>
            <button
              type="button"
              className="hw-anfrage-seg-btn"
              onClick={() => onNeu?.()}
              disabled={!onNeu}
            >
              Neu
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">Kunden werden geladen…</p>
        ) : (
          <Combobox
            label="Kunde"
            options={options}
            value={value}
            onChange={pickValue}
            placeholder="Kunde wählen oder tippen…"
            emptyLabel="Keine Treffer"
          />
        )}
      </div>
    </EditorSheet>
  )
}
