'use client'

import { useEffect, useMemo, useState } from 'react'
import { listKundenFuerCombobox } from '@/app/(dashboard)/kunden/kunde-combobox-actions'
import { Combobox, COMBOBOX_OPTION_THRESHOLD } from '@/components/ui/Combobox'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { EditorSheetContext } from '@/components/surfaces/EditorSheet'
import type { Kunde } from '@/lib/types'

/**
 * N4 / Spec §14: Kundenwahl als Combobox (kein natives Select, kein Listen-Picker-Sheet).
 * Lädt bis 200 Kunden; bei >15 greift Combobox-Tipp-Filter (Threshold).
 */
export function KundePickerSheet({
  open,
  onClose,
  onPick,
  onNeu,
  title = 'Kunde',
  context = 'canvas',
}: {
  open: boolean
  onClose: () => void
  onPick: (kunde: Kunde) => void
  onNeu?: () => void
  title?: string
  context?: EditorSheetContext
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
    if (k) {
      onPick(k)
      onClose()
    }
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      size="md"
      headerEnd={
        onNeu ? (
          <button type="button" className="editor-sheet__confirm-text" onClick={onNeu}>
            Neu
          </button>
        ) : null
      }
    >
      <div className="space-y-3">
        {loading ? (
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">Kunden werden geladen…</p>
        ) : (
          <>
            <Combobox
              label="Kunde"
              options={options}
              value={value}
              onChange={pickValue}
              placeholder="Kunde wählen oder tippen…"
              emptyLabel="Keine Treffer"
            />
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
              {options.length > COMBOBOX_OPTION_THRESHOLD
                ? `${options.length} Kunden — tippen zum Filtern (Combobox >${COMBOBOX_OPTION_THRESHOLD}).`
                : options.length === 0
                  ? 'Noch keine Kunden — „Neu“ anlegen.'
                  : `${options.length} Kunden.`}
            </p>
          </>
        )}
      </div>
    </EditorSheet>
  )
}
