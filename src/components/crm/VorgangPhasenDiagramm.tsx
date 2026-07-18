'use client'

import Link from 'next/link'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import type { ProjektKontext } from '@/lib/crm/projekt-kontext-types'
import type { VorgangPhase } from '@/lib/vorgang/types'
import { cn } from '@/lib/utils'

const PHASES: { id: VorgangPhase; label: string }[] = [
  { id: 'anfrage', label: 'Anfrage' },
  { id: 'angebot', label: 'Angebot' },
  { id: 'auftrag', label: 'Auftrag' },
  { id: 'rechnung', label: 'Rechnung' },
]

const PHASE_ORDER: Record<VorgangPhase, number> = {
  anfrage: 0,
  angebot: 1,
  auftrag: 2,
  rechnung: 3,
}

function hrefForPhase(ctx: ProjektKontext | null | undefined, phase: VorgangPhase): string | null {
  if (!ctx) return null
  if (phase === 'anfrage') return ctx.lead ? `/anfragen/${ctx.lead.id}` : null
  if (phase === 'angebot') {
    const a =
      ctx.activeKind === 'angebot'
        ? ctx.angebote.find((x) => x.id === ctx.activeId) ?? ctx.angebote[0]
        : ctx.angebote[0]
    return a ? `/angebote/${a.id}` : null
  }
  if (phase === 'auftrag') return ctx.auftrag ? `/auftraege/${ctx.auftrag.id}` : null
  if (phase === 'rechnung') {
    const r =
      ctx.activeKind === 'rechnung'
        ? ctx.rechnungen.find((x) => x.id === ctx.activeId) ?? ctx.rechnungen[0]
        : ctx.rechnungen[0]
    return r ? `/rechnungen/${r.id}` : null
  }
  return null
}

function phaseReached(ctx: ProjektKontext | null | undefined, phase: VorgangPhase): boolean {
  if (!ctx) return false
  if (phase === 'anfrage') return Boolean(ctx.lead)
  if (phase === 'angebot') return ctx.angebote.length > 0
  if (phase === 'auftrag') return Boolean(ctx.auftrag)
  if (phase === 'rechnung') return ctx.rechnungen.length > 0
  return false
}

/**
 * Horizontales Phasen-Diagramm: Anfrage → Angebot → Auftrag → Rechnung.
 * Erreichte Phasen sind klickbar, aktuelle hervorgehoben.
 */
export function VorgangPhasenDiagramm({
  activePhase,
  projektKontext,
  className,
}: {
  activePhase: VorgangPhase
  projektKontext?: ProjektKontext | null
  className?: string
}) {
  const activeIdx = PHASE_ORDER[activePhase]

  return (
    <nav
      aria-label="Vorgangsphasen"
      className={cn('vorgang-phasen-diagramm', className)}
      style={{ marginTop: 14, marginBottom: 24 }}
    >
      <ol
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 4,
          listStyle: 'none',
          margin: 0,
          padding: 0,
          width: '100%',
        }}
      >
        {PHASES.map((p, i) => {
          const isCurrent = p.id === activePhase
          const isPast = i < activeIdx
          const reached = isPast || isCurrent || phaseReached(projektKontext, p.id)
          const href = hrefForPhase(projektKontext, p.id)
          const canLink = Boolean(href) && !isCurrent && reached

          const circle = (
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 999,
                border: `2px solid ${
                  isCurrent || isPast ? 'var(--green)' : 'var(--border-2, #e5e7eb)'
                }`,
                background:
                  isPast
                    ? 'var(--green)'
                    : isCurrent
                      ? 'var(--bg, #fff)'
                      : 'var(--bg, #fff)',
                color: isPast ? '#fff' : isCurrent ? 'var(--text)' : 'var(--text-4)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {isPast ? <MockIcon ctx="btn" n="check" size={14} /> : i + 1}
            </span>
          )

          const label = (
            <span
              style={{
                marginTop: 6,
                fontSize: 11.5,
                fontWeight: isCurrent ? 650 : 500,
                color: isCurrent ? 'var(--text)' : 'var(--text-3)',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              {p.label}
            </span>
          )

          return (
            <li
              key={p.id}
              style={{
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 0,
                position: 'relative',
              }}
            >
              {i > 0 ? (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: '-50%',
                    right: '50%',
                    top: 13,
                    height: 2,
                    background:
                      i <= activeIdx ? 'var(--green)' : 'var(--border-2, #e5e7eb)',
                    zIndex: 0,
                  }}
                />
              ) : null}
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {canLink && href ? (
                  <Link
                    href={href}
                    aria-label={`Zur Phase ${p.label}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}
                  >
                    {circle}
                    {label}
                  </Link>
                ) : (
                  <div
                    aria-current={isCurrent ? 'step' : undefined}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    {circle}
                    {label}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
