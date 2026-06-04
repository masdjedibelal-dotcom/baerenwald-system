'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Download, ExternalLink, FileUp } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { HandwerkerEinreichungManuellModal } from '@/components/angebote/HandwerkerEinreichungManuellModal'
import { cn, formatDatumZeit } from '@/lib/utils'
import type { AngebotDetail, AngebotHandwerkerRow } from '@/lib/types'
import { labelHandwerkerAblehnung } from '@/lib/angebote/ablehnung-labels'
import {
  bestaetigeHandwerkerEinreichung,
  getHandwerkerEinreichungPdfUrl,
} from '@/app/(dashboard)/angebote/actions'
import {
  ekNettoFromHwEinreichung,
  hasHwEinreichung,
  hwStatusBadgeClass,
  hwStatusLabel,
} from '@/lib/partner/handwerker-einreichung'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { betragAnzeige } from '@/lib/angebot-einfach'
import type { AngebotPosition } from '@/lib/types'
function zuweisungStatusLabel(s: string | null | undefined): string {
  const v = (s ?? 'ausstehend').toLowerCase()
  if (v === 'angefragt') return 'Angefragt'
  if (v === 'akzeptiert') return 'Akzeptiert'
  if (v === 'abgelehnt') return 'Abgelehnt'
  return 'Ausstehend'
}

function ZuweisungCard({
  z,
  angebotId,
  auftragId,
  onRefresh,
}: {
  z: AngebotHandwerkerRow
  angebotId: string
  auftragId: string | null
  onRefresh: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [manuellOpen, setManuellOpen] = useState(false)
  const abgelehnt = z.status === 'abgelehnt'
  const eingereicht = hasHwEinreichung(z)
  const ek = eingereicht ? ekNettoFromHwEinreichung(z) : null
  const hwSt = (z.hw_status ?? '').toLowerCase()
  const uebernommen = hwSt === 'uebernommen'
  const kannManuell = !abgelehnt && !eingereicht && !uebernommen
  const kannBestaetigen = eingereicht && !uebernommen

  function openPdf(art: 'angebot' | 'rechnung') {
    startTransition(async () => {
      const res = await getHandwerkerEinreichungPdfUrl(z.id, art)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    })
  }

  function bestaetigen() {
    startTransition(async () => {
      const res = await bestaetigeHandwerkerEinreichung({ angebotId, zuweisungId: z.id })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      const ekTeil =
        res.aktualisiert > 0
          ? ` EK in ${res.aktualisiert} Position(en) übernommen.`
          : auftragId
            ? ''
            : ' EK wird bei Auftragsanlage übernommen.'
      const mailTeil = res.mailGesendet
        ? ' Bestätigung an den Handwerker gesendet.'
        : res.mailHinweis
          ? ` Hinweis: ${res.mailHinweis}`
          : ''
      toast.success(`Angebot bestätigt.${ekTeil}${mailTeil}`)
      onRefresh()
    })
  }

  return (
    <>
    <Card
      className={cn('space-y-2 p-4 text-sm', abgelehnt && 'border-danger/50 bg-danger/5')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-bw-text">{z.gewerke?.name ?? 'Gewerk'}</p>
          <p className="text-bw-text">{z.handwerker?.name ?? '—'}</p>
          <p className="text-xs text-bw-text-muted">{z.handwerker?.email ?? '—'}</p>
        </div>
        <span className="inline-block rounded-md bg-bw-bg-soft px-2 py-0.5 text-xs text-bw-text-muted">
          {zuweisungStatusLabel(z.status)}
        </span>
      </div>

      {abgelehnt ? (
        <p className="text-xs font-medium text-danger">
          Ablehnung: {labelHandwerkerAblehnung(z.ablehnung_grund ?? null)}
          {z.antwort_notiz?.trim() ? ` — ${z.antwort_notiz.trim()}` : ''}
        </p>
      ) : null}

      {eingereicht ? (
        <div className="rounded-lg border border-bw-border bg-bw-bg-soft/80 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Partner-Einreichung
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                hwStatusBadgeClass(z.hw_status)
              )}
            >
              {hwStatusLabel(z.hw_status)}
            </span>
          </div>
          <p className="text-bw-text">
            Netto: {z.hw_preis_netto != null ? betragAnzeige(z.hw_preis_netto, null, null) : '—'}
            {' · '}
            Brutto:{' '}
            {z.hw_preis_brutto != null ? betragAnzeige(z.hw_preis_brutto, null, null) : '—'}
            {ek != null ? (
              <span className="text-bw-text-muted"> · EK (übernommen): {betragAnzeige(ek, null, null)}</span>
            ) : null}
          </p>
          {z.hw_eingereicht_at ? (
            <p className="text-xs text-bw-text-muted">
              Eingereicht: {formatDatumZeit(z.hw_eingereicht_at)}
            </p>
          ) : null}
          {z.hw_notiz?.trim() ? (
            <p className="text-xs text-bw-text-muted whitespace-pre-wrap">{z.hw_notiz.trim()}</p>
          ) : null}
          {z.hw_rechnung_eingereicht_at ? (
            <p className="text-xs text-bw-text-muted">
              Rechnung: {formatDatumZeit(z.hw_rechnung_eingereicht_at)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {z.hw_angebot_pdf_url ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => openPdf('angebot')}
              >
                <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
                Angebot-PDF
              </Button>
            ) : null}
            {z.hw_rechnung_pdf_url ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                onClick={() => openPdf('rechnung')}
              >
                <Download className="mr-1 h-3.5 w-3.5" aria-hidden />
                Rechnung-PDF
              </Button>
            ) : null}
            {kannBestaetigen ? (
              <Button type="button" variant="primary" size="sm" loading={pending} onClick={bestaetigen}>
                Bestätigen & Partner informieren
              </Button>
            ) : null}
            {auftragId ? (
              <Link
                href={`/auftraege/${auftragId}`}
                className="inline-flex items-center gap-1 text-xs text-bw-link hover:underline"
              >
                Auftrag
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            ) : null}
          </div>
        </div>
      ) : kannManuell ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-bw-text-muted">
            {z.status === 'akzeptiert'
              ? 'Wartet auf Angebots-PDF / Preis im Partner-Portal.'
              : 'Noch keine Einreichung — Portal oder manuell erfassen.'}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setManuellOpen(true)}
          >
            <FileUp className="mr-1 h-3.5 w-3.5" aria-hidden />
            Manuell erfassen
          </Button>
        </div>
      ) : uebernommen ? (
        <p className="text-xs font-medium text-bw-primary">Angebot bestätigt und übernommen.</p>
      ) : null}

      <HandwerkerEinreichungManuellModal
        open={manuellOpen}
        onClose={() => setManuellOpen(false)}
        angebotId={angebotId}
        zuweisungId={z.id}
        handwerkerName={z.handwerker?.name ?? 'Handwerker'}
        gewerkName={z.gewerke?.name ?? 'Gewerk'}
        onSaved={onRefresh}
      />
    </Card>
    </>
  )
}

export function AngebotHandwerkerPartnerSection({
  detail,
  auftragId,
  bruttoMin,
  bruttoMax,
  positionen,
  gueltigBis,
}: {
  detail: AngebotDetail
  auftragId: string | null
  bruttoMin: number
  bruttoMax: number
  positionen: AngebotPosition[]
  gueltigBis: string
}) {
  const router = useRouter()
  const rows = detail.angebot_handwerker ?? []

  return (
    <section id="handwerker-partner" className="space-y-6 scroll-mt-24">
      <Card className="p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-bw-text">Handwerker & Partner-Portal</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-bw-text-muted">Keine Handwerker zugewiesen.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((z) => (
              <ZuweisungCard
                key={z.id}
                z={z}
                angebotId={detail.id}
                auftragId={auftragId}
                onRefresh={() => router.refresh()}
              />
            ))}
          </div>
        )}
      </Card>

      <AngebotVersandSection
        detail={detail}
        bruttoMin={bruttoMin}
        bruttoMax={bruttoMax}
        positionen={positionen}
        gueltigBis={gueltigBis}
      />
    </section>
  )
}
