'use client'

import { useState, useTransition } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import {
  suggestKatalogPositionen,
  type KatalogSuggestItem,
} from '@/app/(dashboard)/katalog/suggest-actions'
import { cn } from '@/lib/utils'

export type PosBoardSuggestContext = {
  text: string
  gewerkHints?: string[]
}

type Props = {
  context: PosBoardSuggestContext
  existingVarianteIds?: Set<string> | string[]
  onAccept: (item: KatalogSuggestItem) => void
  className?: string
}

/**
 * KI-/Katalog-Vorschläge am PosBoard: laden, anzeigen, ausblenden (ohne löschen), übernehmen.
 */
export function PosBoardKiSuggestions({
  context,
  existingVarianteIds,
  onAccept,
  className,
}: Props) {
  const [items, setItems] = useState<KatalogSuggestItem[] | null>(null)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set())
  const [panelOpen, setPanelOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const existing = existingVarianteIds
    ? existingVarianteIds instanceof Set
      ? existingVarianteIds
      : new Set(existingVarianteIds)
    : new Set<string>()

  function load() {
    setError(null)
    startTransition(async () => {
      try {
        const list = await suggestKatalogPositionen({
          text: context.text,
          gewerkHints: context.gewerkHints,
          limit: 8,
        })
        setItems(list)
        setPanelOpen(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Vorschläge fehlgeschlagen')
      }
    })
  }

  const visible =
    items?.filter((i) => !hiddenIds.has(i.variante_id) && !existing.has(i.variante_id)) ?? []
  const hiddenCount = items
    ? items.filter((i) => hiddenIds.has(i.variante_id)).length
    : 0

  return (
    <div className={cn('mb-3 rounded-lg border border-bw-border bg-bw-surface-2/60', className)}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <MockIcon ctx="btn" n="sparkles" size={14} />
        <span className="text-[13px] font-semibold text-bw-text">KI Positionen</span>
        <div className="flex-1" />
        {items && items.length > 0 ? (
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? 'Ausblenden' : 'Einblenden'}
            {hiddenCount > 0 && !panelOpen ? ` (${hiddenCount} versteckt)` : ''}
          </button>
        ) : null}
        <button
          type="button"
          className="btn secondary sm"
          disabled={pending || !context.text.trim()}
          onClick={() => load()}
        >
          {pending ? 'Sucht…' : items ? 'Neu vorschlagen' : 'Vorschlagen'}
        </button>
      </div>

      {error ? (
        <p className="border-t border-bw-border px-3 py-2 text-[12px] text-danger">{error}</p>
      ) : null}

      {panelOpen && items ? (
        <div className="space-y-1.5 border-t border-bw-border px-3 py-2">
          {visible.length === 0 ? (
            <p className="text-[12px] text-bw-text-muted">
              {items.length === 0
                ? 'Keine passenden Katalog-Positionen gefunden.'
                : 'Alle Vorschläge ausgeblendet oder bereits übernommen.'}
            </p>
          ) : (
            visible.map((item) => (
              <div
                key={item.variante_id}
                className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2.5 py-2 text-[12px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-bw-text">
                    {item.titel}
                    <span className="ml-1.5 rounded bg-[#E8F5EE] px-1.5 py-0.5 text-[10px] font-semibold text-[#2E7D52]">
                      KI
                    </span>
                  </p>
                  <p className="truncate text-bw-text-muted">
                    {[item.gewerk_name, item.variante, item.preis_label, item.reason]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn ghost sm"
                  title="Ausblenden"
                  onClick={() =>
                    setHiddenIds((prev) => {
                      const next = new Set(prev)
                      next.add(item.variante_id)
                      return next
                    })
                  }
                >
                  <MockIcon ctx="btn" n="eye" size={14} />
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => onAccept(item)}
                >
                  Übernehmen
                </button>
              </div>
            ))
          )}
          {hiddenCount > 0 ? (
            <button
              type="button"
              className="text-[11px] text-[#2E7D52] underline"
              onClick={() => setHiddenIds(new Set())}
            >
              {hiddenCount} ausgeblendete wieder anzeigen
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
