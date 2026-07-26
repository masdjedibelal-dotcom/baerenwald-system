'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export type VorOrtAbschnitt = 'bautagebuch' | 'abnahme' | 'abschluss'

/**
 * Einstieg: Abnahmeprotokoll ODER Bautagebuch — dann optional Abschlussbericht.
 */
export function AuftragVorOrtPanel({
  auftragId,
  focus,
  leistungTabelle,
  abschluss,
  baustellenExtras,
  hasAbnahmePdf,
  abnahmePdfUrl,
}: {
  auftragId: string
  focus?: VorOrtAbschnitt | null
  leistungTabelle: ReactNode
  abschluss: ReactNode
  baustellenExtras?: ReactNode
  hasAbnahmePdf?: boolean
  abnahmePdfUrl?: string | null
}) {
  useEffect(() => {
    if (!focus || typeof window === 'undefined') return
    const id =
      focus === 'abschluss'
        ? 'vor-ort-abschluss'
        : focus === 'abnahme'
          ? 'vor-ort-abnahme-einstieg'
          : focus === 'bautagebuch'
            ? 'vor-ort-leistungen'
            : null
    if (!id) return
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => window.clearTimeout(t)
  }, [focus])

  return (
    <div className="vor-ort-flow space-y-5">
      <div className="vor-ort-flow__intro">
        <p className="vor-ort-flow__lead">
          Zwei Wege: <strong>Abnahmeprotokoll</strong> für die Kunden-Übergabe (Wizard → PDF), oder{' '}
          <strong>Bautagebuch</strong> für laufende Vor-Ort-Dokumentation. Abschlussbericht ist
          optional.
        </p>
      </div>

      <section id="vor-ort-abnahme-einstieg" className="scroll-mt-24">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={`/auftraege/${auftragId}/abnahme/erstellen`}
            className={cn(
              'block rounded-xl border-2 p-4 transition-colors',
              focus === 'abnahme' || !focus
                ? 'border-bw-green bg-bw-green/5'
                : 'border-bw-border hover:border-bw-green/50'
            )}
          >
            <p className="text-sm font-semibold text-bw-text">Abnahmeprotokoll erstellen</p>
            <p className="mt-1 text-xs text-bw-text-muted">
              Schritt für Schritt: Übergabe, Personen, Leistungen → PDF wie Kundenmuster
            </p>
            {hasAbnahmePdf && abnahmePdfUrl ? (
              <p className="mt-2 text-xs font-medium text-bw-green">Bereits vorhanden — neu erstellen möglich</p>
            ) : null}
          </Link>
          <a
            href="#vor-ort-leistungen"
            className={cn(
              'block rounded-xl border p-4 transition-colors',
              focus === 'bautagebuch'
                ? 'border-bw-green bg-bw-green/5'
                : 'border-bw-border hover:border-bw-border-strong'
            )}
          >
            <p className="text-sm font-semibold text-bw-text">Bautagebuch / Vor-Ort-Doku</p>
            <p className="mt-1 text-xs text-bw-text-muted">
              Einträge und Fotos je Leistung — unabhängig vom Abnahmeprotokoll
            </p>
          </a>
        </div>
        {hasAbnahmePdf && abnahmePdfUrl ? (
          <p className="mt-3 text-sm">
            <a
              className="link"
              href={abnahmePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Letztes Abnahmeprotokoll öffnen
            </a>
          </p>
        ) : null}
      </section>

      <section id="vor-ort-leistungen" className="scroll-mt-24">
        {leistungTabelle}
      </section>

      {baustellenExtras ? (
        <details className="vor-ort-flow__extras">
          <summary>Baustellen-Extras (Team, Tagesberichte, Regie)</summary>
          <div className="vor-ort-flow__extras-body">{baustellenExtras}</div>
        </details>
      ) : null}

      <section id="vor-ort-abschluss" className="scroll-mt-24">
        {abschluss}
      </section>
    </div>
  )
}

export function VorOrtPortalHinweis({ className }: { className?: string }) {
  return (
    <p className={cn('vor-ort-flow__portal-hint', className)}>
      <span>
        Primär: Partner erfasst Tagebuch im Handwerker-Portal. Abnahmeprotokoll erstellst du im
        Wizard oben.
      </span>
    </p>
  )
}
