'use client'

import { useEffect, useState, useTransition } from 'react'
import { Copy, ExternalLink, Link2, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { AuftragPhasenSteps } from '@/components/auftraege/AuftragPhasenSteps'
import { toast } from '@/components/ui/app-toast'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { updateAuftragProjektSteuerung } from '@/app/(dashboard)/auftraege/kunden-update-actions'
import { aktuellePhaseIndex, PROJEKT_PHASEN } from '@/lib/auftraege/projekt-phasen'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import type { AuftragDetail, LeadStatus } from '@/lib/types'

export function AuftragDetailKopf({
  detail,
  leadStatus,
  onChanged,
}: {
  detail: AuftragDetail
  leadStatus?: LeadStatus | null
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [naechster, setNaechster] = useState(detail.naechster_schritt ?? '')

  useEffect(() => {
    setNaechster(detail.naechster_schritt ?? '')
  }, [detail.naechster_schritt])

  const phaseIdx = aktuellePhaseIndex(leadStatus ?? null, detail.status)
  const phaseLabel = PROJEKT_PHASEN[phaseIdx] ?? 'Auftrag'
  const projektUrl = detail.kunden_token?.trim() ? projektUrlFromToken(detail.kunden_token.trim()) : ''

  function speichernNaechsterSchritt() {
    startTransition(async () => {
      const r = await updateAuftragProjektSteuerung({
        auftragId: detail.id,
        status: detail.status,
        fortschritt: detail.fortschritt ?? 0,
        naechster_schritt: naechster,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Nächster Schritt gespeichert')
        onChanged()
      }
    })
  }

  function copyLink() {
    if (projektUrl) {
      void navigator.clipboard.writeText(projektUrl).then(
        () => toast.success('Link kopiert'),
        () => toast.error('Kopieren fehlgeschlagen')
      )
      return
    }
    startTransition(async () => {
      const r = await ensureKundenTokenAction(detail.id)
      if (!r.ok) toast.error(r.message)
      else {
        await navigator.clipboard.writeText(r.url)
        toast.success('Link kopiert')
        onChanged()
      }
    })
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-lg border border-bw-border bg-bw-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-bw-text-muted">
            Aktuelle Phase: <span className="font-semibold text-bw-text">{phaseLabel}</span>
          </p>
          <span className="text-sm font-medium tabular-nums text-bw-text">{detail.fortschritt ?? 0} %</span>
        </div>
        <ProgressBar value={detail.fortschritt ?? 0} />
        <div className="mt-3">
          <AuftragPhasenSteps
            status={detail.status}
            hatAngebot={!!detail.angebot_id}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-lg border border-bw-border bg-bw-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-bw-text">
            <ArrowRight className="h-4 w-4 text-bw-primary" aria-hidden />
            Nächster Schritt
          </h3>
          <p className="mb-2 text-xs text-bw-text-muted">Sichtbar für die Kundin auf der Status-Seite.</p>
          <Textarea
            value={naechster}
            onChange={(e) => setNaechster(e.target.value)}
            rows={3}
            placeholder="z. B. Fliesen Wand fertigstellen, dann Heizkörper anschließen"
            className="!text-sm"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-2"
            loading={pending}
            onClick={speichernNaechsterSchritt}
          >
            Speichern
          </Button>
        </section>

        <section className="rounded-lg border border-bw-border bg-bw-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-bw-text">
            <Link2 className="h-4 w-4 text-bw-primary" aria-hidden />
            Kunden-Link
          </h3>
          <p className="mb-3 text-xs text-bw-text-muted">
            Öffentliche Projekt-Statusseite · {detail.kunden_seite_aufrufe ?? 0} Aufrufe
          </p>
          <div className="flex flex-col gap-2">
            {projektUrl ? (
              <a
                href={projektUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm inline-flex w-full justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Kunden-Link öffnen
              </a>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={pending}
                className="w-full"
                onClick={() =>
                  startTransition(async () => {
                    const r = await ensureKundenTokenAction(detail.id)
                    if (!r.ok) toast.error(r.message)
                    else {
                      toast.success('Link erzeugt')
                      onChanged()
                    }
                  })
                }
              >
                Link erzeugen
              </Button>
            )}
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={copyLink}>
              <Copy className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
              Link kopieren
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="w-full"
              loading={pending}
              disabled={!detail.kunden?.email}
              onClick={() =>
                startTransition(async () => {
                  const r = await sendKundenProjektLinkEmail(detail.id)
                  if (!r.ok) toast.error(r.message)
                  else toast.success('E-Mail gesendet')
                })
              }
            >
              <Mail className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
              Link per E-Mail senden
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
