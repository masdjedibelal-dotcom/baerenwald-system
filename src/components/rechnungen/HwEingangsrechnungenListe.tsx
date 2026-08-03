'use client'

import { useTransition } from '@/components/ui/action-busy'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MockBadge,
  MockBtn,
  MockChip,
  MockEmpty,
  MockIcon,
  MockPager,
} from '@/components/mock-ui'
import { useListPage } from '@/hooks/useListPage'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { getHandwerkerEinreichungPdfUrl } from '@/app/(dashboard)/angebote/actions'
import {
  markHwEingangsrechnungBezahlt,
  setHwEingangsrechnungStatus,
} from '@/app/(dashboard)/rechnungen/hw-eingang-actions'
import {
  hwRechnungIstErledigt,
  hwRechnungStatusLabel,
  type HwEingangsrechnungListeRow,
  type HwRechnungStatus,
} from '@/lib/rechnungen/load-hw-eingangsrechnungen'
import { cn, formatDatum } from '@/lib/utils'

function statusKind(status: HwRechnungStatus): 'done' | 'offer' | 'cancel' | 'order' {
  if (status === 'bezahlt') return 'done'
  if (status === 'abgelehnt') return 'cancel'
  return 'offer'
}

function formatEur(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n).toLocaleString('de-DE')} €`
}

function formatIban(iban: string | null): string {
  if (!iban) return '—'
  const clean = iban.replace(/\s+/g, '').toUpperCase()
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

export function HwEingangsrechnungenListe({
  rows,
  lifecycle,
}: {
  rows: HwEingangsrechnungListeRow[]
  lifecycle: 'offen' | 'erledigt'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [statusFilter, setStatusFilter] = useState<HwRechnungStatus | 'alle'>('alle')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<HwEingangsrechnungListeRow | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const lifecycleRows = useMemo(
    () =>
      rows.filter((r) =>
        lifecycle === 'erledigt' ? hwRechnungIstErledigt(r.status) : !hwRechnungIstErledigt(r.status)
      ),
    [rows, lifecycle]
  )

  const statusCounts = useMemo(() => {
    const c: Record<HwRechnungStatus | 'alle', number> = {
      alle: lifecycleRows.length,
      eingereicht: 0,
      bezahlt: 0,
      abgelehnt: 0,
    }
    for (const r of lifecycleRows) c[r.status] += 1
    return c
  }, [lifecycleRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lifecycleRows.filter((r) => {
      if (statusFilter !== 'alle' && r.status !== statusFilter) return false
      if (!q) return true
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
      return hay.includes(q)
    })
  }, [lifecycleRows, statusFilter, query])

  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    filtered,
    40,
    `${lifecycle}|${statusFilter}|${query}`
  )

  function runStatus(id: string, status: HwRechnungStatus) {
    startTransition(async () => {
      const r = await setHwEingangsrechnungStatus(id, status)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(
        status === 'bezahlt'
          ? 'Als bezahlt markiert'
          : status === 'abgelehnt'
            ? 'Als abgelehnt markiert'
            : 'Wieder auf offen gesetzt'
      )
      setActive((prev) => (prev && prev.zuweisungId === id ? { ...prev, status, bezahltAt: status === 'bezahlt' ? new Date().toISOString() : null } : prev))
      router.refresh()
    })
  }

  async function openPdf(row: HwEingangsrechnungListeRow) {
    setPdfBusy(true)
    try {
      const r = await getHandwerkerEinreichungPdfUrl(row.zuweisungId, 'rechnung')
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      window.open(r.url, '_blank', 'noopener,noreferrer')
    } finally {
      setPdfBusy(false)
    }
  }

  async function copyIban(iban: string | null) {
    if (!iban) {
      toast.error('Keine IBAN hinterlegt')
      return
    }
    try {
      await navigator.clipboard.writeText(iban.replace(/\s+/g, ''))
      toast.success('IBAN kopiert')
    } catch {
      toast.error('Kopieren fehlgeschlagen')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <MockChip
          active={statusFilter === 'alle'}
          count={statusCounts.alle}
          onClick={() => setStatusFilter('alle')}
        >
          Alle
        </MockChip>
        <MockChip
          active={statusFilter === 'eingereicht'}
          count={statusCounts.eingereicht}
          onClick={() => setStatusFilter('eingereicht')}
        >
          Offen
        </MockChip>
        <MockChip
          active={statusFilter === 'bezahlt'}
          count={statusCounts.bezahlt}
          onClick={() => setStatusFilter('bezahlt')}
        >
          Bezahlt
        </MockChip>
        <MockChip
          active={statusFilter === 'abgelehnt'}
          count={statusCounts.abgelehnt}
          onClick={() => setStatusFilter('abgelehnt')}
        >
          Abgelehnt
        </MockChip>
        <input
          type="search"
          className="ml-auto min-w-[180px] flex-1 rounded-md border border-bw-border bg-white px-3 py-1.5 text-[length:var(--fs-text)] sm:max-w-xs"
          placeholder="Partner, Auftrag, IBAN …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        className="listcard listcard--cols"
        style={{
          ['--list-cols' as string]:
            'minmax(140px, 1.2fr) minmax(180px, 1.6fr) minmax(72px, 0.7fr) minmax(88px, 0.8fr) minmax(80px, 0.7fr) minmax(72px, 0.6fr)',
        }}
        role="table"
        aria-label="Eingangsrechnungen Handwerker"
      >
        <div className="vg-row head" role="row">
          <div>Partner</div>
          <div>Auftrag / Kunde</div>
          <div className="text-right">Betrag</div>
          <div>Eingang</div>
          <div>Status</div>
          <div />
        </div>

        {pageItems.length === 0 ? (
          <MockEmpty
            icon="receipt"
            title={lifecycle === 'erledigt' ? 'Keine erledigten Eingangsrechnungen' : 'Keine offenen Eingangsrechnungen'}
            hint="Partner laden Rechnungs-PDFs über das Portal — sie erscheinen hier nach Upload."
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
                  <span className="block text-[length:var(--fs-meta)] text-bw-text-muted">{r.gewerkName}</span>
                ) : null}
              </div>
              <div className="vg-vorgang">
                <div className="t" title={r.auftragTitel ?? undefined}>
                  {r.auftragTitel || 'Handwerker · Rechnung'}
                </div>
                <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  {[r.kundeName, r.angebotsnr ? `Angebot ${r.angebotsnr}` : null].filter(Boolean).join(' · ') ||
                    '—'}
                </span>
              </div>
              <div className="vg-wert text-right font-medium">{formatEur(r.betragBrutto)}</div>
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
                    Bezahlt
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

      <Modal
        open={active != null}
        onClose={() => setActive(null)}
        title="Eingangsrechnung · Partner"
        size="md"
      >
        {active ? (
          <div className="space-y-4 p-1">
            <div className="flex flex-wrap items-center gap-2">
              <MockBadge kind={statusKind(active.status)}>{hwRechnungStatusLabel(active.status)}</MockBadge>
              <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                Eingereicht {active.eingereichtAt ? formatDatum(active.eingereichtAt) : '—'}
              </span>
            </div>

            <dl className="grid gap-3 text-[length:var(--fs-text)] sm:grid-cols-2">
              <div>
                <dt className="text-bw-text-muted">Partner</dt>
                <dd className="font-medium">
                  <Link href={`/handwerker/${active.handwerkerId}`} className="text-bw-primary hover:underline">
                    {active.handwerkerName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-bw-text-muted">Betrag brutto</dt>
                <dd className="font-medium">{formatEur(active.betragBrutto)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-bw-text-muted">Überweisung an (IBAN)</dt>
                <dd className="flex flex-wrap items-center gap-2 font-mono text-[length:var(--fs-text)]">
                  {formatIban(active.iban)}
                  {active.iban ? (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => void copyIban(active.iban)}
                    >
                      Kopieren
                    </button>
                  ) : (
                    <span className="font-sans text-bw-text-muted">— bitte im Partnerstamm hinterlegen</span>
                  )}
                </dd>
              </div>
              {active.ustid || active.steuernummer ? (
                <div className="sm:col-span-2">
                  <dt className="text-bw-text-muted">Steuer</dt>
                  <dd>
                    {[active.ustid ? `USt-ID ${active.ustid}` : null, active.steuernummer ? `St.-Nr. ${active.steuernummer}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-bw-text-muted">Kunde</dt>
                <dd>{active.kundeName || '—'}</dd>
              </div>
              <div>
                <dt className="text-bw-text-muted">Gewerk</dt>
                <dd>{active.gewerkName || '—'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-bw-text-muted">Auftrag</dt>
                <dd>
                  {active.auftragHref ? (
                    <Link href={active.auftragHref} className="text-bw-primary hover:underline">
                      {active.auftragTitel || 'Auftrag öffnen'}
                    </Link>
                  ) : (
                    <Link href={active.angebotHref} className="text-bw-primary hover:underline">
                      Angebot öffnen (noch kein Auftrag)
                    </Link>
                  )}
                </dd>
              </div>
              {(active.handwerkerEmail || active.handwerkerTelefon) && (
                <div className="sm:col-span-2">
                  <dt className="text-bw-text-muted">Kontakt</dt>
                  <dd className="flex flex-wrap gap-3">
                    {active.handwerkerTelefon ? (
                      <a className="text-bw-primary hover:underline" href={`tel:${active.handwerkerTelefon.replace(/\s/g, '')}`}>
                        {active.handwerkerTelefon}
                      </a>
                    ) : null}
                    {active.handwerkerEmail ? (
                      <a className="text-bw-primary hover:underline" href={`mailto:${active.handwerkerEmail}`}>
                        {active.handwerkerEmail}
                      </a>
                    ) : null}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-bw-border pt-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pdfBusy}
                onClick={() => void openPdf(active)}
              >
                <MockIcon ctx="row" n="file" size={14} className="mr-1.5" />
                PDF öffnen
              </Button>
              {active.status !== 'bezahlt' ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  loading={pending}
                  onClick={() => runStatus(active.zuweisungId, 'bezahlt')}
                >
                  Als bezahlt markieren
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={pending}
                  onClick={() => void markHwEingangsrechnungBezahlt(active.zuweisungId, false).then((r) => {
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Bezahlt-Markierung entfernt')
                      router.refresh()
                    }
                  })}
                >
                  Bezahlt aufheben
                </Button>
              )}
              {active.status === 'eingereicht' ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={pending}
                  onClick={() => runStatus(active.zuweisungId, 'abgelehnt')}
                >
                  Ablehnen
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
