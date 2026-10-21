'use client'

import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import type { ObjektAkteReadOnlyPayload } from '@/lib/objektakte/types'
import { formatDatum } from '@/lib/utils'

type Props = {
  data: ObjektAkteReadOnlyPayload
  /** Kompakter auf Lead-Detail */
  variant?: 'full' | 'compact'
  className?: string
}

const NOTIZ_COLS = '90px minmax(0, 1fr) 120px'

export function ObjektAkteReadOnlySection({ data, variant = 'full', className }: Props) {
  const { notizen } = data
  const leer = notizen.length === 0

  if (leer && variant === 'compact') return null

  return (
    <MockCard title="Objektakte (HV-Portal)" icon="file-text" className={className}>
      <p className="mb-3 text-fs-meta leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Notizen aus dem Auftraggeber-Portal — nur Anzeige.
      </p>

      {leer ? (
        <MockEmpty
          icon="file-text"
          title="Keine Akten-Einträge"
          hint="Einträge vom Auftraggeber erscheinen hier"
        />
      ) : (
        <div className="space-y-5">
          {notizen.length > 0 ? (
            <section>
              <h3
                className="mb-2 text-fs-caption font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-3)' }}
              >
                Notizen
              </h3>
              <div className="listcard">
                <div className="list-row head" style={{ gridTemplateColumns: NOTIZ_COLS }} aria-hidden>
                  <div>Bezug</div>
                  <div>Notiz</div>
                  <div>Datum</div>
                </div>
                {notizen.map((n) => (
                  <div
                    key={n.id}
                    className="list-row"
                    style={{ gridTemplateColumns: NOTIZ_COLS, cursor: 'default', alignItems: 'start' }}
                  >
                    <div className="lc-pills" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <span className="pill-tag" style={{ cursor: 'default' }}>
                        {n.bezug_typ === 'vorgang' ? 'Vorgang' : 'Objekt'}
                      </span>
                      {n.wiedervorlage_am && !n.erledigt_am ? (
                        <MockBadge kind={hubSpotStatusToMockBadgeKind('offer')}>
                          {`WV ${formatDatum(n.wiedervorlage_am)}`}
                        </MockBadge>
                      ) : null}
                      {n.erledigt_am ? (
                        <MockBadge kind={hubSpotStatusToMockBadgeKind('done')}>Erledigt</MockBadge>
                      ) : null}
                    </div>
                    <div className="lc-title" style={{ whiteSpace: 'pre-wrap', fontSize: 13, fontWeight: 400 }}>
                      {n.text}
                    </div>
                    <div className="lc-sub" style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
                      {formatDatum(n.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

        </div>
      )}
    </MockCard>
  )
}
