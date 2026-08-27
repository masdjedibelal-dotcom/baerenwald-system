'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MockBadge, MockChip, MockEmpty } from '@/components/mock-ui'
import { DateInput } from '@/components/ui/DateInput'
import type { ObjektHistorieRow } from '@/lib/objektakte/types'
import { phaseChipLabelHistorie } from '@/lib/objektakte/compute-objekt-kpis'
import { summeObjektVorgangKosten } from '@/lib/objektakte/resolve-objekt-vorgang-kosten'
import { rechnungStatusDisplay } from '@/lib/status/status-display'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { cn, formatDatum } from '@/lib/utils'
import type { VorgangPhase } from '@/lib/vorgang/types'

const PHASE_FILTERS = ['alle', 'anfrage', 'angebot', 'auftrag', 'rechnung', 'bestand'] as const
type PhaseFilter = (typeof PHASE_FILTERS)[number]

function displayCell(value: string | null | undefined): string {
  const v = value?.trim()
  return v || '—'
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

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Historie</div>
          <p style={{ margin: 0, fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
            Chronologische Maßnahmen am Objekt — fehlende Zuordnungen als „—".
          </p>
        </div>
        <div className="card-b space-y-3">
          <div className="flex flex-wrap gap-2">
            {PHASE_FILTERS.map((p) => (
              <MockChip key={p} active={phase === p} onClick={() => setPhase(p)}>
                {p === 'alle' ? 'Alle' : phaseChipLabelHistorie(p as VorgangPhase | 'bestand')}
              </MockChip>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {einheiten.length ? (
              <label className="block">
                <span className="lbl">Einheit</span>
                <select
                  className="input w-full"
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
                  className="input w-full"
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
                  className="input w-full"
                  value={gewerk}
                  onChange={(e) => setGewerk(e.target.value)}
                >
                  <option value="">Alle</option>
                  {gewerke.map((g) => (
                    <option key={g} value={g}>
                      {g}
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
        <div className="card">
          <div className="card-b p-0 overflow-x-auto">
            <table className="tbl w-full">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Titel</th>
                  <th>Einheit</th>
                  <th>Anlage</th>
                  <th>Gewerk</th>
                  <th>Status</th>
                  <th className="text-right">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.leadId}>
                    <td>{formatDatum(r.datum)}</td>
                    <td>
                      <Link href={r.detailHref} className="text-bw-link hover:underline">
                        {r.titel}
                      </Link>
                    </td>
                    <td>{displayCell(r.einheitLabel)}</td>
                    <td>{displayCell(r.anlageLabel)}</td>
                    <td>{displayCell(r.gewerkLabel)}</td>
                    <td>
                      <MockBadge kind={historieStatusKind(r) as 'neu'}>
                        {r.unterstatusLabel}
                      </MockBadge>
                    </td>
                    <td className={cn('text-right', r.kostenEuro == null && 'text-muted')}>
                      {r.kostenLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                    Summe (nur mit Kostenangabe)
                    {ohneAngabe > 0
                      ? ` · davon ${ohneAngabe} Maßnahme${ohneAngabe === 1 ? '' : 'n'} ohne Kostenangabe`
                      : ''}
                  </td>
                  <td className="text-right font-medium">
                    {summe > 0 ? `${summe.toLocaleString('de-DE')} €` : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
