'use client'
import { useLocalTransition } from '@/components/ui/action-busy'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/app-toast'
import { getHandwerkerEinreichungPdfUrl } from '@/app/(dashboard)/angebote/actions'
import { HwKonditionenPruefungTable } from '@/components/angebote/HwKonditionenPruefungTable'
import type { AnfragePartnerEinholungRow } from '@/app/(dashboard)/anfragen/anfrage-handwerker-anfragen-actions'
import {
  hasHwEinreichung,
  hwStatusBadgeClass,
  hwStatusLabel,
} from '@/lib/partner/handwerker-einreichung'
import { parseHwKonditionen } from '@/lib/partner/hw-konditionen'
import { parseHwAnhangStoragePaths } from '@/lib/partner/partner-hw-dokument-typen'
import { cn } from '@/lib/utils'

function statusLabel(z: AnfragePartnerEinholungRow): string {
  if (hasHwEinreichung(z)) {
    return hwStatusLabel(z.hw_status) || 'Eingereicht'
  }
  const st = (z.status ?? '').toLowerCase()
  if (st === 'angefragt') return 'Angefragt'
  if (st === 'abgelehnt') return 'Abgelehnt'
  return 'Ausstehend'
}

function statusClass(z: AnfragePartnerEinholungRow): string {
  if (hasHwEinreichung(z)) return hwStatusBadgeClass(z.hw_status)
  const st = (z.status ?? '').toLowerCase()
  if (st === 'angefragt') return 'bg-blue-100 text-blue-900'
  if (st === 'abgelehnt') return 'bg-red-100 text-red-900'
  return 'bg-bw-bg-soft text-bw-text-muted'
}

function EinholungCard({ z }: { z: AnfragePartnerEinholungRow }) {
  const [pending, startTransition] = useLocalTransition()
  const eingereicht = hasHwEinreichung(z)
  const konditionen = parseHwKonditionen(z.hw_konditionen)
  const unterlagePaths = parseHwAnhangStoragePaths(
    z.hw_angebot_anhang_urls,
    z.hw_angebot_pdf_url
  )
  const name =
    (z.handwerker as { firma?: string | null } | null)?.firma?.trim() ||
    z.handwerker?.name?.trim() ||
    'Handwerker'

  function openPdf(index: number) {
    startTransition(async () => {
      const res = await getHandwerkerEinreichungPdfUrl(z.id, 'angebot', index)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <Card className="space-y-2 p-4 text-[length:var(--fs-text)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-bw-text">{name}</p>
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            {z.gewerke?.name ?? '—'}
          </p>
        </div>
        <span
          className={cn(
            'inline-block rounded-md px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
            statusClass(z)
          )}
        >
          {statusLabel(z)}
        </span>
      </div>

      {eingereicht && konditionen ? (
        <HwKonditionenPruefungTable z={z} />
      ) : null}

      {unterlagePaths.length ? (
        <div className="flex flex-wrap gap-2">
          {unterlagePaths.map((_, i) => (
            <Button
              key={i}
              type="button"
              variant="secondary"
              size="sm"
              loading={pending}
              onClick={() => openPdf(i)}
            >
              PDF {unterlagePaths.length > 1 ? i + 1 : ''}
            </Button>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

export function AnfragePartnerEinholungCards({
  rows,
  onAnfragen,
  showCta = false,
}: {
  rows: AnfragePartnerEinholungRow[]
  onAnfragen: () => void
  /** Nur wenn der Empty-CTA nicht schon denselben Button zeigt. */
  showCta?: boolean
}) {
  if (!rows.length && !showCta) return null

  const cta = (
    <Button type="button" variant="secondary" size="sm" onClick={onAnfragen}>
      Handwerker vorab anfragen
    </Button>
  )

  if (!rows.length) {
    return <div>{cta}</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[length:var(--fs-meta)] font-medium text-bw-text-muted">
          Partner
        </p>
        {cta}
      </div>
      {rows.map((z) => (
        <EinholungCard key={z.id} z={z} />
      ))}
    </div>
  )
}
