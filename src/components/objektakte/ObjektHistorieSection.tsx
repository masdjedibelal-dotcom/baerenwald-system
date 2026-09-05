'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { MockBadge, MockChip, MockEmpty, MockCard } from '@/components/mock-ui'
import { DateInput } from '@/components/ui/DateInput'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { ObjektHistorieRow } from '@/lib/objektakte/types'
import { phaseChipLabelHistorie } from '@/lib/objektakte/compute-objekt-kpis'
import { summeObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
import { rechnungStatusDisplay } from '@/lib/status/status-display'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { cn, formatDatum } from '@/lib/utils'
import type { VorgangPhase } from '@/lib/vorgang/types'

const PHASE_FILTERS = ['alle', 'anfrage', 'angebot', 'auftrag', 'rechnung', 'bestand'] as const
type PhaseFilter = (typeof PHASE_FILTERS)[number]

/** Datum · Titel · Einheit · Anlage · Gewerk · Status · Kosten */
const HISTORIE_LIST_COLS =
  '88px minmax(0, 1.5fr) minmax(0, 0.75fr) minmax(0, 0.75fr) minmax(0, 0.7fr) minmax(88px, 0.65fr) minmax(72px, 0.55fr)'

function displayCell(value: string | null | undefined): string {
  const v = value?.trim()
  return v || '—'
}

/** Gewerk-Labels aus Funnel oft kleingeschrieben → Anzeige mit Großbuchstaben. */
function displayGewerk(value: string | null | undefined): string {
  const v = value?.trim()
  if (!v) return '—'
  return v
    .split(/[\s_/.-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function historieStatusKind(row: Pick<ObjektHistorieRow, 'phase' | 'unterstatus'>): string {
  const u = row.unterstatus.toLowerCase()
  if (row.phase === 'rechnung' && u === 'ausstehend') return 'neu'
  if (row.phase === 'rechnung') {
    const d = rechnungStatusDisplay(row.unterstatus, { ueberfaellig: false })
    return variantToMockBadgeKind(d.variant)
  }
  if (
    u === 'storniert' ||
    u === 'abgebrochen' ||
    u === 'abgelehnt' ||
    u === 'abgelaufen' ||
    u === 'ersetzt'
  ) {
    return 'storniert'
  }
  if (u === 'bezahlt' || u === 'abgeschlossen' || u === 'angenommen') return 'fertig'
  if (u === 'neu' || u === 'entwurf' || u === 'offen') return 'neu'
  if (u === 'gesendet' || u === 'abnahme' || u === 'kontaktiert' || u === 'termin') return 'warten'
  return 'aktiv'
}

export function ObjektHistorieSection({
  rows,
  einheiten = [],
  anlagen = [],
  initialPhase,
  initialAnlageId,
}: {
  rows: ObjektHistorieRow[]
  einheiten?: Array<{ id: string; bezeichnung: string }>
  anlagen?: Array<{ id: string; bezeichnung: string }>
  initialPhase?: PhaseFilter
  initialAnlageId?: string | null
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [phase, setPhase] = useState<PhaseFilter>(initialPhase ?? 'alle')
  const [einheitId, setEinheitId] = useState('')
  const [anlageId, setAnlageId] = useState(initialAnlageId?.trim() || '')
  const [gewerk, setGewerk] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')

  const gewerke = useMemo(() => {
    const set = new Set<string>()
    for (const r of rows) {
      const g = r.gewerkLabel?.trim()
      if (g) set.add(g)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'))
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (phase !== 'alle') {
        if (phase === 'bestand' && !r.ist_wiederkehrend) return false
        if (phase !== 'bestand' && r.phase !== phase) return false
      }
      if (einheitId) {
        const einheit = einheiten.find((e) => e.id === einheitId)
        const label = einheit?.bezeichnung?.trim()
        if (!label || r.einheitLabel?.trim() !== label) return false
      }
      if (anlageId && r.anlageId !== anlageId) return false
      if (gewerk && r.gewerkLabel?.trim() !== gewerk) return false
      const d = r.datum.slice(0, 10)
      if (von && d < von) return false
      if (bis && d > bis) return false
      return true
    })
  }, [rows, phase, einheitId, anlageId, gewerk, von, bis, einheiten])

  const { summe, ohneAngabe } = useMemo(
    () => summeObjektVorgangKosten(filtered),
    [filtered]
  )

  function openRow(r: ObjektHistorieRow) {
    router.push(r.detailHref)
  }

  function rowBody(r: ObjektHistorieRow) {
    const einheit = displayCell(r.einheitLabel)
    const anlage = displayCell(r.anlageLabel)
    const gewerkLabel = displayGewerk(r.gewerkLabel)
    const datum = formatDatum(r.datum)

    return (
      <div
        key={r.leadId}
        className={isMobile ? 'ap-mobile-card ap-mobile-card--row' : 'ap-list__row'}
        style={isMobile ? undefined : { gridTemplateColumns: HISTORIE_LIST_COLS }}
      >
        <button
          type="button"
          className={isMobile ? 'ap-mobile-card__hit' : 'ap-list__hit'}
          onClick={() => openRow(r)}
        >
          {isMobile ? (
            <>
              <div className="ap-mobile-card__top">
                <span className="ap-mobile-card__name">{r.titel}</span>
                <MockBadge kind={historieStatusKind(r) as 'neu'}>{r.unterstatusLabel}</MockBadge>
              </div>
              <div className="ap-mobile-card__meta">
                {datum}
                {gewerkLabel !== '—' ? ` · ${gewerkLabel}` : ''}
              </div>
              <div className="ap-mobile-card__meta">
                {[einheit !== '—' ? einheit : null, anlage !== '—' ? anlage : null]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </div>
              <div className="ap-mobile-card__meta">
                <span className={cn(r.kostenEuro == null && 'ap-list__dim')}>{r.kostenLabel}</span>
              </div>
            </>
          ) : (
            <>
              <span className="ap-list__dim">{datum}</span>
              <span className="ap-list__name-cell">{r.titel}</span>
              <span className="ap-list__dim">{einheit}</span>
              <span className="ap-list__dim">{anlage}</span>
              <span className="ap-list__dim">{gewerkLabel}</span>
              <span>
                <MockBadge kind={historieStatusKind(r) as 'neu'}>{r.unterstatusLabel}</MockBadge>
              </span>
              <span
                className="ap-list__dim"
                style={{
                  textAlign: 'right',
                  fontWeight: r.kostenEuro != null ? 600 : undefined,
                  color: r.kostenEuro != null ? 'var(--text)' : undefined,
                }}
              >
                {r.kostenLabel}
              </span>
            </>
          )}
        </button>
      </div>
    )
  }

  return (
    <MockCard
      title={filtered.length ? `Historie · ${filtered.length}` : 'Historie'}
      icon="history"
    >
      <div className="space-y-3" style={{ marginBottom: filtered.length ? 12 : 0 }}>
        <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
          Chronologische Maßnahmen — fehlende Zuordnungen als „—“
        </p>

        <div className="chiprow">
          {PHASE_FILTERS.map((p) => (
            <MockChip key={p} active={phase === p} onClick={() => setPhase(p)}>
              {p === 'alle' ? 'Alle' : phaseChipLabelHistorie(p as VorgangPhase | 'bestand')}
            </MockChip>
          ))}
        </div>

        <div className="historie-filter-row">
          {einheiten.length ? (
            <label className="block">
              <span className="lbl">Einheit</span>
              <select
                className="input w-full list-filter-select"
                value={einheitId}
                onChange={(e) => setEinheitId(e.target.value)}
              >
                <option value="">Alle</option>
                {einheiten.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.bezeichnung}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {anlagen.length ? (
            <label className="block">
              <span className="lbl">Anlage</span>
              <select
                className="input w-full list-filter-select"
                value={anlageId}
                onChange={(e) => setAnlageId(e.target.value)}
              >
                <option value="">Alle</option>
                {anlagen.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.bezeichnung}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {gewerke.length ? (
            <label className="block">
              <span className="lbl">Gewerk</span>
              <select
                className="input w-full list-filter-select"
                value={gewerk}
                onChange={(e) => setGewerk(e.target.value)}
              >
                <option value="">Alle</option>
                {gewerke.map((g) => (
                  <option key={g} value={g}>
                    {displayGewerk(g)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block">
            <span className="lbl">Von</span>
            <DateInput value={von} onChange={(e) => setVon(e.target.value)} />
          </label>
          <label className="block">
            <span className="lbl">Bis</span>
            <DateInput value={bis} onChange={(e) => setBis(e.target.value)} />
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <MockEmpty
          icon="history"
          title="Keine Einträge"
          hint={
            rows.length === 0
              ? 'Noch keine Vorgänge an diesem Objekt — Bestandsvorgänge ohne Objekt-Zuordnung erscheinen hier nicht.'
              : 'Filter anpassen oder zurücksetzen.'
          }
        />
      ) : (
        <>
          {isMobile ? (
            <div className="ap-cards">{filtered.map(rowBody)}</div>
          ) : (
            <div className="ap-list historie-ap-list">
              <div
                className="ap-list__head"
                style={{ gridTemplateColumns: HISTORIE_LIST_COLS }}
              >
                <span>Datum</span>
                <span>Titel</span>
                <span>Einheit</span>
                <span>Anlage</span>
                <span>Gewerk</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Kosten</span>
              </div>
              {filtered.map(rowBody)}
            </div>
          )}

          <div className="historie-summe">
            <span>
              Summe (nur mit Kostenangabe)
              {ohneAngabe > 0
                ? ` · davon ${ohneAngabe} Maßnahme${ohneAngabe === 1 ? '' : 'n'} ohne Kostenangabe`
                : ''}
            </span>
            <strong>{summe > 0 ? `${summe.toLocaleString('de-DE')} €` : '—'}</strong>
          </div>
        </>
      )}
    </MockCard>
  )
}
