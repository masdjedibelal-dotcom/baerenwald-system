'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { ExternalLink, Mail } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
  setTimelineKundenfreigabe,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import { buildKundenUpdateVorschau, sendKundenUpdateMailFromAuftrag } from '@/app/actions/mails'
import type { EmailLogRow } from '@/app/(dashboard)/auftraege/actions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MailVorschau } from '@/components/ui/MailVorschau'
import { Modal } from '@/components/ui/Modal'
import type { AuftragDetail, AuftragTimelineEvent } from '@/lib/types'
import { projektUrlFromToken } from '@/lib/projekt/kunden-token'
import { formatDatumZeit } from '@/lib/utils'

const TYP_LABELS: Record<string, string> = {
  anfrage_bestaetigung: 'Anfrage-Bestätigung',
  angebot: 'Angebot',
  auftragsbestaetigung: 'Auftragsbestätigung',
  update_hinweis: 'Update-Hinweis',
  nachtrag: 'Nachtrag',
  abnahme: 'Abnahmeprotokoll',
  rechnung: 'Rechnung',
  zahlungserinnerung: 'Zahlungserinnerung',
  termin: 'Termin',
  handwerker_anfrage: 'Handwerker-Anfrage',
  handwerker_formular: 'Handwerker-Formular',
}

function typLabel(typ: string): string {
  return TYP_LABELS[typ] ?? typ
}

function togglable(ev: AuftragTimelineEvent) {
  return ev.typ === 'handwerker_update' || ev.typ === 'mail_kunde'
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
  const [mailOpen, setMailOpen] = useState(false)
  const [mailLoading, setMailLoading] = useState(false)
  const [sendLoading, setSendLoading] = useState(false)
  const [preview, setPreview] = useState<{ an: string; betreff: string; html: string } | null>(null)

  const projektUrl = useMemo(() => {
    const t = detail.kunden_token?.trim()
    return t ? projektUrlFromToken(t) : ''
  }, [detail.kunden_token])

  const timeline = [...(detail.auftrag_timeline ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

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

  async function openUpdateMail() {
    setMailLoading(true)
    try {
      const p = await buildKundenUpdateVorschau(detail.id)
      if (!p) {
        toast.error('Vorschau nicht möglich — Kunden-E-Mail oder Projekt-Link fehlt.')
        return
      }
      setPreview(p)
      setMailOpen(true)
    } finally {
      setMailLoading(false)
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

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-ink">Updates &amp; Freigabe</h3>
              <p className="text-xs text-muted">
                Bei „Handwerker-Update“ und „Mail Kunde“ können Sie Einträge für die Status-Seite freigeben.
              </p>
            </div>
            <Button type="button" variant="primary" loading={mailLoading} onClick={() => void openUpdateMail()}>
              Update-Mail senden
            </Button>
          </div>
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
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300" title="Intern" />
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

      {preview ? (
        <MailVorschau
          open={mailOpen}
          onClose={() => {
            setMailOpen(false)
            setPreview(null)
          }}
          an={preview.an}
          betreff={preview.betreff}
          html={preview.html}
          loading={sendLoading}
          onSend={async (data) => {
            setSendLoading(true)
            try {
              const r = await sendKundenUpdateMailFromAuftrag({
                auftragId: detail.id,
                an: data.an,
                betreff: data.betreff,
                html: data.html ?? preview.html,
              })
              if (!r.ok) {
                toast.error(r.message)
                return
              }
              toast.success('E-Mail gesendet')
              setMailOpen(false)
              setPreview(null)
              onChanged()
            } finally {
              setSendLoading(false)
            }
          }}
        />
      ) : null}
    </>
  )
}
