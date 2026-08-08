'use client'

import { formatEurBetrag } from '@/lib/dokument-zeilen'

export function PosTotals({
  netto,
  ust,
  brutto,
  showUst = true,
  ustLabel = 'MwSt 19%',
  className,
}: {
  netto: number
  ust: number
  brutto: number
  showUst?: boolean
  /** z. B. „MwSt 0% (§13b)“ bei Reverse Charge */
  ustLabel?: string
  className?: string
}) {
  const su = showUst !== false
  const row: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 'var(--fs-text)',
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        marginLeft: 'auto',
        maxWidth: 300,
        marginTop: 12,
        padding: '10px 2px 2px',
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        boxShadow: 'none',
      }}
    >
      {su ? (
        <>
          <div style={row}>
            <span style={{ color: 'var(--text-3)' }}>Netto</span>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEurBetrag(netto)}</b>
          </div>
          <div style={row}>
            <span style={{ color: 'var(--text-3)' }}>{ustLabel}</span>
            <b style={{ fontVariantNumeric: 'tabular-nums' }}>{formatEurBetrag(ust)}</b>
          </div>
        </>
      ) : null}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 'var(--fs-title)',
          paddingTop: su ? 6 : 0,
          borderTop: su ? '0.5px solid var(--border)' : 'none',
        }}
      >
        <span style={{ fontWeight: 600 }}>{su ? 'Brutto' : 'Gesamt'}</span>
        <b style={{ color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
          {formatEurBetrag(brutto)}
        </b>
      </div>
    </div>
  )
}
