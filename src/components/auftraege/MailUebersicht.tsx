'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { ExternalLink, Mail } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import type { EmailLogRow } from '@/app/(dashboard)/auftraege/auftraege-data'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { AuftragDetail } from '@/lib/types'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { formatDatumZeit } from '@/lib/utils'

const TYP_LABELS: Record<string, string> = {
  anfrage_bestaetigung: 'Anfrage-Bestätigung',
  angebot: 'Angebot',
  auftragsbestaetigung: 'Auftragsbestätigung',
  update_hinweis: 'Update-Hinweis',
  nachtrag: 'Nachtrag',
  abnahme: 'Abnahmeprotokoll',
  rechnung: 'Rechnung',
  zahlungsbestaetigung: 'Zahlungsbestätigung',
  zahlungserinnerung: 'Zahlungserinnerung',
  termin: 'Termin',
  handwerker_anfrage: 'Handwerker-Anfrage',
  handwerker_formular: 'Handwerker-Formular',
}

function typLabel(typ: string): string {
  return TYP_LABELS[typ] ?? typ
}

export function MailUebersicht({
  detail,
  emailLog,
  onChanged,
}: {
  detail: AuftragDetail
  emailLog: EmailLogRow[]
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [showQr, setShowQr] = useState(false)

  const projektUrl = useMemo(() => {
    const t = detail.kunden_token?.trim()
    return t ? projektUrlFromToken(t) : ''
  }, [detail.kunden_token])

  const aufrufe = detail.kunden_seite_aufrufe ?? 0
  const letzter = detail.kunden_seite_letzter_aufruf
  const letzterRel =
    letzter != null && String(letzter).trim() !== ''
      ? formatDistanceToNow(new Date(letzter), { addSuffix: true, locale: deLocale })
      : '—'

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
        <h2 className="mb-1 text-lg font-semibold text-ink">Kunden-Kommunikation</h2>
        <p className="text-sm text-muted">Öffentliche Status-Seite, E-Mail-Protokoll und Freigaben.</p>

        <div className="mt-4 rounded-lg border border-border bg-canvas/40 p-3">
          <h3 className="text-sm font-semibold text-ink">Kunden-Status-Seite</h3>
          <p className="mt-2 text-sm text-muted">
            Aufrufe: <span className="font-medium text-ink">{aufrufe}</span>
            <span className="mx-2">·</span>
            Letzter Aufruf: <span className="font-medium text-ink">{letzterRel}</span>
          </p>
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
            <Button type="button" variant="secondary" disabled={!projektUrl} onClick={() => setShowQr(true)}>
              QR-Code
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!projektUrl}
              onClick={() => {
                if (projektUrl) window.open(projektUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              <span className="inline-flex items-center gap-1">
                Status-Seite öffnen <ExternalLink className="h-4 w-4" aria-hidden />
              </span>
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
          </div>
          {projektUrl ? (
            <p className="mt-3 break-all text-xs text-muted">
              <span className="font-medium text-ink">URL:</span> {projektUrl}
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted">Noch kein Token — „Link erzeugen“ antippen.</p>
          )}
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink">Gesendete E-Mails</h3>
          {emailLog.length === 0 ? (
            <p className="text-sm text-muted">Noch keine E-Mails zu diesem Auftrag protokolliert.</p>
          ) : (
            <ul className="space-y-2">
              {emailLog.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-0.5 rounded-lg border border-border bg-canvas/30 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="font-medium text-ink">{typLabel(row.typ)}</span>
                    {row.status === 'fehler' ? (
                      <span className="rounded bg-red-100 px-1.5 text-xs text-red-800">Fehler</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">
                    {row.an_email}
                    <span className="mx-1">·</span>
                    {formatDatumZeit(row.created_at)}
                  </p>
                  {row.status === 'fehler' && row.fehler_nachricht ? (
                    <p className="text-xs text-red-700">{row.fehler_nachricht}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Modal open={showQr} onClose={() => setShowQr(false)} title="QR-Code" size="sm">
        <p className="text-center text-xs text-muted">
          Kundin kann den Code scannen, um den Projekt-Status zu öffnen.
        </p>
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
      </Modal>
    </>
  )
}
