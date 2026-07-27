'use client'

import { useEffect, useState } from 'react'
import { searchKunden } from '@/app/(dashboard)/angebote/actions'
import { PickerSheet } from '@/components/surfaces/PickerSheet'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import type { EditorSheetContext } from '@/components/surfaces/EditorSheet'
import type { Kunde } from '@/lib/types'

/**
 * Surface-Picker: Kunde suchen/wählen · Header-+ = Neu (kein zweites Neu in der Liste).
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
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Kunde[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setQ('')
    setRows([])
  }, [open])

  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (term.length < 2) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(() => {
      void searchKunden(term)
        .then((r) => setRows(r.kunden))
        .finally(() => setLoading(false))
    }, 280)
    return () => clearTimeout(t)
  }, [q, open])

  const emptyHint =
    q.trim().length < 2
      ? 'Name, E-Mail oder Telefon eingeben…'
      : loading
        ? 'Suche…'
        : 'Keine Treffer.'

  return (
    <PickerSheet
      open={open}
      onClose={onClose}
      title={title}
      context={context}
      onNeu={onNeu}
      search={
        <input
          className="sel w-full"
          placeholder="Suchen…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      }
      searchPlacement="top"
      empty={rows.length === 0 ? <p className="picker-sheet__empty">{emptyHint}</p> : undefined}
    >
      <ul className="picker-sheet__rows">
        {rows.map((k) => (
          <li key={k.id}>
            <button type="button" className="picker-sheet__row" onClick={() => onPick(k)}>
              <span className="picker-sheet__row-title">{kundeDisplayName(k)}</span>
              <span className="picker-sheet__row-meta">
                {[k.email, k.telefon, [k.plz, k.ort].filter(Boolean).join(' ')]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </PickerSheet>
  )
}
