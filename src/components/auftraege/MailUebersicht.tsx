'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { toast } from '@/components/ui/app-toast'
import {
  ensureKundenTokenAction,
  sendKundenProjektLinkEmail,
} from '@/app/(dashboard)/auftraege/kunden-status-actions'
import type { EmailLogRow } from '@/app/(dashboard)/auftraege/auftraege-data'
import type { AuftragDetail } from '@/lib/types'
import { projektUrlFromToken } from '@/lib/projekt/projekt-url'
import { formatDatumZeit } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

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
  handwerker_anfrage: 'Partner-Anfrage',
  handwerker_formular: 'Partner-Formular',
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
  const [pending, startTransition] = useLocalTransition()
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
      toast.error(TOAST.kein_kunden_link_bitte_zuerst_erzeugen)
      return
    }
    try {
      await navigator.clipboard.writeText(projektUrl)
      toast.success(TOAST.link_kopiert)
    } catch {
      toast.error(TOAST.kopieren_nicht_moeglich)
    }
  }

  return (
    <>
      <section className="mb-6 rounded-card border border-border bg-surface p-4">
        <h2 className="mb-1 text-[length:var(--fs-head)] font-semibold text-ink">Kunden-Kommunikation</h2>
        <p className="text-[length:var(--fs-text)] text-muted">Öffentliche Status-Seite, E-Mail-Protokoll und Freigaben.</p>

        <div className="mt-4 rounded-card border border-border bg-canvas/40 p-3">
          <h3 className="text-[length:var(--fs-text)] font-semibold text-ink">Kunden-Status-Seite</h3>
          <p className="mt-2 text-[length:var(--fs-text)] text-muted">
            Aufrufe: <span className="font-medium text-ink">{aufrufe}</span>
            <span className="mx-2">·</span>
            Letzter Aufruf: <span className="font-medium text-ink">{letzterRel}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <MockBtn
              type="button"
              kind="secondary"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await ensureKundenTokenAction(detail.id)
                  if (!r.ok) toast.systemError(r)
                  else {
                    toast.success(TOAST.kunden_link_bereit)
                    onChanged()
                  }
                })
              }
            >
              Link erzeugen / aktualisieren
            </MockBtn>
            <MockBtn type="button" kind="secondary" disabled={!projektUrl} onClick={() => void copyLink()}>
              Link kopieren
            </MockBtn>
            <MockBtn type="button" kind="secondary" disabled={!projektUrl} onClick={() => setShowQr(true)}>
              QR-Code
            </MockBtn>
            <MockBtn
              type="button"
              kind="secondary"
              disabled={!projektUrl}
              onClick={() => {
                if (projektUrl) window.open(projektUrl, '_blank', 'noopener,noreferrer')
              }}
            >
              <span className="inline-flex items-center gap-1">
                Status-Seite öffnen <MockIcon n="external-link" ctx="default" className="h-4 w-4" aria-hidden />
              </span>
            </MockBtn>
            <MockBtn
              type="button"
              kind="secondary"
              loading={pending}
              disabled={!detail.kunden?.email?.trim()}
              onClick={() =>
                startTransition(async () => {
                  const r = await sendKundenProjektLinkEmail(detail.id)
                  if (!r.ok) toast.systemError(r)
                  else toast.success(TOAST.emailGesendet)
                })
              }
            >
              Per Mail senden
            </MockBtn>
          </div>
          {projektUrl ? (
            <p className="mt-3 break-all text-[length:var(--fs-meta)] text-muted">
              <span className="font-medium text-ink">URL:</span> {projektUrl}
            </p>
          ) : (
            <p className="mt-3 text-[length:var(--fs-meta)] text-muted">Noch kein Token — „Link erzeugen“ antippen.</p>
          )}
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-[length:var(--fs-text)] font-semibold text-ink">Gesendete E-Mails</h3>
          {emailLog.length === 0 ? (
            <p className="text-[length:var(--fs-text)] text-muted">Noch keine E-Mails zu diesem Auftrag protokolliert.</p>
          ) : (
            <ul className="space-y-2">
              {emailLog.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-0.5 rounded-card border border-border bg-canvas/30 px-3 py-2 text-[length:var(--fs-text)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <MockIcon n="mail" ctx="default" className="h-4 w-4 shrink-0 text-muted" aria-hidden />
                    <span className="font-medium text-ink">{typLabel(row.typ)}</span>
                    {row.status === 'fehler' ? (
                      <span className="rounded-card bg-status-cancel-bg px-1.5 text-[length:var(--fs-meta)] text-status-cancel-text">Fehler</span>
                    ) : null}
                  </div>
                  <p className="text-[length:var(--fs-meta)] text-muted">
                    {row.an_email}
                    <span className="mx-1">·</span>
                    {formatDatumZeit(row.created_at)}
                  </p>
                  {row.status === 'fehler' && row.fehler_nachricht ? (
                    <p className="text-[length:var(--fs-meta)] text-danger">{row.fehler_nachricht}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <EditorSheet open={showQr} onClose={() => setShowQr(false)} title="QR-Code" size="md">
        <p className="text-center text-[length:var(--fs-meta)] text-muted">
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
        <MockBtn type="button" kind="secondary" className="mt-4 w-full" onClick={() => setShowQr(false)}>
          Abbrechen
        </MockBtn>
      </EditorSheet>
    </>
  )
}
