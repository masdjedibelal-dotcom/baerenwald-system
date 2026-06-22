'use client'

import type { KiEmpfehlungRow } from '@/lib/ki-hub/types'

type Props = {
  items: KiEmpfehlungRow[]
}

function konfidenzLabel(daten: unknown): string | null {
  if (!daten || typeof daten !== 'object') return null
  const k = (daten as { konfidenz?: string }).konfidenz
  return k ?? null
}

export function KiHubGelerntSection({ items }: Props) {
  if (!items.length) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-bw-text">Was das System gelernt hat</h2>
      <div className="space-y-2">
        {items.map((item) => {
          const konf = konfidenzLabel(item.daten_basis)
          return (
            <div
              key={item.id}
              className="rounded-xl border border-bw-border bg-bw-card px-4 py-3"
            >
              <p className="text-sm font-medium text-bw-text">{item.titel}</p>
              {item.beschreibung ? (
                <p className="mt-1 text-sm text-muted">{item.beschreibung}</p>
              ) : null}
              {konf ? (
                <p className="mt-2 text-xs text-[#2E7D52]">Konfidenz: {konf}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
