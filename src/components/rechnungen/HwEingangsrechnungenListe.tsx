'use client'

import { MockBadge, MockBtn, MockChip, MockEmpty, MockPager, MockSortHead } from '@/components/mock-ui'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { EditorSheet } from '@/components/surfaces/EditorSheet'

import { useLocalTransition } from '@/components/ui/action-busy'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useListPage } from '@/hooks/useListPage'
import { toast } from '@/components/ui/app-toast'
import { getHandwerkerEinreichungPdfUrl } from '@/app/(dashboard)/angebote/actions'
import {
  markHwEingangsrechnungBezahlt,
  setHwEingangsrechnungStatus,
} from '@/app/(dashboard)/rechnungen/hw-eingang-actions'
import {
  hwRechnungStatusLabel,
  type HwEingangsrechnungListeRow,
  type HwRechnungStatus,
} from '@/lib/rechnungen/load-hw-eingangsrechnungen'
import { formatDatum } from '@/lib/utils'
import { formatEuro } from '@/lib/format/geld-datum'
import { TOAST } from '@/lib/copy'

function statusKind(status: HwRechnungStatus): 'done' | 'offer' | 'cancel' | 'order' {
  if (status === 'bezahlt') return 'done'
  if (status === 'abgelehnt') return 'cancel'
  return 'offer'
}

function formatIban(iban: string | null): string {
  if (!iban) return '—'
  const clean = iban.replace(/\s+/g, '').toUpperCase()
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

type SortCol = 'partner' | 'auftrag' | 'betrag' | 'eingang' | 'status'
type StatusFilter = 'alle' | HwRechnungStatus

/** Liste ohne eigene Filter-UI — Filter kommt vom globalen Vorgänge-Filter. */
export function HwEingangsrechnungenListe({
  rows,
  filterKey = '',
}: {
  rows: HwEingangsrechnungListeRow[]
  /** Pagination zurücksetzen wenn Eltern-Filter wechseln */
  filterKey?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useLocalTransition()
  const [active, setActive] = useState<HwEingangsrechnungListeRow | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')
  const [sortCol, setSortCol] = useState<SortCol>('eingang')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  const statusCounts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      alle: rows.length,
      eingereicht: 0,
      bezahlt: 0,
      abgelehnt: 0,
    }
    for (const r of rows) {
      c[r.status] = (c[r.status] ?? 0) + 1
    }
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const base = statusFilter === 'alle' ? rows : rows.filter((r) => r.status === statusFilter)
    const sorted = [...base]
    sorted.sort((a, b) => {
      let cmp = 0
      if (sortCol === 'partner') cmp = a.handwerkerName.localeCompare(b.handwerkerName, 'de')
      else if (sortCol === 'auftrag')
        cmp = (a.auftragTitel || '').localeCompare(b.auftragTitel || '', 'de')
      else if (sortCol === 'betrag') cmp = (a.betragBrutto ?? 0) - (b.betragBrutto ?? 0)
      else if (sortCol === 'eingang')
        cmp = (a.eingereichtAt || '').localeCompare(b.eingereichtAt || '')
      else cmp = a.status.localeCompare(b.status)
      return cmp * sortDir
    })
    return sorted
  }, [rows, statusFilter, sortCol, sortDir])

  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    40,
    `${filterKey}|${statusFilter}|${sortCol}|${sortDir}`
  )

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === 1 ? -1 : 1))
    else {
      setSortCol(col)
      setSortDir(col === 'eingang' || col === 'betrag' ? -1 : 1)
    }
  }

  // Notification-Deep-Link: ?hw=<zuweisungId>
  useEffect(() => {
    const hwId = searchParams.get('hw')?.trim()
    if (!hwId) return
    const match = rows.find((r) => r.zuweisungId === hwId)
    if (match) setActive(match)
  }, [searchParams, rows])

  function clearHwParam() {
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has('hw')) return
    params.delete('hw')
    const qs = params.toString()
    router.replace(qs ? `/vorgaenge?${qs}` : '/vorgaenge', { scroll: false })
  }

  function closeDetail() {
    setActive(null)
    clearHwParam()
  }

  function runStatus(id: string, status: HwRechnungStatus) {
    startTransition(async () => {
      const r = await setHwEingangsrechnungStatus(id, status)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(
        status === 'bezahlt'
          ? 'Als bezahlt markiert'
          : status === 'abgelehnt'
            ? 'Als abgelehnt markiert'
            : 'Wieder auf offen gesetzt'
      )
      setActive((prev) =>
        prev && prev.zuweisungId === id
          ? { ...prev, status, bezahltAt: status === 'bezahlt' ? new Date().toISOString() : null }
          : prev
      )
      afterServerActionRefresh()
    })
  }

  async function openPdf(row: HwEingangsrechnungListeRow) {
    setPdfBusy(true)
    try {
      const r = await getHandwerkerEinreichungPdfUrl(row.zuweisungId, 'rechnung')
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      window.open(r.url, '_blank', 'noopener,noreferrer')
    } finally {
      setPdfBusy(false)
    }
  }

  async function copyIban(iban: string | null) {
    if (!iban) {
      toast.error(TOAST.keine_iban_hinterlegt)
      return
    }
    try {
      await navigator.clipboard.writeText(iban.replace(/\s+/g, ''))
      toast.success(TOAST.iban_kopiert)
    } catch {
      toast.error(TOAST.kopieren_fehlgeschlagen)
    }
  }

  return (
    <div className="space-y-3">
      <div className="chiprow flex flex-wrap gap-2">
        {(
          [
            { key: 'alle' as const, label: 'Alle' },
            { key: 'eingereicht' as const, label: 'Offen' },
            { key: 'bezahlt' as const, label: 'Bezahlt' },
            { key: 'abgelehnt' as const, label: 'Abgelehnt' },
          ] as const
        ).map(({ key, label }) => (
          <MockChip
            key={key}
            active={statusFilter === key}
            count={statusCounts[key]}
            onClick={() => setStatusFilter(key)}
          >
            {label}
          </MockChip>
        ))}
      </div>

      <div
        className="listcard listcard--cols"
        style={{
          ['--list-cols' as string]:
            'minmax(8.75rem, 1.2fr) minmax(11.25rem, 1.6fr) minmax(4.5rem, 0.7fr) minmax(5.5rem, 0.8fr) minmax(5rem, 0.7fr) minmax(4.5rem, 0.6fr)',
        }}
        role="table"
        aria-label="Eingangsrechnungen Partner"
      >
        <div className="vg-row head" role="row">
          <MockSortHead col="partner" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Partner
          </MockSortHead>
          <MockSortHead col="auftrag" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Auftrag / Kunde
          </MockSortHead>
          <MockSortHead col="betrag" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)} right>
            Betrag
          </MockSortHead>
          <MockSortHead col="eingang" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Eingang
          </MockSortHead>
          <MockSortHead col="status" sortCol={sortCol} sortDir={sortDir} onSort={(c) => toggleSort(c as SortCol)}>
            Status
          </MockSortHead>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="receipt"
            title="Keine Eingangsrechnungen"
            hint={
              statusFilter !== 'alle'
                ? 'Anderen Status-Filter wählen oder Filter zurücksetzen.'
                : 'Filter zurücksetzen oder Partner-Upload abwarten.'
            }
          />
        ) : (
          pageItems.map((r) => (
            <div
              key={r.zuweisungId}
              className="vg-row"
              role="button"
              tabIndex={0}
              onClick={() => setActive(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(r)
                }
              }}
            >
              <div className="vg-kunde">
                <span className="vg-kunde__name" title={r.handwerkerName}>
                  {r.handwerkerName}
                </span>
                {r.gewerkName ? (
                  <span className="block text-[length:var(--fs-meta)] text-bw-text-muted">
                    {r.gewerkName}
                  </span>
                ) : null}
              </div>
              <div className="vg-vorgang">
                <div className="t" title={r.auftragTitel ?? undefined}>
                  {r.auftragTitel || 'Partner · Rechnung'}
                </div>
                <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  {[r.kundeName, r.angebotsnr ? `Angebot ${r.angebotsnr}` : null]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </span>
              </div>
              <div className="vg-wert text-right font-medium">{formatEuro(r.betragBrutto, { rounded: true, decimals: 0 })}</div>
              <div className="vg-datum text-bw-text-muted">
                {r.eingereichtAt ? formatDatum(r.eingereichtAt) : '—'}
              </div>
              <div>
                <MockBadge kind={statusKind(r.status)}>{hwRechnungStatusLabel(r.status)}</MockBadge>
              </div>
              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                {r.status === 'eingereicht' ? (
                  <MockBtn
                    kind="ghost"
                    disabled={pending}
                    onClick={() => runStatus(r.zuweisungId, 'bezahlt')}
                  >
                    Als überwiesen
                  </MockBtn>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <MockPager
          pageIndex={pageIndex}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          unit="Eingangsrechnungen"
          onPageChange={(p) => setPageIndex(p - 1)}
        />
      ) : null}

      <EditorSheet
        open={active != null}
        onClose={closeDetail}
        title="Eingangsrechnung · Partner"
        size="md"
      >
        {active ? (
          <div className="space-y-4 text-[length:var(--fs-text)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">Partner</div>
                <div className="font-medium">{active.handwerkerName}</div>
                {active.gewerkName ? (
                  <div className="text-[length:var(--fs-meta)] text-bw-text-muted">
                    {active.gewerkName}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">Status</div>
                <MockBadge kind={statusKind(active.status)}>
                  {hwRechnungStatusLabel(active.status)}
                </MockBadge>
              </div>
              <div>
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">Auftrag</div>
                <div>{active.auftragTitel || '—'}</div>
                {active.kundeName ? (
                  <div className="text-[length:var(--fs-meta)] text-bw-text-muted">
                    {active.kundeName}
                  </div>
                ) : null}
              </div>
              <div>
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">Betrag</div>
                <div className="font-medium">{formatEuro(active.betragBrutto, { rounded: true, decimals: 0 })}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">IBAN</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{formatIban(active.iban)}</span>
                  {active.iban ? (
                    <MockBtn type="button" kind="secondary" sm onClick={() => void copyIban(active.iban)}>
                      Kopieren
                    </MockBtn>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-card border border-bw-border bg-bw-surface-2/40 px-3 py-3">
              <div className="text-[length:var(--fs-meta)] text-bw-text-muted">Dokument</div>
              <div className="mt-1 font-medium">Rechnung vom Partner</div>
              <p className="mt-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
                PDF wie vom Partner eingereicht — auch unter Auftrag → Dokumente.
              </p>
              <div className="mt-3">
                <MockBtn
                  type="button"
                  kind="primary"
                  disabled={pdfBusy}
                  onClick={() => void openPdf(active)}
                >
                  {pdfBusy ? 'Lädt…' : 'Rechnung öffnen'}
                </MockBtn>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-bw-border pt-3">
              {active.auftragHref ? (
                <Link href={`${active.auftragHref}?tab=akte`} className="btn secondary">
                  Zum Auftrag · Dokumente
                </Link>
              ) : null}
              {active.status === 'eingereicht' ? (
                <>
                  <MockBtn
                    type="button"
                    kind="primary"
                    disabled={pending}
                    onClick={() => runStatus(active.zuweisungId, 'bezahlt')}
                  >
                    Als überwiesen
                  </MockBtn>
                  <MockBtn
                    type="button"
                    kind="secondary"
                    disabled={pending}
                    onClick={() => runStatus(active.zuweisungId, 'abgelehnt')}
                  >
                    Ablehnen
                  </MockBtn>
                </>
              ) : null}
              {active.status === 'bezahlt' ? (
                <MockBtn
                  type="button"
                  kind="secondary"
                  disabled={pending}
                  onClick={() =>
                    void markHwEingangsrechnungBezahlt(active.zuweisungId, false).then((r) => {
                      if (!r.ok) {
                        toast.systemError(r)
                        return
                      }
                      toast.success(TOAST.wieder_auf_offen_gesetzt)
                      setActive((prev) =>
                        prev ? { ...prev, status: 'eingereicht', bezahltAt: null } : prev
                      )
                      afterServerActionRefresh()
                    })
                  }
                >
                  Zurück auf offen
                </MockBtn>
              ) : null}
              {active.status === 'abgelehnt' ? (
                <MockBtn
                  type="button"
                  kind="secondary"
                  disabled={pending}
                  onClick={() => runStatus(active.zuweisungId, 'eingereicht')}
                >
                  Wieder öffnen
                </MockBtn>
              ) : null}
            </div>
          </div>
        ) : null}
      </EditorSheet>
    </div>
  )
}
