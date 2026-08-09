'use client'

import { MockBadge } from '@/components/mock-ui/MockPrimitives'
import { hubSpotStatusToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockEmpty } from '@/components/mock-ui/MockEmpty'
import {
  FREMD_VORGANG_KATEGORIE_LABELS,
  OBJEKT_DOKUMENT_KATEGORIE_LABELS,
} from '@/lib/objektakte/labels'
import type { ObjektAkteReadOnlyPayload } from '@/lib/objektakte/types'
import { formatDatum } from '@/lib/utils'

function formatBetrag(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

type Props = {
  data: ObjektAkteReadOnlyPayload
  /** Kompakter auf Lead-Detail */
  variant?: 'full' | 'compact'
  className?: string
}

const NOTIZ_COLS = '90px minmax(0, 1fr) 120px'
const DOK_COLS = 'minmax(0, 1.4fr) minmax(0, 1fr) 90px'
const FREMD_COLS = 'minmax(0, 1.3fr) 110px minmax(0, 1fr)'

export function ObjektAkteReadOnlySection({ data, variant = 'full', className }: Props) {
  const { notizen, dokumente, fremdVorgaenge } = data
  const leer = notizen.length === 0 && dokumente.length === 0 && fremdVorgaenge.length === 0

  if (leer && variant === 'compact') return null

  return (
    <MockCard title="Objektakte (HV-Portal)" icon="file-text" className={className}>
      <p className="mb-3 text-[12px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
        Notizen, Dokumente und Fremd-Vorgänge aus dem Auftraggeber-Portal — nur Anzeige,
        Bearbeitung im HV-Portal.
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
                className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
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

          {dokumente.length > 0 ? (
            <section>
              <h3
                className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-3)' }}
              >
                Dokumente
              </h3>
              <div className="listcard">
                <div className="list-row head" style={{ gridTemplateColumns: DOK_COLS }} aria-hidden>
                  <div>Titel</div>
                  <div>Kategorie</div>
                  <div />
                </div>
                {dokumente.map((d) => (
                  <div
                    key={d.id}
                    className="list-row"
                    style={{ gridTemplateColumns: DOK_COLS, cursor: 'default' }}
                  >
                    <div className="lc-title" style={{ fontWeight: 600 }}>
                      {d.titel}
                      {d.ablauf_datum ? (
                        <div
                          className="lc-sub"
                          style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-3)', marginTop: 2 }}
                        >
                          Ablauf {formatDatum(d.ablauf_datum)}
                        </div>
                      ) : null}
                    </div>
                    <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                      {OBJEKT_DOKUMENT_KATEGORIE_LABELS[d.kategorie] ?? d.kategorie}
                    </div>
                    <div className="row-actions always" style={{ justifySelf: 'end' }}>
                      {d.storage_url ? (
                        <a
                          href={d.storage_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost sm"
                        >
                          Öffnen
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {fremdVorgaenge.length > 0 ? (
            <section>
              <h3
                className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-3)' }}
              >
                Fremd-Vorgänge
              </h3>
              <div className="listcard">
                <div className="list-row head" style={{ gridTemplateColumns: FREMD_COLS }} aria-hidden>
                  <div>Titel</div>
                  <div>Datum</div>
                  <div>Details</div>
                </div>
                {fremdVorgaenge.map((f) => (
                  <div
                    key={f.id}
                    className="list-row"
                    style={{ gridTemplateColumns: FREMD_COLS, cursor: 'default', alignItems: 'start' }}
                  >
                    <div className="lc-title" style={{ fontWeight: 600 }}>
                      {f.titel}
                      <div className="lc-pills" style={{ marginTop: 4 }}>
                        <MockBadge kind={hubSpotStatusToMockBadgeKind('order')}>extern</MockBadge>
                      </div>
                    </div>
                    <div className="lc-sub" style={{ color: 'var(--text-2)' }}>
                      {formatDatum(f.datum)}
                    </div>
                    <div className="lc-sub" style={{ color: 'var(--text-2)', fontSize: 12.5 }}>
                      {[
                        f.betrag != null ? formatBetrag(f.betrag) : null,
                        FREMD_VORGANG_KATEGORIE_LABELS[f.kategorie] ?? f.kategorie,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      {f.notiz ? (
                        <div style={{ color: 'var(--text-3)', marginTop: 4 }}>{f.notiz}</div>
                      ) : null}
                      {f.dokument_url ? (
                        <a
                          href={f.dokument_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn ghost sm"
                          style={{ marginTop: 4 }}
                        >
                          Dokument
                        </a>
                      ) : null}
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
