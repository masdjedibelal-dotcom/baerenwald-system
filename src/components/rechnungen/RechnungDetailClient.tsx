'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { ArrowLeft, Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { updateRechnungStatus } from '@/app/(dashboard)/rechnungen/actions'
import type { Rechnung, RechnungStatus } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { formatDatum, formatPreis } from '@/lib/utils'
import { RECHNUNG_STATUS_LABELS } from '@/lib/rechnung-config'
import { StatusActions } from '@/components/funnel/StatusActions'
import { toast } from '@/components/ui/app-toast'

function tageSeitFaelligkeit(faelligAm: string | null): number {
  if (!faelligAm) return 0
  const parts = faelligAm.split('-').map((x) => parseInt(x, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 0
  const [y, m, d] = parts
  const due = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - due.getTime()) / 86400000)
}

export function RechnungDetailClient({ detail: initial }: { detail: Rechnung }) {
  const router = useRouter()
  const [detail, setDetail] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const pos = normalizeAngebotPositionen(detail.positionen ?? [])
  const summen = summenAusPositionen(pos, Number(detail.mwst_satz) || 19)

  const rechnungStatusData = useMemo(() => {
    const tage = detail.faellig_am ? tageSeitFaelligkeit(detail.faellig_am) : 0
    return {
      tage_ueberfaellig: tage > 0 ? tage : 0,
      faellig_am: detail.faellig_am ? formatDatum(detail.faellig_am) : undefined,
      bezahlt_am: detail.bezahlt_at ? formatDatum(detail.bezahlt_at) : undefined,
    }
  }, [detail.faellig_am, detail.bezahlt_at])

  async function setStatus(s: RechnungStatus) {
    setErr(null)
    startTransition(async () => {
      const r = await updateRechnungStatus(detail.id, s)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setDetail((d) => ({ ...d, status: s }))
      router.refresh()
    })
  }

  const onStatusAction = useCallback(
    (action: string, payload?: unknown) => {
      const p = (payload ?? {}) as Record<string, unknown>
      if (action === 'navigate' && typeof p.href === 'string') {
        if (p.href.startsWith('/api/')) {
          window.open(p.href, '_blank', 'noopener,noreferrer')
          return
        }
        router.push(p.href)
        return
      }
      if (action === 'rechnung.bezahlt') {
        void setStatus('bezahlt')
        return
      }
      if (action === 'rechnung.senden' || action === 'rechnung.zahlungserinnerung') {
        toast.message('E-Mail', { description: 'Versand erfolgt über die geplante Resend-Anbindung / Buchhaltung.' })
      }
    },
    [detail.id, router]
  )

  return (
    <div className="pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-0">
      <PageHeader
        title={
          <span className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-3">
            <Link
              href="/rechnungen"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </Link>
            <span className="min-w-0 truncate text-xl font-semibold md:text-2xl">
              {detail.rechnungsnummer}
            </span>
          </span>
        }
      />

      {err ? (
        <p className="mb-3 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <Card className="mb-6 space-y-2 p-4 text-sm">
        <p>
          <span className="text-muted">Status:</span>{' '}
          {RECHNUNG_STATUS_LABELS[detail.status]}
        </p>
        <p>
          <span className="text-muted">Kunde:</span> {detail.kunden?.name ?? '—'}
        </p>
        <p>
          <span className="text-muted">Rechnungsdatum:</span>{' '}
          {formatDatum(detail.rechnungsdatum)}
        </p>
        <p>
          <span className="text-muted">Fällig:</span>{' '}
          {detail.faellig_am ? formatDatum(detail.faellig_am) : '—'}
        </p>
        <p>
          <span className="text-muted">Brutto:</span> {formatPreis(detail.brutto)}
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          {detail.status === 'entwurf' ? (
            <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => setStatus('gesendet')}>
              Als gesendet markieren
            </Button>
          ) : null}
          {detail.status === 'gesendet' ? (
            <Button type="button" variant="primary" size="sm" loading={pending} onClick={() => setStatus('bezahlt')}>
              Als bezahlt markieren
            </Button>
          ) : null}
          <Button type="button" variant="secondary" size="sm" loading={pending} onClick={() => setStatus('storniert')}>
            Stornieren
          </Button>
        </div>
      </Card>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">Summen</h2>
        <Card className="space-y-1 p-4 text-sm">
          <p>Lohn netto: {formatPreis(detail.lohn_netto)}</p>
          <p>Material netto: {formatPreis(detail.material_netto)}</p>
          <p>Netto: {formatPreis(detail.netto)}</p>
          <p>
            MwSt ({detail.mwst_satz ?? 19}%): {formatPreis(detail.mwst_betrag)}
          </p>
          <p className="font-semibold">Brutto: {formatPreis(detail.brutto)}</p>
          <p className="text-xs text-muted pt-2 border-t border-border">
            Aus Positionen berechnet (Min): Netto {formatPreis(summen.nettoMin)}
          </p>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold text-ink">PDF</h2>
        {detail.pdf_url ? (
          <a
            href={detail.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF herunterladen
          </a>
        ) : (
          <a
            href={`/api/rechnungen/${detail.id}/pdf`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-ink hover:bg-canvas"
          >
            <Download className="h-4 w-4" aria-hidden />
            PDF erzeugen & laden
          </a>
        )}
      </section>

      <StatusActions
        typ="rechnung"
        status={detail.status}
        id={detail.id}
        data={rechnungStatusData}
        onAction={onStatusAction}
        disabled={pending}
      />
    </div>
  )
}
