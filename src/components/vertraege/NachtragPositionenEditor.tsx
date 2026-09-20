'use client'

<<<<<<< Updated upstream
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
=======
import { Plus, Trash2 } from 'lucide-react'
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
>>>>>>> Stashed changes
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
        <p className="rounded-card border border-dashed border-bw-border bg-bw-bg-soft p-4 text-sm text-bw-text-muted">
          Noch keine Positionen — füge eine Ergänzungsleistung hinzu.
        </p>
      ) : (
        <ul className="space-y-3">
          {positionen.map((p) => (
            <li
              key={p.id}
              className="rounded-card border border-bw-border bg-bw-bg-soft/50 p-3 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-bw-text-muted">
                  {p.quelle === 'neu' ? 'Neue Leistung' : 'Bestehende Position'}
                </span>
                <MockBtn className="rounded-button p-1 text-bw-text-muted hover:bg-bw-hover hover:text-danger" type="button" onClick={() => remove(p.id)} aria-label="Position löschen">
                  <MockIcon n="trash" ctx="default" className="h-4 w-4" />
                </MockBtn>
              </div>
              <MockField label="Leistung"><MockInput value={p.leistung_name} onChange={(e) => update(p.id, { leistung_name: e.target.value })} /></MockField>
              <div className="grid gap-3 sm:grid-cols-3">
                <MockField label="Menge"><MockInput type="number" min={0} step="any" value={p.menge ?? ''} onChange={(e) =>
                    update(p.id, { menge: e.target.value ? Number(e.target.value) : null })} /></MockField>
                <MockField label="Einheit"><MockInput value={p.einheit ?? ''} onChange={(e) => update(p.id, { einheit: e.target.value || null })} placeholder="m², Pauschal, h …" /></MockField>
                <MockField label="Preis Partner netto (€)"><MockInput type="number" min={0} step="0.01" value={p.preis_partner ?? ''} onChange={(e) =>
                    update(p.id, {
                      preis_partner: e.target.value ? Number(e.target.value) : null,
                    })} /></MockField>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MockBtn type="button" kind="secondary" sm className="gap-1.5" onClick={add}>
<<<<<<< Updated upstream
        <MockIcon n="plus" ctx="default" className="h-4 w-4" aria-hidden />
=======
        <Plus className="h-4 w-4" aria-hidden />
>>>>>>> Stashed changes
        Position hinzufügen
      </MockBtn>
    </div>
  )
}
