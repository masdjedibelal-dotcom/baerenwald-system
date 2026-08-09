'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type GewerkOpt = { id: string; name: string; slug: string }

export function AuftragGewerkAddRow({
  gewerke,
  disabled,
  onAdd,
  className,
}: {
  gewerke: GewerkOpt[]
  disabled?: boolean
  onAdd: (gewerk: GewerkOpt) => void
  className?: string
}) {
  const [gewerkId, setGewerkId] = useState('')

  function handleAdd() {
    const g = gewerke.find((x) => x.id === gewerkId)
    if (!g) return
    onAdd(g)
    setGewerkId('')
  }

  if (!gewerke.length) {
    return (
      <p className="text-sm text-bw-text-muted">
        Keine Gewerke in den Stammdaten hinterlegt.
      </p>
    )
  }

  return (
    <div className={className ?? 'pos-gewerk-add-row'}>
      <span className="pos-gewerk-add-label">Gewerk hinzufügen</span>
      <select
        className="input"
        value={gewerkId}
        disabled={disabled}
        onChange={(e) => setGewerkId(e.target.value)}
        aria-label="Gewerk auswählen"
      >
        <option value="">Gewerk wählen…</option>
        {gewerke.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled || !gewerkId}
        onClick={handleAdd}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Abschnitt
      </Button>
    </div>
  )
}
