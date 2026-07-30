'use client'

import type { ReactNode } from 'react'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { cn } from '@/lib/utils'

export function MetaCrowButton({
  label,
  value,
  onClick,
  className,
}: {
  label: string
  value: string
  onClick: () => void
  className?: string
}) {
  return (
    <button type="button" className={cn('crow crow--tap', className)} onClick={onClick}>
      <span className="crow-head">
        <span className="crow-lab">{label}</span>
        <span className="crow-val">{value || '—'}</span>
        <MockIcon ctx="default" n="chevron-right" size={14} className="crow-chv" />
      </span>
    </button>
  )
}

export function DcTotalBlock({
  netto,
  ust,
  brutto,
  ustLabel = 'MwSt',
  showUst = true,
  hint,
}: {
  netto: number
  ust: number
  brutto: number
  ustLabel?: string
  showUst?: boolean
  hint?: ReactNode
}) {
  return (
    <div className="dc-total">
      {showUst ? (
        <>
          <div className="dc-total-r">
            <span>Netto</span>
            <span>{formatEurBetrag(netto)}</span>
          </div>
          <div className="dc-total-r" style={{ marginTop: 4 }}>
            <span>{ustLabel}</span>
            <span>{formatEurBetrag(ust)}</span>
          </div>
        </>
      ) : null}
      <div className="dc-total-r" style={{ marginTop: showUst ? 8 : 0 }}>
        <span style={{ fontWeight: 700, color: 'var(--text)' }}>
          {showUst ? 'Brutto' : 'Gesamt'}
        </span>
        <span className="dc-total-v">{formatEurBetrag(brutto)}</span>
      </div>
      {hint ? <div className="dc-total-s">{hint}</div> : null}
    </div>
  )
}

export function TotBand({
  netto,
  ust,
  brutto,
  ustLabel = 'MwSt',
  showUst = true,
  bereitsGezahlt,
  restBrutto,
  className,
}: {
  netto: number
  ust: number
  brutto: number
  ustLabel?: string
  showUst?: boolean
  /** Schlussrechnung: Abschläge abziehen */
  bereitsGezahlt?: Array<{ label: string; brutto: number }> | null
  restBrutto?: number | null
  className?: string
}) {
  const hatAbzug = Boolean(bereitsGezahlt?.length && (restBrutto == null || restBrutto >= 0))
  return (
    <div className={cn('totband', className)}>
      {showUst ? (
        <>
          <div className="totband-r">
            <span>Netto</span>
            <span>{formatEurBetrag(netto)}</span>
          </div>
          <div className="totband-r">
            <span>{ustLabel}</span>
            <span>{formatEurBetrag(ust)}</span>
          </div>
        </>
      ) : null}
      <div className={hatAbzug ? 'totband-r' : 'totband-t'}>
        <span>{showUst ? (hatAbzug ? 'Brutto' : 'Brutto') : 'Gesamt'}</span>
        <span>{formatEurBetrag(brutto)}</span>
      </div>
      {hatAbzug
        ? bereitsGezahlt!.map((z) => (
            <div key={z.label} className="totband-r">
              <span>Bereits gezahlt · {z.label}</span>
              <span>−{formatEurBetrag(z.brutto)}</span>
            </div>
          ))
        : null}
      {hatAbzug && restBrutto != null ? (
        <div className="totband-t">
          <span>Restsumme</span>
          <span>{formatEurBetrag(restBrutto)}</span>
        </div>
      ) : null}
    </div>
  )
}
