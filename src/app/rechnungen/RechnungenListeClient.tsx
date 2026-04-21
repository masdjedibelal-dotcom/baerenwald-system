'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Download, Pencil, Receipt, Send } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { SidePanel } from '@/components/ui/SidePanel'
import { Button } from '@/components/ui/Button'
import { CsvExportModal } from '@/components/ui/CsvExportModal'
import { useExport, type ExportField } from '@/hooks/useExport'
import type { RechnungListeZeile, RechnungStatus } from '@/lib/types'
import { FilterChips } from '@/components/ui/FilterChips'
import { ListCard } from '@/components/ui/ListCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDatum, formatPreis, cn } from '@/lib/utils'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import {
  sendRechnung,
  sendRechnungErinnerung,
  updateRechnungStatus,
} from '@/app/(dashboard)/rechnungen/actions'
import { toast } from '@/components/ui/app-toast'

const RECHNUNG_EXPORT_FIELDS: ExportField[] = [
  { key: 'rechnungsnummer', label: 'Nummer' },
  { key: 'kunde', label: 'Kunde' },
  { key: 'brutto', label: 'Betrag' },
  { key: 'status', label: 'Status' },
  { key: 'rechnungsdatum', label: 'Datum' },
  { key: 'faellig_am', label: 'Fällig' },
  { key: 'auftrag', label: 'Auftrag' },
]

function kundenName(k: RechnungListeZeile['kunden']): string | null {
  if (!k) return null
  if (Array.isArray(k)) return k[0]?.name ?? null
  return k.name ?? null
}

function auftragTitel(r: RechnungListeZeile): string | null {
  const a = r.auftraege
  if (!a) return null
  if (Array.isArray(a)) return a[0]?.titel ?? null
  return a.titel ?? null
}

function parseYmdLocal(ymd: string): Date {
  const p = ymd.split('-').map((x) => parseInt(x, 10))
  if (p.length !== 3 || p.some((n) => Number.isNaN(n))) return new Date(NaN)
  return new Date(p[0], p[1] - 1, p[2])
}

function isUeberfaellig(r: RechnungListeZeile): boolean {
  if (r.status !== 'gesendet' || !r.faellig_am) return false
  const due = parseYmdLocal(r.faellig_am)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return due < today
}

function eurBetrag(n: number) {
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

function displayStatusLabel(r: RechnungListeZeile): string {
  if (isUeberfaellig(r)) return 'Überfällig'
  return RECHNUNG_STATUS_LABELS[r.status]
}

function statusBadgeClass(r: RechnungListeZeile) {
  if (r.status === 'storniert') return 'bg-red-100 text-red-900'
  if (r.status === 'bezahlt') return 'bg-emerald-100 text-emerald-900'
  if (isUeberfaellig(r)) return 'bg-red-200 text-red-950 font-semibold'
  if (r.status === 'gesendet') return 'bg-blue-100 text-blue-900'
  return 'bg-bw-hover text-bw-text'
}

type RechnungChip = 'alle' | RechnungStatus | 'ueberfaellig'

function rechnungListCardBadge(r: RechnungListeZeile) {
  if (isUeberfaellig(r)) {
    return <StatusBadge status="cancel" label="Überfällig" />
  }
  if (r.status === 'bezahlt') {
    return <StatusBadge status="order" label="Bezahlt" />
  }
  if (r.status === 'gesendet') {
    return <StatusBadge status="offer" label="Gesendet" />
  }
  if (r.status === 'storniert') {
    return <StatusBadge status="cancel" label="Storniert" />
  }
  return <StatusBadge status="done" label="Entwurf" />
}

export function RechnungenListeClient({ rows }: { rows: RechnungListeZeile[] }) {
  const router = useRouter()
  const { exportToCSV } = useExport()
  const [chip, setChip] = useState<RechnungChip>('alle')
  const [panel, setPanel] = useState<RechnungListeZeile | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const statusCounts = useMemo(() => {
    const c = {
      alle: rows.length,
      entwurf: 0,
      gesendet: 0,
      bezahlt: 0,
      ueberfaellig: 0,
      storniert: 0,
    }
    for (const r of rows) {
      if (r.status === 'storniert') {
        c.storniert++
        continue
      }
      if (r.status === 'bezahlt') {
        c.bezahlt++
        continue
      }
      if (isUeberfaellig(r)) {
        c.ueberfaellig++
        continue
      }
      if (r.status === 'gesendet') c.gesendet++
      else if (r.status === 'entwurf') c.entwurf++
    }
    return c
  }, [rows])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (chip === 'alle') return true
      if (chip === 'ueberfaellig') return isUeberfaellig(r)
      if (chip === 'gesendet') return r.status === 'gesendet' && !isUeberfaellig(r)
      return r.status === chip
    })
  }, [rows, chip])

  const panelPos = useMemo(() => {
    if (!panel) return []
    return normalizeAngebotPositionen(panel.positionen ?? [])
  }, [panel])

  const panelSummen = useMemo(() => {
    if (!panel) return null
    const mwst = Number(panel.mwst_satz) || 19
    return summenAusPositionen(panelPos, mwst)
  }, [panel, panelPos])

  function exportRow(r: RechnungListeZeile): Record<string, unknown> {
    return {
      rechnungsnummer: r.rechnungsnummer,
      kunde: kundenName(r.kunden) ?? '',
      brutto: r.brutto,
      status: displayStatusLabel(r),
      rechnungsdatum: r.rechnungsdatum,
      faellig_am: r.faellig_am ?? '',
      auftrag: auftragTitel(r) ?? '',
    }
  }

  function runPanelAction(fn: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) {
        toast.message('Fehler', { description: res.message })
        return
      }
      router.refresh()
      setPanel(null)
    })
  }

  const panelUeberfaellig = panel ? isUeberfaellig(panel) : false

  return (
    <div className="pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHeader
        title="Rechnungen"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="mr-1 h-4 w-4" aria-hidden />
              Export
            </Button>
            <Link href="/rechnungen/neu" className="btn btn-primary btn-sm inline-flex items-center justify-center">
              + Neue Rechnung
            </Link>
          </div>
        }
      />

      <div className="sticky top-14 z-10 border-b border-bw-border bg-bw-bg px-4 py-3">
        <FilterChips
          options={[
            { label: 'Alle', value: 'alle', count: statusCounts.alle },
            { label: 'Entwurf', value: 'entwurf', count: statusCounts.entwurf },
            { label: 'Gesendet', value: 'gesendet', count: statusCounts.gesendet },
            { label: 'Bezahlt', value: 'bezahlt', count: statusCounts.bezahlt },
            { label: 'Überfällig', value: 'ueberfaellig', count: statusCounts.ueberfaellig },
            { label: 'Storniert', value: 'storniert', count: statusCounts.storniert },
          ]}
          selected={[chip]}
          onChange={(vals) => setChip((vals[0] as RechnungChip) || 'alle')}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Keine Rechnungen"
          description="Legen Sie eine Rechnung an oder passen Sie die Filter an."
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-bw-border bg-bw-card md:block">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-bw-border bg-bw-canvas text-bw-light">
                  <th className="px-3 py-3 font-medium">Nummer</th>
                  <th className="px-3 py-3 font-medium">Kunde</th>
                  <th className="px-3 py-3 font-medium">Betrag</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Datum</th>
                  <th className="px-3 py-3 font-medium">Fällig</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPanel(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPanel(r)
                      }
                    }}
                    className="cursor-pointer border-b border-bw-border last:border-0 hover:bg-bw-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-bw-accent"
                  >
                    <td className="px-3 py-3 font-medium text-bw-link">{r.rechnungsnummer}</td>
                    <td className="px-3 py-3 text-bw-text">{kundenName(r.kunden) ?? '—'}</td>
                    <td className="px-3 py-3">{formatPreis(r.brutto)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs',
                          statusBadgeClass(r)
                        )}
                      >
                        {displayStatusLabel(r)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-bw-light">{formatDatum(r.rechnungsdatum)}</td>
                    <td className="px-3 py-3 text-bw-light">
                      {r.faellig_am ? formatDatum(r.faellig_am) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="md:hidden">
            {filtered.map((r) => (
              <li key={r.id} className="border-b border-bw-border bg-bw-card first:border-t">
                <ListCard
                  title={r.rechnungsnummer}
                  badge={rechnungListCardBadge(r)}
                  subtitle={kundenName(r.kunden) ?? undefined}
                  meta={`${formatPreis(r.brutto)} · fällig ${r.faellig_am ? new Date(r.faellig_am).toLocaleDateString('de') : '—'}`}
                  onClick={() => setPanel(r)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      <SidePanel
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel?.rechnungsnummer ?? ''}
        subtitle={panel ? kundenName(panel.kunden) ?? undefined : undefined}
        width="md"
        badge={panel ? rechnungListCardBadge(panel) : null}
      >
        {panel ? (
          <div className="space-y-4 p-5 text-sm text-bw-text">
            {panelUeberfaellig ? (
              <div
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-900"
                role="status"
              >
                Diese Rechnung ist überfällig.
              </div>
            ) : null}

            <div>
              <p className="text-xs uppercase tracking-wide text-bw-light">Betrag (brutto)</p>
              <p className="text-2xl font-semibold text-bw-accent">
                {formatPreis(panel.brutto)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-bw-light">
                Positionen
              </p>
              <ul className="space-y-2">
                {panelPos.map((p, i) => (
                  <li key={p.id} className="rounded-lg border border-bw-border bg-bw-canvas/50 px-3 py-2">
                    <p className="font-medium">
                      {i + 1}. {(p.beschreibung || p.leistung).trim() || '—'}
                    </p>
                    <p className="text-xs text-bw-light">
                      Lohn {eurBetrag(p.lohn_min * (p.menge || 1))} · Material{' '}
                      {eurBetrag(p.material_min * (p.menge || 1))}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {panel.status === 'bezahlt' && panel.bezahlt_at ? (
              <p className="text-bw-light">
                Bezahlt am <span className="text-bw-text">{formatDatum(panel.bezahlt_at)}</span>
              </p>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-bw-border pt-4">
              {panel.status === 'entwurf' ? (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    loading={pending}
                    onClick={() =>
                      runPanelAction(() => sendRechnung(panel.id))
                    }
                  >
                    <Send className="mr-2 h-4 w-4" aria-hidden />
                    Senden
                  </Button>
                  <Link
                    href={`/rechnungen/${panel.id}`}
                    onClick={() => setPanel(null)}
                    className="btn btn-secondary inline-flex w-full items-center justify-center gap-2"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Bearbeiten
                  </Link>
                </>
              ) : null}

              {panel.status === 'gesendet' ? (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    fullWidth
                    loading={pending}
                    onClick={() =>
                      runPanelAction(() => updateRechnungStatus(panel.id, 'bezahlt'))
                    }
                  >
                    Als bezahlt markieren
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    loading={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await sendRechnungErinnerung(panel.id)
                        if (!res.ok) {
                          toast.message('Hinweis', { description: res.message })
                          return
                        }
                        toast.message('Erinnerung', {
                          description:
                            'E-Mail-Versand ist noch an Resend anzubinden; Kalender kann ergänzt werden.',
                        })
                        router.refresh()
                      })
                    }
                  >
                    Erinnerung senden
                  </Button>
                </>
              ) : null}

              {panel.status === 'bezahlt' ? (
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={() =>
                    window.open(`/api/rechnungen/${panel.id}/pdf`, '_blank', 'noopener,noreferrer')
                  }
                >
                  PDF laden
                </Button>
              ) : null}

              <Link
                href={`/rechnungen/${panel.id}`}
                onClick={() => setPanel(null)}
                className="btn btn-secondary inline-flex w-full justify-center"
              >
                Zur Detailseite
              </Link>
            </div>

            {panelSummen ? (
              <p className="text-xs text-bw-light">
                Netto laut Positionen (Min.): {formatPreis(panelSummen.nettoMin)}
              </p>
            ) : null}
          </div>
        ) : null}
      </SidePanel>

      <CsvExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Rechnungen exportieren"
        fields={RECHNUNG_EXPORT_FIELDS}
        onDownload={({ scope, keys }) => {
          const source = scope === 'view' ? filtered : rows
          const data = source.map(exportRow)
          const fields = RECHNUNG_EXPORT_FIELDS.filter((f) => keys.includes(f.key))
          exportToCSV(data, fields, 'rechnungen')
        }}
      />
    </div>
  )
}
