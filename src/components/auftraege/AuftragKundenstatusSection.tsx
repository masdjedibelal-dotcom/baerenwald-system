'use client'

import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
  setTimelineKundenfreigabe,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AuftragDetail, AuftragTimelineEvent } from '@/lib/types'
import { projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { formatDatumZeit } from '@/lib/utils'

function togglable(ev: AuftragTimelineEvent) {
  return ev.typ === 'handwerker_update' || ev.typ === 'mail_kunde'
}

export function AuftragKundenstatusSection({
  detail,
  onChanged,
}: {
  detail: AuftragDetail
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [showQr, setShowQr] = useState(false)

  const projektUrl = useMemo(() => {
    const t = detail.kunden_token?.trim()
    return t ? projektUrlFromToken(t) : ''
  }, [detail.kunden_token])

  const timeline = [...(detail.auftrag_timeline ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  async function copyLink() {
    if (!projektUrl) {
      toast.error('Kein Kunden-Link — bitte zuerst erzeugen.')
      return
    }
    try {
      await navigator.clipboard.writeText(projektUrl)
      toast.success('Link kopiert')
    } catch {
      toast.error('Kopieren nicht möglich')
    }
  }

  return (
    <>
      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-2 text-lg font-semibold text-ink">Kunden Status-Seite</h2>
        <p className="text-sm text-muted">Öffentlicher Link ohne Login — nur für Kundin und Sie bestimmbar.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await ensureKundenTokenAction(detail.id)
                if (!r.ok) toast.error(r.message)
                else {
                  toast.success('Kunden-Link bereit')
                  onChanged()
                }
              })
            }
          >
            Link erzeugen / aktualisieren
          </Button>
          <Button type="button" variant="secondary" disabled={!projektUrl} onClick={() => void copyLink()}>
            Link kopieren
          </Button>
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            disabled={!detail.kunden?.email?.trim()}
            onClick={() =>
              startTransition(async () => {
                const r = await sendKundenProjektLinkEmail(detail.id)
                if (!r.ok) toast.error(r.message)
                else toast.success('E-Mail gesendet')
              })
            }
          >
            Per Mail senden
          </Button>
          <Button type="button" variant="secondary" disabled={!projektUrl} onClick={() => setShowQr(true)}>
            QR-Code anzeigen
          </Button>
        </div>
        {projektUrl ? (
          <p className="mt-3 break-all text-xs text-muted">
            <span className="font-medium text-ink">URL:</span> {projektUrl}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted">Noch kein Token — „Link erzeugen“ antippen.</p>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-card">
        <h2 className="mb-2 text-lg font-semibold text-ink">Timeline — Kundensicht</h2>
        <p className="mb-3 text-xs text-muted">
          Bei „Handwerker-Update“ und „Mail Kunde“ können Sie Einträge für die Status-Seite freigeben.
        </p>
        <div className="max-h-[420px] space-y-2 overflow-y-auto">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted">Keine Timeline-Einträge.</p>
          ) : (
            timeline.map((ev) => (
              <Card key={ev.id} className="flex flex-col gap-2 p-3 text-sm md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {ev.fuer_kunde_freigegeben ? (
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" title="Für Kundin sichtbar" />
                    ) : (
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" />
                    )}
                    <span className="font-medium text-ink">{ev.titel}</span>
                    <span className="text-xs text-muted">({ev.typ})</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{formatDatumZeit(ev.created_at)}</p>
                  {ev.beschreibung ? <p className="mt-1 line-clamp-2 text-muted">{ev.beschreibung}</p> : null}
                </div>
                {togglable(ev) ? (
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs md:flex-col md:items-end">
                    <span className="text-muted">Für Kunden sichtbar</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={Boolean(ev.fuer_kunde_freigegeben)}
                      disabled={pending}
                      onChange={(e) => {
                        const on = e.target.checked
                        let notify = false
                        if (on) {
                          notify = window.confirm(
                            'Kundin per E-Mail über dieses Update informieren?\n\nOK = Ja, Abbrechen = nur auf der Status-Seite sichtbar'
                          )
                        }
                        startTransition(async () => {
                          const r = await setTimelineKundenfreigabe({
                            auftragId: detail.id,
                            timelineId: ev.id,
                            fuerKunde: on,
                            kundeBenachrichtigen: notify,
                          })
                          if (!r.ok) toast.error(r.message)
                          else {
                            toast.success(on ? 'Freigegeben' : 'Zurückgenommen')
                            onChanged()
                          }
                        })
                      }}
                    />
                  </label>
                ) : null}
              </Card>
            ))
          )}
        </div>
      </section>

      {showQr ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center"
          role="dialog"
          aria-modal
        >
          <Card className="w-full max-w-sm p-4 text-center">
            <h3 className="text-lg font-semibold">QR-Code</h3>
            <p className="mt-1 text-xs text-muted">Kundin kann den Code scannen, um den Projekt-Status zu öffnen.</p>
            {projektUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/auftraege/${detail.id}/qrcode`}
                width={200}
                height={200}
                alt="QR-Code Projekt-Link"
                className="mx-auto mt-4 h-[200px] w-[200px]"
              />
            ) : null}
            <Button type="button" variant="secondary" className="mt-4 w-full" onClick={() => setShowQr(false)}>
              Schließen
            </Button>
          </Card>
        </div>
      ) : null}
    </>
  )
}
