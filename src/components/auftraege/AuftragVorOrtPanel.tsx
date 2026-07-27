'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AuftragAbnahmeprotokollCard } from '@/components/auftraege/AuftragAbnahmeprotokollCard'
import { cn } from '@/lib/utils'

export type VorOrtAbschnitt = 'bautagebuch' | 'abnahme' | 'abschluss'

const SEGMENTS: { id: VorOrtAbschnitt; label: string }[] = [
  { id: 'abnahme', label: 'Abnahme' },
  { id: 'bautagebuch', label: 'Tagebuch' },
  { id: 'abschluss', label: 'Abschluss' },
]

function defaultSegment(focus?: VorOrtAbschnitt | null): VorOrtAbschnitt {
  return focus ?? 'abnahme'
}

/**
 * Vor Ort: ein Segment aktiv — Abnahme | Tagebuch | Abschluss.
 */
export function AuftragVorOrtPanel({
  auftragId,
  focus,
  leistungTabelle,
  abschluss,
  abschlussExtras,
  baustellenExtras,
  onRefresh,
}: {
  auftragId: string
  focus?: VorOrtAbschnitt | null
  leistungTabelle: ReactNode
  abschluss: ReactNode
  abschlussExtras?: ReactNode
  baustellenExtras?: ReactNode
  onRefresh?: () => void
}) {
  const [segment, setSegment] = useState<VorOrtAbschnitt>(() => defaultSegment(focus))

  useEffect(() => {
    if (focus) setSegment(focus)
  }, [focus])

  return (
    <div className="vor-ort-flow space-y-4">
      <div
        className="pos-segmented vor-ort-flow__segmented flex w-full max-w-md"
        role="tablist"
        aria-label="Vor Ort"
      >
        {SEGMENTS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={segment === s.id}
            className={cn(
              'pos-segmented__btn flex-1 text-center',
              segment === s.id && 'pos-segmented__btn--active'
            )}
            onClick={() => setSegment(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === 'abnahme' ? (
        <section id="vor-ort-abnahme-einstieg" className="space-y-3">
          <p className="text-[13px] text-bw-text-muted">
            Abnahmeprotokoll für die Kunden-Übergabe — Wizard erzeugt das PDF.
          </p>
          <AuftragAbnahmeprotokollCard auftragId={auftragId} onChanged={onRefresh} />
        </section>
      ) : null}

      {segment === 'bautagebuch' ? (
        <section id="vor-ort-leistungen" className="space-y-4">
          <p className="text-[13px] text-bw-text-muted">
            Einträge und Fotos je Leistung — unabhängig vom Abnahmeprotokoll.
          </p>
          {leistungTabelle}
          {baustellenExtras ? (
            <details className="vor-ort-flow__extras">
              <summary>Baustellen-Extras</summary>
              <div className="vor-ort-flow__extras-body">{baustellenExtras}</div>
            </details>
          ) : null}
        </section>
      ) : null}

      {segment === 'abschluss' ? (
        <section id="vor-ort-abschluss" className="space-y-3">
          <p className="text-[13px] text-bw-text-muted">Optionaler Abschlussbericht zum Projekt.</p>
          {abschlussExtras ? <div className="space-y-4">{abschlussExtras}</div> : null}
          {abschluss}
        </section>
      ) : null}
    </div>
  )
}

export function VorOrtPortalHinweis({ className }: { className?: string }) {
  return (
    <p className={cn('vor-ort-flow__portal-hint', className)}>
      <span>
        Partner erfasst Tagebuch im Handwerker-Portal. Abnahmeprotokoll erstellst du unter Abnahme.
      </span>
    </p>
  )
}
