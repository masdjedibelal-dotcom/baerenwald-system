'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { toast } from '@/components/ui/app-toast'
import {
  MockBadge,
  MockChip,
  MockEmpty,
  MockIcon,
  MockPager,
  MockToolbar,
} from '@/components/mock-ui'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import { runDeleteVorgang, runDuplicateAuftrag } from '@/lib/list-actions'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useListPage } from '@/hooks/useListPage'
import {
  auftragFortschritt,
  auftragKundenName,
  auftragOrt,
  auftragSuchtext,
  auftragTitel,
  auftragWertAnzeige,
  countAuftragPhase,
  formatAuftragsNr,
  lieferdatumAnzeige,
  matchesAuftragPhase,
  type AuftragListenPhase,
} from '@/lib/auftraege/auftrag-liste-helpers'
import { AUFTRAG_STATUS_LABELS, cn, formatDatum } from '@/lib/utils'
import type { AuftragListeEintrag, AuftragStatus } from '@/lib/types'

type PhaseFilter = 'alle' | 'aktiv' | 'fertig'

const AUFTRAEGE_ROW_GRID = '100px 2fr 1.2fr 100px 1fr 110px 100px 60px'

const PHASE_CHIPS: { value: PhaseFilter; label: string }[] = [
  { value: 'alle', label: 'Alle' },
  { value: 'aktiv', label: 'Aktiv' },
  { value: 'fertig', label: 'Fertig' },
]

const AUFTRAG_EXPORT_FIELDS: ExportField[] = [
  { key: 'nr', label: 'Nr.' },
  { key: 'auftrag', label: 'Auftrag' },
  { key: 'ort', label: 'Ort' },
  { key: 'kunde', label: 'Kunde' },
  { key: 'status', label: 'Status' },
  { key: 'wert', label: 'Wert' },
  { key: 'fortschritt', label: 'Fortschritt %' },
  { key: 'lieferdatum', label: 'Lieferdatum' },
  { key: 'start_datum', label: 'Start' },
]

const PROGRESS_LEGEND = (
  <div
    style={{
      display: 'flex',
      gap: 16,
      marginTop: 14,
      padding: '8px 12px',
      background: 'var(--card)',
      border: '0.5px solid var(--border)',
      borderRadius: 6,
      fontSize: 12,
      color: 'var(--text-3)',
      width: 'fit-content',
    }}
  >
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--green)' }} />
      in Arbeit
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#D9A800' }} />
      pausiert
    </span>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--border-strong)' }} />
      offen
    </span>
  </div>
)

function phaseToListenPhase(phase: PhaseFilter): AuftragListenPhase {
  if (phase === 'aktiv') return 'aktiv'
  if (phase === 'fertig') return 'fertig'
  return ''
}

function auftragStatusMockBadge(status: AuftragStatus): { kind: string; label: string } {
  const kindMap: Record<AuftragStatus, string> = {
    offen: 'plain',
    in_arbeit: 'aktiv',
    abnahme: 'warten',
    abgeschlossen: 'fertig',
    storniert: 'storniert',
  }
  return {
    kind: kindMap[status] ?? 'aktiv',
    label: AUFTRAG_STATUS_LABELS[status] ?? status,
  }
}

function AuftragProgressBar({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className={cn('prog', warn && 'warn')}>
      <div style={{ width: `${value}%` }} />
    </div>
  )
}

function auftragExportRow(a: AuftragListeEintrag): Record<string, unknown> {
  return {
    nr: formatAuftragsNr(a),
    auftrag: auftragTitel(a),
    ort: auftragOrt(a),
    kunde: auftragKundenName(a),
    status: AUFTRAG_STATUS_LABELS[a.status] ?? a.status,
    wert: auftragWertAnzeige(a),
    fortschritt: auftragFortschritt(a),
    lieferdatum: lieferdatumAnzeige(a),
    start_datum: a.start_datum ? formatDatum(a.start_datum) : '',
  }
}

export function AuftraegeListeClient({
  auftraege,
  mode = 'page',
  selectedId = null,
}: {
  auftraege: AuftragListeEintrag[]
  pipelineKontextByAuftragId?: Record<string, unknown>
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [filter, setFilter] = useState<PhaseFilter>('alle')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const isPane = mode === 'pane'

  const listenPhase = phaseToListenPhase(filter)

  const counts = useMemo(
    () => ({
      alle: auftraege.length,
      aktiv: countAuftragPhase(auftraege, 'aktiv'),
      fertig: countAuftragPhase(auftraege, 'fertig'),
    }),
    [auftraege]
  )

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return auftraege
      .filter((a) => {
        if (!matchesAuftragPhase(a, listenPhase)) return false
        if (!needle) return true
        return auftragSuchtext(a).includes(needle)
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [auftraege, listenPhase, debouncedQ])

  const paginationResetKey = `${filter}|${debouncedQ}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    10,
    paginationResetKey
  )

  function openDetail(id: string) {
    router.push(`/auftraege/${id}`)
  }

  return (
    <div>
      <MockToolbar
        query={q}
        onQueryChange={setQ}
        placeholder="Aufträge suchen..."
        onFilterClick={() => setFilter('alle')}
        onExportClick={() => setExportOpen(true)}
      />

      <div className="chiprow">
        {PHASE_CHIPS.map((chip) => (
          <MockChip
            key={chip.value}
            active={filter === chip.value}
            count={counts[chip.value]}
            onClick={() => setFilter(chip.value)}
          >
            {chip.label}
          </MockChip>
        ))}
      </div>

      <div className="listcard">
        <div className="list-row head" style={{ gridTemplateColumns: AUFTRAEGE_ROW_GRID }}>
          <div>Nr.</div>
          <div>Auftrag</div>
          <div>Kunde</div>
          <div style={{ textAlign: 'right' }}>Betrag</div>
          <div>Fortschritt</div>
          <div>Lieferdatum</div>
          <div>Status</div>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="tool"
            title={auftraege.length === 0 ? 'Keine Aufträge' : 'Keine Treffer'}
            hint={
              auftraege.length === 0
                ? 'Aufträge aus angenommenen Angeboten erscheinen hier.'
                : 'Suchbegriff anpassen oder Filter zurücksetzen'
            }
          />
        ) : (
          pageItems.map((a) => {
            const progress = auftragFortschritt(a)
            const badge = auftragStatusMockBadge(a.status)
            return (
              <div
                key={a.id}
                className={cn('list-row', selectedId === a.id && isPane && 'active')}
                style={{ gridTemplateColumns: AUFTRAEGE_ROW_GRID }}
                onClick={() => openDetail(a.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(a.id)
                  }
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-3)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {formatAuftragsNr(a)}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{auftragTitel(a)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{auftragOrt(a)}</div>
                </div>
                <div style={{ fontSize: 13 }}>{auftragKundenName(a)}</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {auftragWertAnzeige(a)}
                </div>
                <div>
                  <AuftragProgressBar value={progress} warn={progress < 30 && progress > 0} />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{lieferdatumAnzeige(a)}</div>
                <MockBadge kind={badge.kind}>{badge.label}</MockBadge>
                <div
                  className="row-actions"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: 'flex-end' }}
                >
                  <ActionsMenu
                    trigger={
                      <button type="button" className="qa-btn" title="Aktionen" aria-label="Aktionen">
                        <MockIcon n="dots" size={15} />
                      </button>
                    }
                    items={listEntityMenuItems(
                      'auftrag',
                      {
                        titel: auftragTitel(a),
                        name: auftragKundenName(a),
                        status: a.status,
                      },
                      {
                        onEdit: () => openDetail(a.id),
                        onCopy: () => runDuplicateAuftrag(a.id, router),
                        onInvoice: () => router.push(`/rechnungen/neu?auftrag=${a.id}`),
                        onDelete: a.lead_id
                          ? () => runDeleteVorgang(a.lead_id!, router)
                          : () => toast.error('Auftrag ohne Anfrage — Löschen nicht möglich.'),
                        deleteLabel: auftragTitel(a),
                      }
                    )}
                    sheetTitle="Auftrag"
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      <MockPager
        pageIndex={pageIndex}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        unit="Aufträge"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

      {PROGRESS_LEGEND}

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        fields={AUFTRAG_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : auftraege
          const data = source.map(auftragExportRow)
          const fields = AUFTRAG_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'auftraege')
        }}
      />
    </div>
  )
}
