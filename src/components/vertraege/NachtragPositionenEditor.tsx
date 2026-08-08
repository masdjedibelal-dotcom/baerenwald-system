'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { NachtragPositionDraft } from '@/lib/vertraege/types'

function neuePosition(gewerkName: string): NachtragPositionDraft {
  return {
    id: `neu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    quelle: 'neu',
    leistung_name: '',
    einheit: 'm²',
    menge: null,
    preis_partner: null,
    gewerk_name: gewerkName,
  }
}

export function NachtragPositionenEditor({
  positionen,
  gewerkName,
  onChange,
}: {
  positionen: NachtragPositionDraft[]
  gewerkName: string
  onChange: (next: NachtragPositionDraft[]) => void
}) {
  const update = (id: string, patch: Partial<NachtragPositionDraft>) => {
    onChange(positionen.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const remove = (id: string) => {
    onChange(positionen.filter((p) => p.id !== id))
  }

  const add = () => {
    onChange([...positionen, neuePosition(gewerkName)])
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-bw-text-muted">
        Passe bestehende Positionen an oder füge neue Leistungen für den Nachtrag hinzu. §2 und §3
        werden daraus automatisch erzeugt.
      </p>

      {positionen.length === 0 ? (
        <p className="rounded-lg border border-dashed border-bw-border bg-bw-bg-soft p-4 text-sm text-bw-text-muted">
          Noch keine Positionen — füge eine Ergänzungsleistung hinzu.
        </p>
      ) : (
        <ul className="space-y-3">
          {positionen.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-bw-border bg-bw-bg-soft/50 p-3 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-bw-text-muted">
                  {p.quelle === 'neu' ? 'Neue Leistung' : 'Bestehende Position'}
                </span>
                <button
                  type="button"
                  className="rounded p-1 text-bw-text-muted hover:bg-bw-hover hover:text-red-600"
                  onClick={() => remove(p.id)}
                  aria-label="Position entfernen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Input
                label="Leistung"
                value={p.leistung_name}
                onChange={(e) => update(p.id, { leistung_name: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Menge"
                  type="number"
                  min={0}
                  step="any"
                  value={p.menge ?? ''}
                  onChange={(e) =>
                    update(p.id, { menge: e.target.value ? Number(e.target.value) : null })
                  }
                />
                <Input
                  label="Einheit"
                  value={p.einheit ?? ''}
                  onChange={(e) => update(p.id, { einheit: e.target.value || null })}
                  placeholder="m², Pauschal, h …"
                />
                <Input
                  label="Preis Partner netto (€)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.preis_partner ?? ''}
                  onChange={(e) =>
                    update(p.id, {
                      preis_partner: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={add}>
        <Plus className="h-4 w-4" aria-hidden />
        Position hinzufügen
      </Button>
    </div>
  )
}
