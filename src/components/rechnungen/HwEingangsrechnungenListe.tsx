'use client'

import { useLocalTransition } from '@/components/ui/action-busy'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MockBadge,
  MockBtn,
  MockEmpty,
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
  hwRechnungStatusLabel,
  type HwEingangsrechnungListeRow,
  type HwRechnungStatus,
} from '@/lib/rechnungen/load-hw-eingangsrechnungen'
import { formatDatum } from '@/lib/utils'

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
  const [pending, startTransition] = useLocalTransition()
  const [active, setActive] = useState<HwEingangsrechnungListeRow | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)

  const { pageItems, pageIndex, totalPages, total, pageSize, setPageIndex } = useListPage(
    rows,
    40,
    filterKey
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
      setActive((prev) =>
        prev && prev.zuweisungId === id
          ? { ...prev, status, bezahltAt: status === 'bezahlt' ? new Date().toISOString() : null }
          : prev
      )
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
            title="Keine Eingangsrechnungen"
            hint="Filter zurücksetzen oder Partner-Upload abwarten."
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
                  {r.auftragTitel || 'Handwerker · Rechnung'}
                </div>
                <span className="text-[length:var(--fs-meta)] text-bw-text-muted">
                  {[r.kundeName, r.angebotsnr ? `Angebot ${r.angebotsnr}` : null]
                    .filter(Boolean)
                    .join(' · ') || '—'}
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
                <div className="font-medium">{formatEur(active.betragBrutto)}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-[length:var(--fs-meta)] text-bw-text-muted">IBAN</div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono">{formatIban(active.iban)}</span>
                  {active.iban ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => void copyIban(active.iban)}>
                      Kopieren
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-bw-border pt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={pdfBusy}
                onClick={() => void openPdf(active)}
              >
                PDF öffnen
              </Button>
              {active.auftragHref ? (
                <Link href={active.auftragHref} className="btn secondary">
                  Zum Auftrag
                </Link>
              ) : (
                <Link href={active.angebotHref} className="btn secondary">
                  Zum Angebot
                </Link>
              )}
              {active.status === 'eingereicht' ? (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={pending}
                    onClick={() => runStatus(active.zuweisungId, 'bezahlt')}
                  >
                    Als bezahlt
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending}
                    onClick={() => runStatus(active.zuweisungId, 'abgelehnt')}
                  >
                    Ablehnen
                  </Button>
                </>
              ) : null}
              {active.status === 'bezahlt' ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() =>
                    void markHwEingangsrechnungBezahlt(active.zuweisungId, false).then((r) => {
                      if (!r.ok) {
                        toast.error(r.message)
                        return
                      }
                      toast.success('Wieder auf offen gesetzt')
                      setActive((prev) =>
                        prev ? { ...prev, status: 'eingereicht', bezahltAt: null } : prev
                      )
                      router.refresh()
                    })
                  }
                >
                  Zurück auf offen
                </Button>
              ) : null}
              {active.status === 'abgelehnt' ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={() => runStatus(active.zuweisungId, 'eingereicht')}
                >
                  Wieder öffnen
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
