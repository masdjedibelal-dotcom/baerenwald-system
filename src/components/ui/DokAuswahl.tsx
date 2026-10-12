'use client'

import { useMemo, useState, type ReactNode } from 'react'

import { ListBulkBar } from '@/components/mock-ui/ListBulkBar'
import { openDeleteConfirm } from '@/components/ui/ConfirmPopup'
import { toast } from '@/components/ui/app-toast'

type Ergebnis = { ok: true } | { ok: false; message: string }

/**
 * Mehrfachauswahl für Dokument-Listen (mobil): Häkchen an löschbaren Zeilen,
 * graue Leiste mit „Löschen“ wie in den anderen Listen.
 */
export function useDokAuswahl<T>({
  rows,
  rowId,
  loeschbar,
  loeschen,
  onFertig,
}: {
  rows: T[]
  rowId: (row: T) => string
  loeschbar: (row: T) => boolean
  loeschen: (row: T) => Promise<Ergebnis>
  onFertig: () => void
}): {
  auswahlFuer: (row: T) => { checked: boolean; onToggle: () => void } | undefined
  leiste: ReactNode
} {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const kandidaten = useMemo(() => rows.filter(loeschbar), [rows, loeschbar])
  const gewaehlt = kandidaten.filter((r) => ids.has(rowId(r)))
  const alle = kandidaten.length > 0 && gewaehlt.length === kandidaten.length

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function loeschenStarten() {
    const liste = [...gewaehlt]
    if (!liste.length) return
    openDeleteConfirm(
      liste.length === 1 ? 'Dokument löschen?' : `${liste.length} Dokumente löschen?`,
      async () => {
        let fehler = 0
        for (const row of liste) {
          const r = await loeschen(row)
          if (!r.ok) fehler++
        }
        setIds(new Set())
        onFertig()
        if (fehler) toast.error(`${fehler} von ${liste.length} Dokumenten konnten nicht gelöscht werden.`)
        else toast.success(liste.length === 1 ? 'Dokument gelöscht' : `${liste.length} Dokumente gelöscht`)
      },
      { sub: liste.length === 1 ? String((liste[0] as { name?: string }).name ?? '') : undefined }
    )
  }

  return {
    auswahlFuer: (row) =>
      loeschbar(row) ? { checked: ids.has(rowId(row)), onToggle: () => toggle(rowId(row)) } : undefined,
    leiste: (
      <ListBulkBar
        selectedCount={gewaehlt.length}
        onClear={() => setIds(new Set())}
        onDelete={loeschenStarten}
        onToggleAll={() => setIds(alle ? new Set() : new Set(kandidaten.map(rowId)))}
        allSelected={alle}
      />
    ),
  }
}
