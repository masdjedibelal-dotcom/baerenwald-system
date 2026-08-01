'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { useAssistent } from '@/components/assistent/AssistentProvider'
import { cn } from '@/lib/utils'

export type PosBoardSuggestContext = {
  text: string
  gewerkHints?: string[]
}

type Props = {
  /** Optionaler Anfrage-/Projektkontext (nur als Hinweis, kein Auto-Vorschlag) */
  context?: PosBoardSuggestContext | null
  className?: string
}

/**
 * Öffnet den Assistenten im Modus „mehrere Positionen“.
 * Nutzer beschreibt die Arbeiten im Chat → Übernehmen legt alle Positionen an.
 */
export function PosBoardKiSuggestions({ context, className }: Props) {
  const { openScoped } = useAssistent()

  function openChat() {
    const hints = context?.gewerkHints?.filter(Boolean) ?? []
    const ctxText = context?.text?.trim() ?? ''
    const extraParts = [
      'Nutzer beschreibt Arbeiten im Chat. Daraus mehrere konkrete Kalkulationspositionen erzeugen.',
      'Kein Katalog-Matching und keine Vorschläge ohne Nutzerbeschreibung.',
      hints.length ? `Gewerk-Hinweise: ${hints.join(', ')}.` : null,
      ctxText
        ? `Optionaler Projekt-/Anfragekontext (nur falls hilfreich, nicht automatisch in Positionen umsetzen):\n${ctxText.slice(0, 1200)}`
        : null,
    ]
    openScoped({
      scopeId: 'positionen',
      layer: 'over-sheet',
      extraHint: extraParts.filter(Boolean).join('\n'),
      draftInput: null,
    })
  }

  return (
    <div className={cn('mb-3 rounded-lg border border-bw-border bg-bw-surface-2/60', className)}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <MockIcon ctx="default" n="sparkles" size={14} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-bw-text">KI Positionen</p>
          <p className="text-[11px] leading-snug text-bw-text-muted">
            Arbeiten beschreiben — mehrere Positionen auf einmal übernehmen
          </p>
        </div>
        <button type="button" className="btn primary sm" onClick={openChat}>
          Beschreiben
        </button>
      </div>
    </div>
  )
}
