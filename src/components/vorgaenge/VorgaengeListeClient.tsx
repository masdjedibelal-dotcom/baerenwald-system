'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  MockBadge,
  MockBtn,
  MockChip,
  MockEmpty,
  MockIcon,
  MockModal,
  MockPager,
  MockSortHead,
} from '@/components/mock-ui'
import { ListInfiniteSentinel } from '@/components/layout/mock'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useListPage } from '@/hooks/useListPage'
import { runMockListExport } from '@/lib/mock-list-export'
import { filterVorgaengeByPartnerName } from '@/lib/vorgang/filter-vorgaenge-by-partner-name'
import {
  runDeleteStandaloneRechnung,
  runDeleteVorgang,
  runDuplicateAnfrage,
  runDuplicateAngebot,
  runDuplicateAuftrag,
  runDuplicateRechnung,
} from '@/lib/list-actions'
import { bulkDeleteVorgaenge } from '@/app/(dashboard)/vorgaenge/actions'
import { updateLeadStatus } from '@/app/(dashboard)/anfragen/actions'
import { fachbegriff } from '@/lib/crm/fachbegriffe'
import { toast } from '@/components/ui/app-toast'
import { PullToRefresh } from '@/components/ui/PullToRefresh'
import { MobileListFilterSheet } from '@/components/ui/MobileListFilterSheet'
import { SwipeRow } from '@/components/ui/SwipeRow'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ListbarActionsMenu } from '@/components/layout/ListbarActionsMenu'
import { DateInput } from '@/components/ui/DateInput'
import { FilterRangeRow } from '@/components/ui/FilterRangeRow'
import { useResizableColumns, type ResizableColDef } from '@/hooks/useResizableColumns'
import { PHASE_LABELS, PHASE_UNTERSTATUS_VALUES, unterstatusLabel } from '@/lib/vorgang/vorgang-labels'
import type { VorgangListeRow, VorgangPhase } from '@/lib/vorgang/types'
import {
  ANFRAGE_WARTE_AUF_HV_LABEL,
  rechnungStatusDisplay,
} from '@/lib/status/status-display'
import { variantToMockBadgeKind } from '@/lib/status/mock-badge-kind'
import { cn, formatDatum } from '@/lib/utils'
import { HwEingangsrechnungenListe } from '@/components/rechnungen/HwEingangsrechnungenListe'
import {
  hwRechnungIstErledigt,
  type HwEingangsrechnungListeRow,
} from '@/lib/rechnungen/load-hw-eingangsrechnungen'

/** Spec §3/§14: Alle · Anfrage · Angebot · Auftrag · Rechnung · Wartung & Pflege */
const VORGANG_FILTERS = ['alle', 'anfrage', 'angebot', 'auftrag', 'rechnung', 'bestand'] as const

const DATA_COL_IDS = ['kunde', 'titel', 'phase', 'wert', 'datum', 'status'] as const
type DataColId = (typeof DATA_COL_IDS)[number]

/** Daten-Spalten — fr-Gewichte (Hook), Kunde/Titel breiter; feste Spalten in px. */
const VORGAENGE_DATA_COLS: ResizableColDef[] = [
  { id: 'kunde', defaultWidth: 22, minWidth: 10, maxWidth: 40 },
  { id: 'titel', defaultWidth: 28, minWidth: 12, maxWidth: 48 },
  { id: 'phase', defaultWidth: 9, minWidth: 6, maxWidth: 14 },
  { id: 'wert', defaultWidth: 8, minWidth: 5, maxWidth: 12 },
  { id: 'datum', defaultWidth: 8, minWidth: 5, maxWidth: 12 },
  { id: 'status', defaultWidth: 9, minWidth: 6, maxWidth: 14 },
]

function phaseChipLabel(p: (typeof VORGANG_FILTERS)[number]): string {
  if (p === 'alle') return 'Alle'
  if (p === 'bestand') return 'Wartung & Pflege'
  return PHASE_META[p as VorgangPhase].label
}

/** Empty-Hint außerhalb JSX, damit TS `filter` nicht über `showLifecycleToggle` einengt. */
function vorgaengeEmptyHint(opts: {
  showLifecycleToggle: boolean
  lifecycle: 'offen' | 'erledigt'
  filter: (typeof VORGANG_FILTERS)[number]
}): string {
  const { showLifecycleToggle, lifecycle, filter: phase } = opts
  if (!showLifecycleToggle) {
    if (phase === 'auftrag') {
      return 'Kein Vorgang in Phase Auftrag — nach Rechnungsstellung liegt der Vorgang unter Filter Rechnung.'
    }
    if (phase === 'rechnung') return 'Keine Rechnungen in diesem Filter.'
    return 'Filter zurücksetzen oder anderen Phasen-Chip wählen.'
  }
  if (lifecycle === 'erledigt') return 'Filter zurücksetzen oder zu „Offen“ wechseln'
  if (phase === 'auftrag') {
    return 'Kein Vorgang in Phase Auftrag — nach Rechnungsstellung liegt der Vorgang unter Filter Rechnung.'
  }
  if (phase === 'rechnung') {
    return 'Keine offenen Rechnungen — abgeschlossene Aufträge ohne Rechnung erscheinen hier automatisch.'
  }
  return 'Auftrag entsteht aus Angebot oder Notfall — starte mit einer Anfrage.'
}

function isErsetzt(row: VorgangListeRow): boolean {
  return row.unterstatus.toLowerCase() === 'ersetzt' || Boolean(row.ersetzt_durch)
}

const VORGAENGE_CHECK_COL: ResizableColDef = {
  id: 'check',
  defaultWidth: 36,
  minWidth: 36,
  maxWidth: 36,
  fixed: true,
}

const PHASE_META: Record<
  VorgangPhase,
  { label: string; icon: string }
> = {
  anfrage: { label: 'Anfrage', icon: 'inbox' },
  angebot: { label: 'Angebot', icon: 'file-invoice' },
  auftrag: { label: 'Auftrag', icon: 'briefcase' },
  rechnung: { label: 'Rechnung', icon: 'receipt' },
}

const EXPORT_FIELDS: ExportField[] = [
  { key: 'kunde', label: 'Kunde' },
  { key: 'titel', label: 'Vorgang' },
  { key: 'phase', label: 'Phase' },
  { key: 'unterstatus', label: 'Status' },
  { key: 'wert', label: 'Wert' },
  { key: 'kanal', label: 'Kanal' },
  { key: 'updated_at', label: 'Aktualisiert' },
]

type SortCol = 'kunde' | 'titel' | 'phase' | 'wert' | 'datum' | 'status'

function statusKind(row: VorgangListeRow): string {
  if (row.badges.wartet_freigabe) return 'warten'
  const u = row.unterstatus.toLowerCase()
  // Abgeschlossener Auftrag ohne RE — in Rechnung/Offen, nicht als „fertig“
  if (row.phase === 'rechnung' && u === 'ausstehend') return 'neu'
  if (row.phase === 'rechnung') {
    const d = rechnungStatusDisplay(row.unterstatus, { ueberfaellig: row.ueberfaellig })
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

const STATUS_FILTER_WARTET_FREIGABE = 'wartet_freigabe'

function statusFilterKey(row: VorgangListeRow): string {
  if (row.badges.wartet_freigabe) return STATUS_FILTER_WARTET_FREIGABE
  return row.unterstatus
}

function statusLabel(row: VorgangListeRow): string {
  if (row.badges.wartet_freigabe) return ANFRAGE_WARTE_AUF_HV_LABEL
  return row.unterstatusLabel
}

function dateKey(row: VorgangListeRow): string {
  return row.updatedAt.replace(/\D/g, '')
}

/** Abgeschlossen / verloren / storniert → Erledigt-Bucket; sonst Offen. */
function isVorgangErledigt(row: VorgangListeRow): boolean {
  const kind = statusKind(row)
  return kind === 'storniert' || kind === 'fertig'
}

/** Parse Anzeige „1.234 €“ / „207 – 813 €“ → Euro-Zahl für Wert-Filter/Sort. */
function wertEuro(row: VorgangListeRow): number | null {
  if (!row.wertLabel) return null
  const matches = [...row.wertLabel.matchAll(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?)/g)]
  if (!matches.length) return null
  const nums = matches
    .map((m) => Number(m[1].replace(/\./g, '').replace(',', '.')))
    .filter((n) => Number.isFinite(n))
  if (!nums.length) return null
  // Bei von–bis die Obergrenze für Sortierung/Filter nutzen
  return Math.max(...nums)
}

function toExportRow(row: VorgangListeRow): Record<string, unknown> {
  return {
    kunde: row.kundeName ?? '',
    titel: row.titel,
    phase: PHASE_LABELS[row.phase],
    unterstatus: row.unterstatusLabel,
    wert: row.wertLabel ?? '',
    kanal: row.kanalMeta ?? '',
    updated_at: row.updatedAt,
  }
}

function isVorgangFilter(value: string | null): value is (typeof VORGANG_FILTERS)[number] {
  return value != null && (VORGANG_FILTERS as readonly string[]).includes(value)
}

export function VorgaengeListeClient({
  rows,
  hwEingangsrechnungen = [],
  embedded = false,
  restrictPartnerName,
  restrictHandwerkerId,
  restrictKundeId,
  restrictLeadIds,
}: {
  rows: VorgangListeRow[]
  /** Partner-Eingangsrechnungen (angebot_handwerker mit PDF) */
  hwEingangsrechnungen?: HwEingangsrechnungListeRow[]
  embedded?: boolean
  restrictPartnerName?: string
  /** Nur Vorgänge, in denen dieser Handwerker vorkommt (Mock `restrictHandwerker`). */
  restrictHandwerkerId?: string
  /** Nur Vorgänge dieses Kunden (Mock `restrictKunde`). */
  restrictKundeId?: string
  /** Alternative: auf Lead-IDs einschränken (z. B. Melder + Auftraggeber). */
  restrictLeadIds?: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()

  const [localRows, setLocalRows] = useState(rows)
  useEffect(() => {
    setLocalRows(rows)
  }, [rows])

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof VORGANG_FILTERS)[number]>('alle')
  const [filterOpen, setFilterOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [fKunde, setFKunde] = useState('')
  const [fTitel, setFTitel] = useState('')
  const [fWertVon, setFWertVon] = useState('')
  const [fWertBis, setFWertBis] = useState('')
  const [fDatumVon, setFDatumVon] = useState('')
  const [fDatumBis, setFDatumBis] = useState('')
  const [lifecycle, setLifecycle] = useState<'offen' | 'erledigt'>('offen')
  const [rechnungRichtung, setRechnungRichtung] = useState<'ausgehend' | 'eingehend'>('ausgehend')
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeletePending, setBulkDeletePending] = useState(false)
  const [bulkErledigtPending, setBulkErledigtPending] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const visibleCols: Record<DataColId, boolean> = {
    kunde: true,
    titel: true,
    phase: true,
    wert: true,
    datum: true,
    status: true,
  }
  const [flashKeys, setFlashKeys] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol | null>('datum')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)
  const colDefs = useMemo(() => {
    const data = VORGAENGE_DATA_COLS.filter((c) => visibleCols[c.id as DataColId])
    return [VORGAENGE_CHECK_COL, ...data]
  }, [visibleCols])
  const { gridTemplateColumns, startResize } = useResizableColumns(
    `crm.cols.vorgaenge.v5.${DATA_COL_IDS.filter((id) => visibleCols[id]).join('-')}`,
    colDefs
  )
  const colIndex = useCallback((id: string) => colDefs.findIndex((c) => c.id === id), [colDefs])
  const startColResize = useCallback(
    (id: string, e: ReactPointerEvent) => {
      const i = colIndex(id)
      if (i < 0) return
      startResize(i, e)
    },
    [colIndex, startResize]
  )

  useEffect(() => {
    setSelected({})
  }, [lifecycle])

  const syncPhaseToUrl = useCallback(
    (
      phase: (typeof VORGANG_FILTERS)[number],
      nextLifecycle?: 'offen' | 'erledigt',
      nextRichtung?: 'ausgehend' | 'eingehend'
    ) => {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('phase')
      if (phase === 'alle') {
        params.delete('tab')
      } else {
        params.set('tab', phase)
      }
      const lc = nextLifecycle ?? lifecycle
      if (lc === 'offen') {
        params.delete('lifecycle')
      } else {
        params.set('lifecycle', lc)
      }
      const richtung = nextRichtung ?? (phase === 'rechnung' ? rechnungRichtung : 'ausgehend')
      if (phase === 'rechnung' && richtung === 'eingehend') {
        params.set('richtung', 'eingehend')
      } else {
        params.delete('richtung')
      }
      const qs = params.toString()
      router.replace(qs ? `/vorgaenge?${qs}` : '/vorgaenge', { scroll: false })
    },
    [router, searchParams, lifecycle, rechnungRichtung]
  )

  const setPhaseFilter = useCallback(
    (phase: (typeof VORGANG_FILTERS)[number]) => {
      setFilter(phase)
      setStatusFilter([])
      if (phase !== 'rechnung') setRechnungRichtung('ausgehend')
      // Erledigt-Toggle nur unter „Alle“ und „Rechnung“
      const keepsLifecycle = phase === 'alle' || phase === 'rechnung'
      const nextLc = keepsLifecycle ? lifecycle : 'offen'
      if (!keepsLifecycle) setLifecycle('offen')
      if (!embedded) {
        syncPhaseToUrl(
          phase,
          nextLc,
          phase === 'rechnung' ? rechnungRichtung : 'ausgehend'
        )
      }
    },
    [embedded, syncPhaseToUrl, rechnungRichtung, lifecycle]
  )

  const setLifecycleFilter = useCallback(
    (next: 'offen' | 'erledigt') => {
      setLifecycle(next)
      if (!embedded) syncPhaseToUrl(filter, next)
    },
    [embedded, syncPhaseToUrl, filter]
  )

  const setRechnungRichtungFilter = useCallback(
    (next: 'ausgehend' | 'eingehend') => {
      setRechnungRichtung(next)
      setStatusFilter([])
      setLifecycle('offen')
      if (!embedded) syncPhaseToUrl('rechnung', 'offen', next)
    },
    [embedded, syncPhaseToUrl]
  )

  useEffect(() => {
    if (embedded) return
    const tab = searchParams.get('tab') ?? searchParams.get('phase')
    const phase: (typeof VORGANG_FILTERS)[number] = isVorgangFilter(tab) ? tab : 'alle'
    setFilter(phase)
    const r = searchParams.get('richtung')
    if (phase === 'rechnung' && r === 'eingehend') setRechnungRichtung('eingehend')
    else setRechnungRichtung('ausgehend')
    const lc = searchParams.get('lifecycle')
    // Erledigt-Toggle nur unter „Alle“ und „Rechnung“
    if (phase === 'alle' || phase === 'rechnung') {
      if (lc === 'erledigt' || lc === 'offen') setLifecycle(lc)
      else setLifecycle('offen')
    } else {
      setLifecycle('offen')
    }
  }, [embedded, searchParams])

  const rowKey = (row: VorgangListeRow) => `${row.phase}:${row.entityId}`

  const resetFilters = () => {
    setPhaseFilter('alle')
    setStatusFilter([])
    setQuery('')
    setFKunde('')
    setFTitel('')
    setFWertVon('')
    setFWertBis('')
    setFDatumVon('')
    setFDatumBis('')
  }

  const activeFilterCount =
    (filter !== 'alle' ? 1 : 0) +
    statusFilter.length +
    (query ? 1 : 0) +
    (fKunde ? 1 : 0) +
    (fTitel ? 1 : 0) +
    (fWertVon ? 1 : 0) +
    (fWertBis ? 1 : 0) +
    (fDatumVon ? 1 : 0) +
    (fDatumBis ? 1 : 0)

  const baseRows = useMemo(() => {
    let next = localRows
    if (restrictPartnerName?.trim()) {
      next = filterVorgaengeByPartnerName(next, restrictPartnerName)
    }
    const hwId = restrictHandwerkerId?.trim()
    if (hwId) {
      next = next.filter((r) => (r.handwerkerIds ?? []).includes(hwId))
    }
    const leadIds =
      restrictLeadIds && restrictLeadIds.length > 0 ? new Set(restrictLeadIds) : null
    const kundeId = restrictKundeId?.trim() || null
    if (leadIds || kundeId) {
      next = next.filter(
        (r) => (kundeId != null && r.kundeId === kundeId) || (leadIds != null && leadIds.has(r.leadId))
      )
    }
    return next
  }, [localRows, restrictPartnerName, restrictHandwerkerId, restrictKundeId, restrictLeadIds])

  const lifecycleCounts = useMemo(() => {
    const scope =
      filter === 'rechnung' ? baseRows.filter((v) => v.phase === 'rechnung') : baseRows
    let offen = 0
    let erledigt = 0
    for (const v of scope) {
      if (isVorgangErledigt(v)) erledigt += 1
      else offen += 1
    }
    return { offen, erledigt }
  }, [baseRows, filter])

  const hwLifecycleCounts = useMemo(() => {
    let offen = 0
    let erledigt = 0
    for (const r of hwEingangsrechnungen) {
      if (hwRechnungIstErledigt(r.status)) erledigt += 1
      else offen += 1
    }
    return { offen, erledigt }
  }, [hwEingangsrechnungen])

  const showHwEingang = filter === 'rechnung' && rechnungRichtung === 'eingehend'
  /** Offen/Erledigt-Toggle bei „Alle“ und „Rechnung“. */
  const showLifecycleToggle = filter === 'alle' || filter === 'rechnung'
  const effectiveLifecycleCounts = showHwEingang ? hwLifecycleCounts : lifecycleCounts

  /** Erledigt-Filter unter „Alle“ und „Rechnung“; andere Phasen nur Offen. */
  const lifecycleRows = useMemo(() => {
    if (filter === 'alle' || filter === 'rechnung') {
      return baseRows.filter((v) =>
        lifecycle === 'erledigt' ? isVorgangErledigt(v) : !isVorgangErledigt(v)
      )
    }
    return baseRows.filter((v) => !isVorgangErledigt(v))
  }, [baseRows, lifecycle, filter])

  const statusOptions = useMemo(() => {
    if (showHwEingang) {
      return [
        { value: 'eingereicht', label: 'Offen' },
        { value: 'bezahlt', label: 'Bezahlt' },
        { value: 'abgelehnt', label: 'Abgelehnt' },
      ]
    }
    // Nr. 9b: Status-Chips aus Resolver-Unterstatus (inkl. Angebot-Fine-Stages)
    const phaseRows =
      filter === 'alle' || filter === 'bestand'
        ? lifecycleRows
        : lifecycleRows.filter((v) => v.phase === filter)
    const hatWartetFreigabe = phaseRows.some((v) => v.badges.wartet_freigabe)

    if (filter !== 'alle' && filter !== 'bestand' && filter in PHASE_UNTERSTATUS_VALUES) {
      const phase = filter as VorgangPhase
      const opts = PHASE_UNTERSTATUS_VALUES[phase].map((u) => ({
        value: u,
        label: unterstatusLabel(phase, u),
      }))
      if (hatWartetFreigabe) {
        opts.unshift({
          value: STATUS_FILTER_WARTET_FREIGABE,
          label: ANFRAGE_WARTE_AUF_HV_LABEL,
        })
      }
      return opts
    }
    const byKey = new Map<string, string>()
    for (const v of lifecycleRows) {
      if (filter === 'bestand' && !v.ist_wiederkehrend) continue
      const key = statusFilterKey(v)
      if (!byKey.has(key)) byKey.set(key, statusLabel(v))
    }
    return Array.from(byKey.entries())
      .sort((a, b) => a[1].localeCompare(b[1], 'de'))
      .map(([value, label]) => ({ value, label }))
  }, [lifecycleRows, filter, showHwEingang])

  /** HW-Eingang: Filter über globales Sheet; ohne Statuswahl nach Offen/Erledigt. */
  const hwFilteredRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return hwEingangsrechnungen.filter((r) => {
      if (statusFilter.length > 0) {
        if (!statusFilter.includes(r.status)) return false
      } else {
        const erledigt = hwRechnungIstErledigt(r.status)
        if (lifecycle === 'erledigt' ? !erledigt : erledigt) return false
      }
      if (fKunde) {
        const needle = fKunde.toLowerCase()
        const inKunde = (r.kundeName ?? '').toLowerCase().includes(needle)
        const inPartner = r.handwerkerName.toLowerCase().includes(needle)
        if (!inKunde && !inPartner) return false
      }
      if (fTitel) {
        const needle = fTitel.toLowerCase()
        const hay = `${r.auftragTitel ?? ''} ${r.angebotsnr ?? ''}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (q) {
        const hay = [
          r.handwerkerName,
          r.kundeName,
          r.auftragTitel,
          r.gewerkName,
          r.angebotsnr,
          r.iban,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      const euro = r.betragBrutto
      if (fWertVon) {
        const min = Number(fWertVon)
        if (Number.isFinite(min) && (euro == null || euro < min)) return false
      }
      if (fWertBis) {
        const max = Number(fWertBis)
        if (Number.isFinite(max) && (euro == null || euro > max)) return false
      }
      const dk = (r.eingereichtAt ?? '').replace(/\D/g, '').slice(0, 8)
      if (fDatumVon && dk && dk < fDatumVon.replace(/-/g, '')) return false
      if (fDatumBis && dk && dk > fDatumBis.replace(/-/g, '')) return false
      return true
    })
  }, [
    hwEingangsrechnungen,
    statusFilter,
    lifecycle,
    query,
    fKunde,
    fTitel,
    fWertVon,
    fWertBis,
    fDatumVon,
    fDatumBis,
  ])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of VORGANG_FILTERS) {
      if (p === 'alle') {
        c[p] = lifecycleRows.length
      } else if (p === 'bestand') {
        c[p] = lifecycleRows.filter((v) => v.ist_wiederkehrend).length
      } else {
        c[p] = lifecycleRows.filter((v) => v.phase === p).length
      }
    }
    return c
  }, [lifecycleRows])

  const filteredBase = useMemo(() => {
    return lifecycleRows.filter((v) => {
      if (filter === 'bestand') {
        if (!v.ist_wiederkehrend) return false
      } else if (filter !== 'alle' && v.phase !== filter) {
        return false
      }
      if (statusFilter.length && !statusFilter.includes(statusFilterKey(v))) return false
      if (
        query &&
        !(v.titel + ' ' + (v.kundeName ?? '') + ' ' + v.entityId)
          .toLowerCase()
          .includes(query.toLowerCase())
      ) {
        return false
      }
      if (fKunde && !(v.kundeName ?? '').toLowerCase().includes(fKunde.toLowerCase())) return false
      if (fTitel && !v.titel.toLowerCase().includes(fTitel.toLowerCase())) return false
      const euro = wertEuro(v)
      if (fWertVon) {
        const min = Number(fWertVon)
        if (Number.isFinite(min) && (euro == null || euro < min)) return false
      }
      if (fWertBis) {
        const max = Number(fWertBis)
        if (Number.isFinite(max) && (euro == null || euro > max)) return false
      }
      if (fDatumVon && dateKey(v) < fDatumVon.replace(/-/g, '')) return false
      if (fDatumBis && dateKey(v) > fDatumBis.replace(/-/g, '')) return false
      return true
    })
  }, [
    lifecycleRows,
    filter,
    statusFilter,
    query,
    fKunde,
    fTitel,
    fWertVon,
    fWertBis,
    fDatumVon,
    fDatumBis,
  ])

  const toggleSort = (col: SortCol) => {
    setSortCol((c) => {
      if (c === col) {
        setSortDir((d) => (d === 1 ? -1 : 1))
        return col
      }
      setSortDir(1)
      return col
    })
  }

  const filtered = useMemo(() => {
    const sortKeys: Record<SortCol, (v: VorgangListeRow) => string | number> = {
      kunde: (v) => (v.kundeName ?? '').toLowerCase(),
      titel: (v) => v.titel.toLowerCase(),
      phase: (v) => PHASE_META[v.phase].label.toLowerCase(),
      wert: (v) => wertEuro(v) ?? -1,
      datum: (v) => dateKey(v),
      status: (v) => v.unterstatusLabel.toLowerCase(),
    }

    if (!sortCol) return filteredBase
    const fn = sortKeys[sortCol]
    const dir = sortDir
    return [...filteredBase].sort((a, b) => {
      const av = fn(a)
      const bv = fn(b)
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filteredBase, sortCol, sortDir])

  const selectedCount = Object.values(selected).filter(Boolean).length
  const toggleSel = (key: string) => setSelected((s) => ({ ...s, [key]: !s[key] }))

  const selectedRows = useMemo(
    () => filtered.filter((v) => selected[rowKey(v)]),
    [filtered, selected]
  )

  const bulkExport = useCallback(() => {
    runMockListExport(
      exportToCSV,
      selectedRows.map(toExportRow),
      EXPORT_FIELDS,
      'vorgaenge-auswahl'
    )
  }, [exportToCSV, selectedRows])

  const bulkDeleteTargets = useMemo(() => {
    const leadIds = Array.from(
      new Set(selectedRows.filter((v) => !v.standalone && v.leadId).map((v) => v.leadId))
    )
    const standaloneRechnungIds = selectedRows
      .filter((v) => v.standalone && v.phase === 'rechnung')
      .map((v) => v.entityId)
    return { leadIds, standaloneRechnungIds }
  }, [selectedRows])

  const canBulkAlsErledigt = useMemo(() => {
    if (!selectedRows.length) return false
    return selectedRows.every(
      (v) => v.phase === 'anfrage' && !v.standalone && v.leadId && !isVorgangErledigt(v)
    )
  }, [selectedRows])

  const runBulkDelete = useCallback(async () => {
    const { leadIds, standaloneRechnungIds } = bulkDeleteTargets
    if (!leadIds.length && !standaloneRechnungIds.length) return

    const leadIdSet = new Set(leadIds)
    const rechnungIdSet = new Set(standaloneRechnungIds)
    const removedKeys = new Set(selectedRows.map((v) => rowKey(v)))

    setBulkDeletePending(true)
    const total = leadIds.length + standaloneRechnungIds.length
    const loadingId = toast.loading(
      total === 1 ? 'Vorgang wird gelöscht…' : `${total} Vorgänge werden gelöscht…`
    )

    const r = await bulkDeleteVorgaenge({ leadIds, standaloneRechnungIds })

    setBulkDeletePending(false)
    setBulkDeleteOpen(false)

    if (!r.ok) {
      toast.error(r.message, { id: loadingId })
      router.refresh()
      return
    }

    if (r.failCount === 0) {
      const snapshot = selectedRows
      setLocalRows((prev) =>
        prev.filter(
          (row) =>
            !removedKeys.has(rowKey(row)) &&
            !(row.leadId && leadIdSet.has(row.leadId)) &&
            !(row.standalone && row.phase === 'rechnung' && rechnungIdSet.has(row.entityId))
        )
      )
      setSelected({})
      toast.success(
        r.okCount === 1 ? 'Vorgang gelöscht' : `${r.okCount} Vorgänge gelöscht`,
        {
          id: loadingId,
          action: {
            label: 'Rückgängig',
            onClick: () => {
              setLocalRows((prev) => {
                const keys = new Set(prev.map(rowKey))
                const restored = snapshot.filter((s) => !keys.has(rowKey(s)))
                return [...restored, ...prev]
              })
              toast.success('Löschen rückgängig gemacht')
            },
          },
        }
      )
      router.refresh()
      return
    }

    toast.error(`${r.okCount} gelöscht, ${r.failCount} fehlgeschlagen`, { id: loadingId })
    router.refresh()
  }, [bulkDeleteTargets, router, selectedRows])

  const bulkMarkErledigt = useCallback(() => {
    if (!canBulkAlsErledigt) return
    const leadIds = Array.from(new Set(selectedRows.map((v) => v.leadId).filter(Boolean)))
    void (async () => {
      setBulkErledigtPending(true)
      const loadingId = toast.loading('Status wird gesetzt…')
      let ok = 0
      let fail = 0
      for (const leadId of leadIds) {
        const r = await updateLeadStatus(leadId, 'abgebrochen', 'Als erledigt markiert (Liste)')
        if (r.ok) ok += 1
        else fail += 1
      }
      setBulkErledigtPending(false)
      setSelected({})
      if (fail === 0) {
        for (const leadId of leadIds) {
          const row = selectedRows.find((v) => v.leadId === leadId)
          if (row) {
            const k = rowKey(row)
            setFlashKeys((f) => ({ ...f, [k]: true }))
            window.setTimeout(() => {
              setFlashKeys((f) => {
                const n = { ...f }
                delete n[k]
                return n
              })
            }, 1200)
          }
        }
        toast.success(ok === 1 ? 'Als erledigt markiert' : `${ok} als erledigt markiert`, {
          id: loadingId,
        })
      } else {
        toast.error(`${ok} ok, ${fail} fehlgeschlagen`, { id: loadingId })
      }
      router.refresh()
    })()
  }, [canBulkAlsErledigt, router, selectedRows])

  const bulkOpen = useCallback(() => {
    const row = selectedRows[0]
    if (row) router.push(row.detailHref)
  }, [router, selectedRows])

  const paginationResetKey = `${lifecycle}|${filter}|${statusFilter.join(',')}|${query}|${sortCol}|${sortDir}`
  const {
    pageItems,
    infiniteItems,
    hasMore,
    loadMore,
    visibleCount,
    pageIndex,
    totalPages,
    total,
    pageSize,
    setPageIndex,
  } = useListPage(filtered, 12, paginationResetKey)

  function openDetail(href: string) {
    router.push(href)
  }

  const isMobile = useIsMobile()
  const displayItems = isMobile ? infiniteItems : pageItems

  const allPageSelected =
    displayItems.length > 0 && displayItems.every((v) => selected[rowKey(v)])
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((v) => selected[rowKey(v)])

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected({})
      return
    }
    const n: Record<string, boolean> = {}
    filtered.forEach((v) => {
      n[rowKey(v)] = true
    })
    setSelected(n)
  }

  const filterResultCount = showHwEingang ? hwFilteredRows.length : filtered.length

  const filterFooter = (
    <div className="sheet-footer-actions">
      <MockBtn kind="secondary" onClick={resetFilters}>
        Zurücksetzen
      </MockBtn>
      <MockBtn kind="primary" onClick={() => setFilterOpen(false)}>
        Anwenden ({filterResultCount})
      </MockBtn>
    </div>
  )

  const filterFields = (
    <>
      <div className="form-section-h">Suche</div>
      <div className="input" style={{ marginBottom: 16 }}>
        <MockIcon ctx="default" n="search" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            showHwEingang
              ? 'Partner, Auftrag, IBAN …'
              : 'Kunde, Vorgang, Ort, Nummer…'
          }
          autoFocus={!isMobile}
        />
      </div>
      <div className="form-grid" style={{ marginBottom: 16 }}>
        <label className="field">
          <span className="field-lbl">{showHwEingang ? 'Partner / Kunde' : 'Kunde'}</span>
          <input
            className="txt"
            value={fKunde}
            onChange={(e) => setFKunde(e.target.value)}
            placeholder="Name enthält…"
          />
        </label>
        <label className="field">
          <span className="field-lbl">{showHwEingang ? 'Auftrag' : 'Vorgang'}</span>
          <input
            className="txt"
            value={fTitel}
            onChange={(e) => setFTitel(e.target.value)}
            placeholder="Titel enthält…"
          />
        </label>
      </div>
      <div className="form-section-h">Phase</div>
      <div className="chiprow" style={{ marginBottom: 16 }}>
        {VORGANG_FILTERS.map((p) => (
          <MockChip
            key={p}
            active={filter === p}
            onClick={() => setPhaseFilter(p)}
            title={p === 'bestand' ? fachbegriff('bestand') : undefined}
            icon={
              p === 'bestand'
                ? 'refresh'
                : p !== 'alle'
                  ? PHASE_META[p as VorgangPhase].icon
                  : undefined
            }
          >
            {phaseChipLabel(p)}
          </MockChip>
        ))}
      </div>
      <div className="form-section-h">Status</div>
      <div className="chiprow" style={{ marginBottom: 16 }}>
        {statusOptions.map((s) => (
          <MockChip
            key={s.value}
            active={statusFilter.includes(s.value)}
            onClick={() =>
              setStatusFilter((f) =>
                f.includes(s.value) ? f.filter((x) => x !== s.value) : [...f, s.value]
              )
            }
          >
            {s.label}
          </MockChip>
        ))}
      </div>
      <FilterRangeRow
        title="Wert (€)"
        von={
          <input
            className="txt"
            type="number"
            value={fWertVon}
            onChange={(e) => setFWertVon(e.target.value)}
            placeholder="0"
            inputMode="decimal"
          />
        }
        bis={
          <input
            className="txt"
            type="number"
            value={fWertBis}
            onChange={(e) => setFWertBis(e.target.value)}
            placeholder="—"
            inputMode="decimal"
          />
        }
      />
      <FilterRangeRow
        title="Zeitraum"
        von={
          <DateInput
            size="sm"
            value={fDatumVon}
            onChange={(e) => setFDatumVon(e.target.value)}
          />
        }
        bis={
          <DateInput
            size="sm"
            value={fDatumBis}
            onChange={(e) => setFDatumBis(e.target.value)}
          />
        }
      />
    </>
  )

  return (
    <div>
      <div className="listbar">
        <div className="listbar-main">
          <div className="listbar-chips" role="group" aria-label="Phase">
            {VORGANG_FILTERS.map((p) => (
              <MockChip
                key={p}
                active={filter === p}
                onClick={() => setPhaseFilter(p)}
                count={counts[p]}
                title={p === 'bestand' ? fachbegriff('bestand') : undefined}
                icon={
                  p === 'bestand'
                    ? 'refresh'
                    : p !== 'alle'
                      ? PHASE_META[p as VorgangPhase].icon
                      : undefined
                }
              >
                {phaseChipLabel(p)}
              </MockChip>
            ))}
            {filter === 'rechnung' ? (
              <>
                <span className="listbar-chips-sep" aria-hidden />
                <MockChip
                  active={rechnungRichtung === 'ausgehend'}
                  count={lifecycle === 'erledigt' ? undefined : counts.rechnung}
                  onClick={() => setRechnungRichtungFilter('ausgehend')}
                >
                  Ausgehend
                </MockChip>
                <MockChip
                  active={rechnungRichtung === 'eingehend'}
                  count={
                    lifecycle === 'erledigt'
                      ? hwLifecycleCounts.erledigt
                      : hwLifecycleCounts.offen
                  }
                  onClick={() => setRechnungRichtungFilter('eingehend')}
                >
                  Eingehend
                </MockChip>
              </>
            ) : null}
          </div>
          <ListbarActionsMenu
            title="Listen-Aktionen"
            activeHint={activeFilterCount}
            directOpen={() => setFilterOpen(true)}
            items={[
              {
                icon: 'filter',
                label: 'Filter & Suchen',
                hint: activeFilterCount ? `${activeFilterCount} aktiv` : undefined,
                active: activeFilterCount > 0,
                onSelect: () => setFilterOpen(true),
              },
              {
                icon: 'download',
                label: 'CSV exportieren',
                onSelect: () =>
                  runMockListExport(
                    exportToCSV,
                    (filtered.length ? filtered : baseRows).map(toExportRow),
                    EXPORT_FIELDS,
                    'vorgaenge'
                  ),
              },
            ]}
            desktop={
              <>
                <MockBtn
                  icon="filter"
                  kind={activeFilterCount ? 'primary' : 'ghost'}
                  sm
                  title={
                    activeFilterCount
                      ? `Filter & Suchen (${activeFilterCount})`
                      : 'Filter & Suchen'
                  }
                  onClick={() => setFilterOpen(true)}
                />
                <MockBtn
                  icon="download"
                  kind="ghost"
                  sm
                  title="CSV exportieren"
                  onClick={() =>
                    runMockListExport(
                      exportToCSV,
                      (filtered.length ? filtered : baseRows).map(toExportRow),
                      EXPORT_FIELDS,
                      'vorgaenge'
                    )
                  }
                />
              </>
            }
          />
        </div>
        {showLifecycleToggle ? (
          <div
            className="listbar-lifecycle"
            role="group"
            aria-label="Lebenszyklus"
          >
            <div className="segment-toggle segment-toggle--listbar segment-toggle--stack">
              <button
                type="button"
                className={cn(
                  'segment-toggle-btn',
                  lifecycle === 'offen' && 'segment-toggle-btn--active'
                )}
                onClick={() => setLifecycleFilter('offen')}
              >
                Offen{' '}
                <span className="segment-toggle-count">
                  {effectiveLifecycleCounts.offen}
                </span>
              </button>
              <button
                type="button"
                className={cn(
                  'segment-toggle-btn',
                  lifecycle === 'erledigt' && 'segment-toggle-btn--active'
                )}
                onClick={() => setLifecycleFilter('erledigt')}
              >
                Erledigt{' '}
                <span className="segment-toggle-count">
                  {effectiveLifecycleCounts.erledigt}
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {isMobile ? (
        <MobileListFilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Filter & Suchen"
          footer={filterFooter}
        >
          {filterFields}
        </MobileListFilterSheet>
      ) : (
        <MockModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          icon="filter"
          title="Filter & Suchen"
          sub="Vorgänge eingrenzen"
          footer={filterFooter}
        >
          {filterFields}
        </MockModal>
      )}

      {selectedCount > 0 ? (
        <div className="bulkbar">
          <span>
            <b>{selectedCount}</b> ausgewählt
          </span>
          <div style={{ flex: 1 }} />
          {selectedCount === 1 ? (
            <MockBtn kind="ghost" sm icon="external-link" onClick={bulkOpen}>
              Öffnen
            </MockBtn>
          ) : null}
          {canBulkAlsErledigt ? (
            <MockBtn
              kind="ghost"
              sm
              icon="check"
              disabled={bulkErledigtPending}
              onClick={bulkMarkErledigt}
            >
              Als erledigt
            </MockBtn>
          ) : null}
          <MockBtn kind="ghost" sm icon="download" onClick={bulkExport}>
            Export
          </MockBtn>
          <MockBtn
            kind="danger"
            sm
            icon="trash"
            onClick={() => setBulkDeleteOpen(true)}
            disabled={bulkDeletePending}
          >
            Löschen
          </MockBtn>
          <MockBtn
            kind="ghost"
            sm
            className="qa-btn"
            icon="x"
            onClick={() => setSelected({})}
            title="Auswahl aufheben"
          />
        </div>
      ) : null}

      <MockModal
        open={bulkDeleteOpen}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteOpen(false)
        }}
        icon="trash"
        title={
          selectedCount === 1
            ? 'Vorgang löschen?'
            : `${selectedCount} Vorgänge löschen?`
        }
        sub="Dauerhaft entfernen — Kunde bleibt erhalten."
        size="sm"
        footer={
          <>
            <MockBtn kind="ghost" disabled={bulkDeletePending} onClick={() => setBulkDeleteOpen(false)}>
              Abbrechen
            </MockBtn>
            <div style={{ flex: 1 }} />
            <MockBtn
              kind="danger"
              icon={bulkDeletePending ? undefined : 'trash'}
              disabled={bulkDeletePending}
              onClick={() => void runBulkDelete()}
            >
              {bulkDeletePending ? 'Wird gelöscht…' : 'Löschen'}
            </MockBtn>
          </>
        }
      >
        <div style={{ fontSize: 'var(--fs-text)', color: 'var(--text-2)', lineHeight: 1.5 }}>
          {bulkDeletePending
            ? 'Bitte warten…'
            : selectedCount === 1
              ? 'Der ausgewählte Vorgang wird unwiderruflich gelöscht.'
              : `${selectedCount} ausgewählte Vorgänge werden unwiderruflich gelöscht.`}
        </div>
      </MockModal>

      <PullToRefresh onRefresh={() => router.refresh()}>
      {showHwEingang ? (
        <HwEingangsrechnungenListe
          rows={hwFilteredRows}
          filterKey={`${lifecycle}|${statusFilter.join(',')}|${query}|${fKunde}|${fTitel}|${fWertVon}|${fWertBis}|${fDatumVon}|${fDatumBis}`}
        />
      ) : (
      <div
        className="listcard listcard--cols vg-selectmode"
        style={{ ['--list-cols' as string]: gridTemplateColumns }}
      >
        <div className="vg-row head">
          <div
            className="vg-check"
            onClick={(e) => {
              e.stopPropagation()
              toggleSelectAll()
            }}
            title={allFilteredSelected ? 'Auswahl aufheben' : 'Alle auswählen'}
          >
            <span className={cn('vg-box', allFilteredSelected && 'on', allPageSelected && !allFilteredSelected && 'partial')}>
              {allFilteredSelected || allPageSelected ? (
                <MockIcon ctx="default" n="check" size={12} />
              ) : null}
            </span>
          </div>
          {visibleCols.kunde ? (
          <MockSortHead
            col="kunde"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startColResize('kunde', e)}
          >
            Kunde
          </MockSortHead>
          ) : null}
          {visibleCols.titel ? (
          <MockSortHead
            col="titel"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startColResize('titel', e)}
          >
            Vorgang
          </MockSortHead>
          ) : null}
          {visibleCols.phase ? (
          <MockSortHead
            col="phase"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startColResize('phase', e)}
          >
            Phase
          </MockSortHead>
          ) : null}
          {visibleCols.wert ? (
          <MockSortHead
            col="wert"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            right
            resizable
            onResizePointerDown={(e) => startColResize('wert', e)}
          >
            Wert
          </MockSortHead>
          ) : null}
          {visibleCols.datum ? (
          <MockSortHead
            col="datum"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startColResize('datum', e)}
          >
            Datum
          </MockSortHead>
          ) : null}
          {visibleCols.status ? (
          <MockSortHead
            col="status"
            sortCol={sortCol}
            sortDir={sortDir}
            onSort={(c) => toggleSort(c as SortCol)}
            resizable
            onResizePointerDown={(e) => startColResize('status', e)}
          >
            Status
          </MockSortHead>
          ) : null}
          <div />
        </div>

        {displayItems.length === 0 ? (
          <MockEmpty
            icon="folder-open"
            title={
              !showLifecycleToggle
                ? 'Keine Vorgänge'
                : lifecycle === 'erledigt'
                  ? 'Keine erledigten Vorgänge'
                  : 'Keine offenen Vorgänge'
            }
            hint={vorgaengeEmptyHint({ showLifecycleToggle, lifecycle, filter })}
            action={
              showLifecycleToggle && lifecycle !== 'offen' ? (
                <MockBtn kind="ghost" onClick={() => setLifecycleFilter('offen')}>
                  Zu offenen Vorgängen
                </MockBtn>
              ) : undefined
            }
          />
        ) : (
          displayItems.map((v) => {
            const key = rowKey(v)
            const kind = statusKind(v)
            const label = statusLabel(v)
            const ersetzt = isErsetzt(v)
            const del = () => {
              if (v.standalone) runDeleteStandaloneRechnung(v.entityId, router, v.titel)
              else runDeleteVorgang(v.leadId, router)
            }
            const copy = () => {
              if (v.phase === 'anfrage') runDuplicateAnfrage(v.leadId || v.entityId, router)
              else if (v.phase === 'angebot') runDuplicateAngebot(v.entityId, router)
              else if (v.phase === 'auftrag' || v.entityType === 'auftrag') {
                runDuplicateAuftrag(v.entityId, router)
              } else if (v.phase === 'rechnung') runDuplicateRechnung(v.entityId, router)
              else toast.info('Kopieren für diesen Typ noch nicht verfügbar')
            }
            const edit = () => openDetail(v.detailHref)
            const row = (
              <div
                className={cn(
                  'vg-row',
                  selected[key] && 'sel',
                  ersetzt && 'vg-row--ersetzt',
                  flashKeys[key] && 'vg-row--flash'
                )}
                onClick={() => openDetail(v.detailHref)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(v.detailHref)
                  }
                }}
              >
                <div
                  className="vg-check"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSel(key)
                  }}
                >
                  <span className={cn('vg-box', selected[key] && 'on')}>
                    {selected[key] ? <MockIcon ctx="default" n="check" size={12} /> : null}
                  </span>
                </div>
                {visibleCols.kunde ? (
                <div className="vg-kunde">
                  <span className="vg-kunde__name" title={v.kundeName ?? undefined}>
                    {v.kundeName ?? '—'}
                  </span>
                </div>
                ) : null}
                {visibleCols.titel ? (
                <div className="vg-vorgang">
                  <div className={cn('t', ersetzt && 'vg-title--ersetzt')} title={v.titel}>
                    {v.titel}
                  </div>
                  {ersetzt ? <span className="vg-chip-ersetzt">ersetzt</span> : null}
                </div>
                ) : null}
                {visibleCols.phase ? (
                <div className="vg-phase">
                  <span className="ph-neutral">
                    <MockIcon ctx="default" n={PHASE_META[v.phase].icon} size={13} />
                    {PHASE_META[v.phase].label}
                  </span>
                </div>
                ) : null}
                {visibleCols.wert ? (
                <div
                  className="vg-wert"
                  style={{
                    textAlign: 'right',
                    fontWeight: 500,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: 'var(--fs-text)',
                  }}
                >
                  {v.wertLabel ?? '—'}
                </div>
                ) : null}
                {visibleCols.datum ? (
                <div className="vg-datum" style={{ fontSize: 'var(--fs-meta)', color: 'var(--text-3)' }}>
                  {formatDatum(v.updatedAt)}
                </div>
                ) : null}
                {visibleCols.status ? (
                <div className="vg-status">
                  <MockBadge kind={kind}>{label}</MockBadge>
                </div>
                ) : null}
              </div>
            )
            return (
              <SwipeRow
                key={key}
                disabled={!isMobile}
                leftActions={
                  isMobile
                    ? [{ icon: 'trash', label: 'Löschen', onClick: del, tone: 'danger' }]
                    : undefined
                }
                rightActions={
                  isMobile
                    ? [
                        { icon: 'pencil', label: 'Bearbeiten', onClick: edit, tone: 'primary' },
                        { icon: 'copy', label: 'Kopieren', onClick: copy, tone: 'accent' },
                      ]
                    : undefined
                }
              >
                {row}
              </SwipeRow>
            )
          })
        )}
        {displayItems.length > 0 ? (
          <div className="vg-aggregate" aria-label="Zusammenfassung">
            <div className="vg-aggregate__sum">
              <span>Summe</span>
              <b>
                {filtered
                  .reduce((s, r) => s + (wertEuro(r) ?? 0), 0)
                  .toLocaleString('de-DE', {
                    style: 'currency',
                    currency: 'EUR',
                    maximumFractionDigits: 0,
                  })}
              </b>
            </div>
            {selectedCount > 0 ? (
              <span className="vg-aggregate__sel">Auswahl {selectedCount}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      )}
      </PullToRefresh>

      {showHwEingang ? null : isMobile ? (
        <ListInfiniteSentinel
          hasMore={hasMore}
          onLoadMore={loadMore}
          shown={visibleCount}
          total={total}
          unit="Vorgänge"
        />
      ) : (
        <MockPager
          pageIndex={pageIndex}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          unit="Vorgänge"
          onPageChange={(p) => setPageIndex(p - 1)}
        />
      )}
    </div>
  )
}
