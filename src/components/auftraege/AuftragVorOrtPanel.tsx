'use client'

import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type VorOrtAbschnitt = 'bautagebuch' | 'abnahme' | 'abschluss'

/**
 * Rahmen für Vor-Ort-Flow: Leistungstabelle (Tagebuch+Abnahme) → Abschlussbericht.
 * Leistungen sind die Quelle — dürfen vom Angebot abweichen.
 */
export function AuftragVorOrtPanel({
  focus,
  leistungTabelle,
  abschluss,
  baustellenExtras,
}: {
  focus?: VorOrtAbschnitt | null
  leistungTabelle: ReactNode
  abschluss: ReactNode
  /** Bauprojekte: Team, Tagesberichte, Regie … */
  baustellenExtras?: ReactNode
}) {
  useEffect(() => {
    if (!focus || typeof window === 'undefined') return
    const id =
      focus === 'abschluss'
        ? 'vor-ort-abschluss'
        : focus === 'abnahme' || focus === 'bautagebuch'
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
          <strong>Leistungen</strong> sind die Quelle. Daraus entstehen Tagebuch-Einträge und die
          Abnahme-Checkliste — der Partner macht das vor Ort im <strong>Portal</strong>. Am Ende
          fasst der <strong>Abschlussbericht</strong> alles zusammen. Leistungen hier kannst du
          hinzufügen, bearbeiten oder entfernen (auch abweichend vom Angebot).
        </p>
        <ol className="vor-ort-flow__steps" aria-label="Ablauf">
          <li
            className={cn(
              'vor-ort-flow__step',
              (focus === 'bautagebuch' || focus === 'abnahme' || !focus) && 'is-active'
            )}
          >
            <a href="#vor-ort-leistungen" className="vor-ort-flow__step-link">
              <span className="vor-ort-flow__n" aria-hidden>
                1
              </span>
              <span className="vor-ort-flow__step-text">
                <span className="vor-ort-flow__step-lbl">Leistungen + Doku</span>
                <span className="vor-ort-flow__step-wer">Tagebuch & Abnahme je Zeile</span>
              </span>
            </a>
            <span className="vor-ort-flow__arrow" aria-hidden>
              →
            </span>
          </li>
          <li className={cn('vor-ort-flow__step', focus === 'abschluss' && 'is-active')}>
            <a href="#vor-ort-abschluss" className="vor-ort-flow__step-link">
              <span className="vor-ort-flow__n" aria-hidden>
                2
              </span>
              <span className="vor-ort-flow__step-text">
                <span className="vor-ort-flow__step-lbl">Abschlussbericht</span>
                <span className="vor-ort-flow__step-wer">CRM fasst alles zusammen</span>
              </span>
            </a>
          </li>
        </ol>
      </div>

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
        Primär: Partner erfasst Tagebuch & Abnahme im Handwerker-Portal. CRM ergänzt oder korrigiert.
      </span>
    </p>
  )
}
