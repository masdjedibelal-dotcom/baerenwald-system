'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AnfrageNeuSheet } from '@/components/anfragen/AnfrageNeuSheet'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { ActionsMenu } from '@/components/ui/actions-menu'
import { toast } from '@/components/ui/app-toast'
import {
  MockBadge,
  MockChip,
  MockEmpty,
  MockIcon,
  MockPager,
  MockPopover,
  MockToolbar,
} from '@/components/mock-ui'
import { updateLeadStatus } from '@/app/(dashboard)/anfragen/actions'
import { runDeleteVorgang, runDuplicateAnfrage } from '@/lib/list-actions'
import { useExport, type ExportField } from '@/hooks/useExport'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useListPage } from '@/hooks/useListPage'
import { leadSituationDisplay } from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import { leadKontaktAnzeigeName, resolveLeadPreisAnzeige } from '@/lib/lead-display-helpers'
import { listEntityMenuItems } from '@/lib/list-entity-menu'
import {
  BEREICH_LABELS,
  KANAL_LABELS,
  STATUS_LABELS,
  cn,
  formatLeadListDatum,
} from '@/lib/utils'
import type { LeadStatus, LeadWithAngebote } from '@/lib/types'

type AnfragenChipFilter = '' | 'neu' | 'kontaktiert' | 'termin' | 'angebot'

const ANFRAGEN_ROW_GRID = '110px 1.6fr 1.4fr 120px 110px 100px 116px'

const CHIP_ORDER: AnfragenChipFilter[] = ['', 'neu', 'kontaktiert', 'termin', 'angebot']

const CHIP_LABELS: Record<AnfragenChipFilter, string> = {
  '': 'Alle',
  neu: 'Neu',
  kontaktiert: 'Kontaktiert',
  termin: 'Termin',
  angebot: 'Angebot',
}

const LIST_STATUSES: LeadStatus[] = ['neu', 'kontaktiert', 'termin', 'angebot']

const EXPORT_FIELDS: ExportField[] = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'E-Mail' },
  { key: 'telefon', label: 'Telefon' },
  { key: 'status', label: 'Status' },
  { key: 'kanal', label: 'Kanal' },
  { key: 'bereiche', label: 'Bereiche' },
  { key: 'preis_anzeige', label: 'Preisrahmen (Anzeige)' },
  { key: 'budget_ca', label: 'budget_ca' },
  { key: 'preis_min', label: 'preis_min' },
  { key: 'preis_max', label: 'preis_max' },
  { key: 'plz', label: 'PLZ' },
  { key: 'created_at', label: 'Erstellt am' },
]

function leadName(lead: LeadWithAngebote) {
  return leadKontaktAnzeigeName(lead)
}

function leadEmail(lead: LeadWithAngebote) {
  const k = lead.kunden
  if (k && 'email' in k && k.email) return k.email
  return lead.kontakt_email ?? ''
}

function leadTel(lead: LeadWithAngebote) {
  const k = lead.kunden
  if (k && 'telefon' in k && k.telefon) return k.telefon
  return lead.kontakt_telefon ?? ''
}

function formatAnfrageNr(lead: LeadWithAngebote): string {
  const d = new Date(lead.created_at)
  const year = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear()
  const seq = lead.id.replace(/-/g, '').slice(-4).toUpperCase()
  return `L-${year}-${seq}`
}

function leadAnfrageTitel(lead: LeadWithAngebote): string {
  const situation = leadSituationDisplay(lead.situation)
  const bereiche = bereicheFuerAnzeige(lead.bereiche, lead.situation)
  const bereicheText = bereiche.map((b) => BEREICH_LABELS[b] ?? b).join(', ')
  return situation || bereicheText || '—'
}

function leadEingangAnzeige(lead: LeadWithAngebote): string {
  if (!lead.created_at) return '—'
  const datePart = formatLeadListDatum(lead.created_at)
  const d = new Date(lead.created_at)
  if (Number.isNaN(d.getTime())) return datePart
  const timePart = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} · ${timePart}`
}

function leadStatusMockBadge(status: LeadStatus): { kind: string; label: string } {
  const kindMap: Partial<Record<LeadStatus, string>> = {
    neu: 'neu',
    kontaktiert: 'aktiv',
    termin: 'aktiv',
    angebot: 'warten',
    auftrag: 'fertig',
    abgeschlossen: 'fertig',
    abgebrochen: 'storniert',
  }
  return {
    kind: kindMap[status] ?? 'plain',
    label: STATUS_LABELS[status] ?? status,
  }
}

const STATUS_POPOVER_OPTIONS: LeadStatus[] = [
  'neu',
  'kontaktiert',
  'termin',
  'angebot',
  'auftrag',
  'abgebrochen',
]

const STATUS_DOT_COLOR: Partial<Record<LeadStatus, string>> = {
  neu: 'var(--blue-tx)',
  kontaktiert: 'var(--blue-tx)',
  termin: 'var(--grn-tx)',
  angebot: '#D9A800',
  auftrag: 'var(--green)',
  abgebrochen: 'var(--red-tx)',
}

function LeadStatusBadgePopover({
  lead,
  onUpdated,
}: {
  lead: LeadWithAngebote
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const badge = leadStatusMockBadge(lead.status)

  return (
    <span
      ref={anchorRef}
      onClick={(e) => {
        e.stopPropagation()
        setOpen(true)
      }}
      style={{ cursor: 'pointer' }}
    >
      <MockBadge kind={badge.kind}>{badge.label}</MockBadge>
      <MockPopover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} align="right" width={200}>
        <div className="pop-h">Status setzen</div>
        {STATUS_POPOVER_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="pop-item"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const r = await updateLeadStatus(lead.id, s)
                if (!r.ok) {
                  toast.error(r.message)
                  return
                }
                toast.success(`Status: ${STATUS_LABELS[s] ?? s}`)
                setOpen(false)
                onUpdated()
              })
            }}
          >
            <span
              className="dot"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: STATUS_DOT_COLOR[s] ?? 'var(--text-3)',
              }}
            />
            {STATUS_LABELS[s] ?? s}
            {lead.status === s ? (
              <MockIcon n="check" size={14} style={{ marginLeft: 'auto', color: 'var(--green)' }} />
            ) : null}
          </button>
        ))}
      </MockPopover>
    </span>
  )
}

function toExportRow(lead: LeadWithAngebote): Record<string, unknown> {
  return {
    name: leadName(lead),
    email: leadEmail(lead),
    telefon: leadTel(lead),
    status: STATUS_LABELS[lead.status] ?? lead.status,
    kanal: KANAL_LABELS[lead.kanal] ?? lead.kanal,
    bereiche: (lead.bereiche ?? []).map((b) => BEREICH_LABELS[b] ?? b).join(', '),
    preis_anzeige: resolveLeadPreisAnzeige(
      lead.kanal,
      lead.budget_ca,
      lead.preis_min,
      lead.preis_max,
      lead.funnel_daten
    ),
    budget_ca: lead.budget_ca ?? '',
    preis_min: lead.preis_min ?? '',
    preis_max: lead.preis_max ?? '',
    plz: lead.plz ?? '',
    created_at: lead.created_at,
  }
}

export function AnfragenListeClient({
  leads,
  mode = 'page',
  selectedId = null,
}: {
  leads: LeadWithAngebote[]
  mode?: 'page' | 'pane'
  selectedId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { exportToCSV } = useExport()
  const [exportOpen, setExportOpen] = useState(false)
  const [neuOpen, setNeuOpen] = useState(false)
  const [filter, setFilter] = useState<AnfragenChipFilter>('')
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)

  const defaultKundeId = searchParams.get('kunde_id')
  const zielNachAnlage = searchParams.get('ziel')
  const isPane = mode === 'pane'

  function closeNeuSheet() {
    setNeuOpen(false)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('neu')
    const query = params.toString()
    router.replace(query ? `/anfragen?${query}` : '/anfragen', { scroll: false })
  }

  useEffect(() => {
    if (searchParams.get('neu') === '1') setNeuOpen(true)
  }, [searchParams])

  const listBase = useMemo(
    () => leads.filter((l) => LIST_STATUSES.includes(l.status)),
    [leads]
  )

  const counts = useMemo(() => {
    const c: Record<AnfragenChipFilter, number> = {
      '': listBase.length,
      neu: 0,
      kontaktiert: 0,
      termin: 0,
      angebot: 0,
    }
    for (const l of listBase) {
      if (l.status === 'neu' || l.status === 'kontaktiert' || l.status === 'termin' || l.status === 'angebot') {
        c[l.status]++
      }
    }
    return c
  }, [listBase])

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase()
    return listBase
      .filter((l) => {
        if (filter && l.status !== filter) return false
        if (!needle) return true
        const anfrage = leadAnfrageTitel(l).toLowerCase()
        const name = leadName(l).toLowerCase()
        const tel = leadTel(l).replace(/\s/g, '').toLowerCase()
        return (
          name.includes(needle) ||
          anfrage.includes(needle) ||
          tel.includes(needle) ||
          formatAnfrageNr(l).toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [listBase, filter, debouncedQ])

  const paginationResetKey = `${filter}|${debouncedQ}`
  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    10,
    paginationResetKey
  )

  function openDetail(leadId: string) {
    router.push(`/anfragen/${leadId}`)
  }

  return (
    <div>
      <MockToolbar
        query={q}
        onQueryChange={setQ}
        placeholder="Anfragen suchen..."
        onFilterClick={() => {}}
        onExportClick={() => setExportOpen(true)}
      />

      <div className="chiprow">
        {CHIP_ORDER.map((chip) => (
          <MockChip
            key={chip || 'alle'}
            active={filter === chip}
            count={counts[chip]}
            onClick={() => setFilter(chip)}
          >
            {CHIP_LABELS[chip]}
          </MockChip>
        ))}
      </div>

      <div className="listcard">
        <div className="list-row head" style={{ gridTemplateColumns: ANFRAGEN_ROW_GRID }}>
          <div>Nr.</div>
          <div>Anfrage</div>
          <div>Kunde</div>
          <div style={{ textAlign: 'right' }}>Betrag</div>
          <div>Eingang</div>
          <div>Status</div>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="inbox-off"
            title={listBase.length === 0 ? 'Noch keine Anfragen' : 'Keine Anfragen gefunden'}
            hint={
              listBase.length === 0
                ? 'Anfragen kommen über die Website oder du legst sie manuell an.'
                : 'Suchbegriff anpassen oder Filter zurücksetzen'
            }
          />
        ) : (
          pageItems.map((lead) => {
            const telDigits = leadTel(lead).replace(/\D/g, '')
            return (
              <div
                key={lead.id}
                className={cn('list-row', selectedId === lead.id && isPane && 'active')}
                style={{ gridTemplateColumns: ANFRAGEN_ROW_GRID }}
                onClick={() => openDetail(lead.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openDetail(lead.id)
                  }
                }}
              >
                <div
                  style={{
                    color: 'var(--text-3)',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                  }}
                >
                  {formatAnfrageNr(lead)}
                </div>
                <div style={{ fontWeight: 600 }}>{leadAnfrageTitel(lead)}</div>
                <div style={{ color: 'var(--text-2)' }}>{leadName(lead)}</div>
                <div
                  style={{
                    fontWeight: 500,
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {resolveLeadPreisAnzeige(
                    lead.kanal,
                    lead.budget_ca,
                    lead.preis_min,
                    lead.preis_max,
                    lead.funnel_daten
                  )}
                </div>
                <div style={{ color: 'var(--text-3)' }}>{leadEingangAnzeige(lead)}</div>
                <LeadStatusBadgePopover lead={lead} onUpdated={() => router.refresh()} />
                <div
                  className="row-actions"
                  onClick={(e) => e.stopPropagation()}
                  style={{ justifyContent: 'flex-end' }}
                >
                  {telDigits ? (
                    <>
                      <button
                        type="button"
                        className="qa-btn"
                        title="Anrufen"
                        onClick={() => window.open(`tel:${telDigits}`)}
                      >
                        <MockIcon n="phone" size={15} />
                      </button>
                      <button
                        type="button"
                        className="qa-btn"
                        title="WhatsApp"
                        onClick={() => window.open(`https://wa.me/${telDigits}`, '_blank')}
                      >
                        <MockIcon n="brand-whatsapp" size={15} />
                      </button>
                    </>
                  ) : null}
                  <ActionsMenu
                    trigger={
                      <button type="button" className="qa-btn" title="Mehr" aria-label="Aktionen">
                        <MockIcon n="dots" size={15} />
                      </button>
                    }
                    items={listEntityMenuItems(
                      'anfrage',
                      {
                        name: leadKontaktAnzeigeName(lead),
                        tel: lead.kontakt_telefon,
                        mail: lead.kontakt_email,
                        status: lead.status,
                      },
                      {
                        onEdit: () => openDetail(lead.id),
                        onAngebot: () => router.push(`/anfragen/${lead.id}`),
                        onCopy: () => runDuplicateAnfrage(lead.id, router),
                        onDelete: () => runDeleteVorgang(lead.id, router),
                        deleteLabel: leadKontaktAnzeigeName(lead),
                      }
                    )}
                    sheetTitle="Anfrage"
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
        unit="Anfragen"
        onPageChange={(p) => setPageIndex(p - 1)}
      />

      <AnfrageNeuSheet
        open={neuOpen}
        onClose={closeNeuSheet}
        defaultKundeId={defaultKundeId}
        onSuccess={(id) => {
          closeNeuSheet()
          if (zielNachAnlage === 'angebot') {
            router.push(`/anfragen/${id}?angebot_wizard=1`)
          } else {
            router.push(`/anfragen/${id}`)
          }
          router.refresh()
        }}
      />

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Anfragen exportieren"
        fields={EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : listBase
          const data = source.map(toExportRow)
          const fields = EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'anfragen')
        }}
      />
    </div>
  )
}
