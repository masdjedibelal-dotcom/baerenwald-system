'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn, MockSelect } from '@/components/mock-ui'
import { useState } from 'react'
<<<<<<< Updated upstream
=======
import { Plus } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'

>>>>>>> Stashed changes
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
      <p className="text-[length:var(--fs-text)] text-bw-text-muted">
        Keine Gewerke in den Stammdaten hinterlegt.
      </p>
    )
  }

  return (
    <div className={className ?? 'pos-gewerk-add-row'}>
      <span className="pos-gewerk-add-label">Gewerk hinzufügen</span>
      <MockSelect value={gewerkId} disabled={disabled} onChange={(e) => setGewerkId(e.target.value)} aria-label="Gewerk auswählen">
        <option value="">Gewerk wählen…</option>
        {gewerke.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
<<<<<<< Updated upstream
      </MockSelect>
=======
      </select>
>>>>>>> Stashed changes
      <MockBtn
        type="button"
        kind="secondary" sm
        disabled={disabled || !gewerkId}
        onClick={handleAdd}
      >
        <MockIcon n="plus" ctx="default" className="h-3.5 w-3.5" aria-hidden />
        Abschnitt
      </MockBtn>
    </div>
  )
}
