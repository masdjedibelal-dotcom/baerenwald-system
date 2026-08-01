'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StaffChoiceOption = {
  value: string
  label: string
  hint?: string
  /** Dateiname unter `/icons/{icon}.svg` (Website-Funnel) */
  icon?: string
  tag?: string
}

function FunnelIcon({ name }: { name: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- lokale SVG-Icons aus /public/icons
    <img src={`/icons/${name}.svg`} alt="" width={22} height={22} decoding="async" />
  )
}

export function StaffChoiceGrid({
  options,
  value,
  values,
  multi,
  onChange,
  onToggle,
  columns = 2,
}: {
  options: StaffChoiceOption[]
  value?: string
  values?: string[]
  multi?: boolean
  onChange?: (v: string) => void
  onToggle?: (v: string) => void
  columns?: 1 | 2 | 3
}) {
  return (
    <div
      className={cn(
        'sf-tile-grid',
        columns === 1 && 'cols-1',
        columns === 3 && 'cols-3'
      )}
    >
      {options.map((o) => {
        const selected = multi ? values?.includes(o.value) : value === o.value
        return (
          <button
            key={o.value}
            type="button"
            className={cn('funnel-tile', multi && 'multi', selected && 'selected')}
            onClick={() => (multi ? onToggle?.(o.value) : onChange?.(o.value))}
          >
            <span className="funnel-tile-check" aria-hidden />
            {o.icon ? (
              <span className="funnel-tile-icon-wrap" aria-hidden>
                <FunnelIcon name={o.icon} />
              </span>
            ) : null}
            <p className="funnel-tile-label">{o.label}</p>
            {o.hint ? <p className="funnel-tile-hint">{o.hint}</p> : null}
            {o.tag ? <span className="funnel-tile-tag">{o.tag}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

export function StaffSkipHint({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      className="mt-4 text-[length:var(--fs-meta)] font-medium text-[var(--text-3)] underline-offset-2 hover:text-[var(--text)] hover:underline"
      onClick={onSkip}
    >
      Weiß ich nicht / überspringen
    </button>
  )
}

export function StaffStepTitle({
  title,
  sub,
}: {
  title: string
  sub?: string
}) {
  return (
    <div className="mb-1">
      <h2 className="sf-step-title">{title}</h2>
      {sub ? <p className="sf-step-sub">{sub}</p> : <div className="mb-5" />}
    </div>
  )
}

/** CRM-only Felder — klar vom Website-Funnel getrennt. */
export function StaffInternBlock({
  title = 'Nur intern (CRM)',
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <div className="sf-intern">
      <div className="sf-intern-label">{title}</div>
      {children}
    </div>
  )
}

export function StaffPreisIndikation({
  min,
  max,
  komplex,
}: {
  min: number | null
  max: number | null
  komplex?: boolean
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n)

  const empty = komplex || (min == null && max == null)
  const hasRange = !empty && min != null && max != null && min !== max
  const fixed = !empty && min != null && max != null && min === max

  return (
    <div className={empty ? 'preis-karte preis-karte--empty' : 'preis-karte'}>
      <p className="preis-karte-kicker">
        {fixed ? 'Unverbindlicher Preis' : 'Unverbindlicher Preisrahmen'}
      </p>
      <div className="preis-karte-range">
        {empty ? (
          <>
            <span className="preis-karte-zahl preis-karte-zahl--dash">—</span>
            <span className="preis-karte-trenner">–</span>
            <span className="preis-karte-zahl preis-karte-zahl--dash">—</span>
          </>
        ) : hasRange ? (
          <>
            <span className="preis-karte-zahl">{fmt(min!)}</span>
            <span className="preis-karte-trenner">–</span>
            <span className="preis-karte-zahl">{fmt(max!)}</span>
          </>
        ) : (
          <span className="preis-karte-zahl">{fmt(min ?? max ?? 0)}</span>
        )}
      </div>
    </div>
  )
}
