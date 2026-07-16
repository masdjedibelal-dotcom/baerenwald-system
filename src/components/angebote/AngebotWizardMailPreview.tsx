'use client'

import { useMemo } from 'react'
import { PosTotals } from '@/components/posboard/PosTotals'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import {
  posBoardLineNetto,
  type PosBoardLine,
} from '@/lib/posboard/pos-board-line'
import type { AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'

function formatGueltigBisDe(ymd: string): string {
  if (!ymd?.trim()) return '—'
  try {
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim()) ? `${ymd.trim()}T12:00:00` : ymd)
    return d.toLocaleDateString('de-DE')
  } catch {
    return ymd
  }
}

/** Mock `AngebotMailPreview` — Step Vorschau Angebots-Wizard */
export function AngebotWizardMailPreview({
  brand,
  titel,
  gueltigBis,
  einleitung,
  schluss,
  positionen,
  netto,
  ust,
  brutto,
  empfaengerMail,
  komplex = false,
  projektTitel = '',
  projektBeschreibung = '',
  fotos = [],
  zahlfristText = '',
}: {
  brand: string
  titel: string
  gueltigBis: string
  einleitung: string
  schluss: string
  positionen: PosBoardLine[]
  netto: number
  ust: number
  brutto: number
  empfaengerMail: string
  komplex?: boolean
  projektTitel?: string
  projektBeschreibung?: string
  fotos?: AngebotProjektFoto[]
  zahlfristText?: string
}) {
  const groups = useMemo(() => {
    const map = new Map<string, PosBoardLine[]>()
    for (const p of positionen) {
      const g = p.gewerk?.trim() || 'Allgemein'
      if (!map.has(g)) map.set(g, [])
      map.get(g)!.push(p)
    }
    return Array.from(map.entries())
  }, [positionen])

  return (
    <div className="mail-preview" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="mail-h" style={{ padding: '14px 18px' }}>
        <div className="brand">{brand}</div>
        <div className="subj">
          {titel} · gültig bis {formatGueltigBisDe(gueltigBis)}
        </div>
      </div>
      <div className="mail-body">
        <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{einleitung}</p>
        {komplex ? (
          <>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--green-dark)',
                marginTop: 16,
                marginBottom: 6,
                letterSpacing: '-0.01em',
              }}
            >
              Projekt: {projektTitel || '—'}
            </h4>
            <p
              style={{
                whiteSpace: 'pre-line',
                margin: 0,
                fontSize: 11.5,
                color: 'var(--text-2)',
              }}
            >
              {projektBeschreibung}
            </p>
            {fotos.length > 0 ? (
              <>
                <h4
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--green-dark)',
                    marginTop: 14,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Fotodokumentation
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 4,
                  }}
                >
                  {fotos.slice(0, 6).map((f) => (
                    <div
                      key={f.url}
                      style={{
                        aspectRatio: '4 / 3',
                        background: '#000',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
                {fotos.length > 6 ? (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--text-3)',
                      textAlign: 'right',
                      marginTop: 2,
                    }}
                  >
                    + {fotos.length - 6} weitere
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
        {groups.map(([g, arr], gi) => (
          <div
            key={g}
            style={{
              marginTop: 14,
              border: '0.5px solid var(--border)',
              borderRadius: 6,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                background: 'var(--green-50)',
                color: 'var(--green-dark)',
                padding: '6px 10px',
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>
                {gi + 1}. {g}
              </span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatEurBetrag(arr.reduce((s, p) => s + posBoardLineNetto(p), 0))} netto
              </span>
            </div>
            {arr.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderTop: '0.5px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <span>
                  {p.name || '—'} · {p.menge} {p.einheit}
                </span>
                <b style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatEurBetrag(posBoardLineNetto(p))}
                </b>
              </div>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <PosTotals netto={netto} ust={ust} brutto={brutto} />
        </div>
        {zahlfristText ? (
          <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: '10px 0 0' }}>
            <b>Zahlungsziel:</b> {zahlfristText} · <b>Gültig bis:</b>{' '}
            {formatGueltigBisDe(gueltigBis)}
          </p>
        ) : null}
        <p style={{ whiteSpace: 'pre-line', margin: '16px 0 0', color: 'var(--text-2)' }}>
          {schluss}
        </p>
      </div>
      <div className="mail-foot">
        {brand} · an {empfaengerMail || 'kunde@beispiel.de'}
      </div>
    </div>
  )
}
