'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Link2, Mail, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import type { AngebotDetail, AngebotHandwerkerRow, AngebotPosition } from '@/lib/types'
import { buildKundenAngebotMail } from '@/lib/angebote/angebot-mail-templates'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'

function hwStatusLabel(s: string | null | undefined): string {
  const v = (s ?? 'ausstehend').toLowerCase()
  if (v === 'angefragt') return 'Angefragt'
  if (v === 'akzeptiert') return 'Akzeptiert'
  if (v === 'abgelehnt') return 'Abgelehnt'
  if (v === 'zugewiesen') return 'Zugewiesen'
  return 'Ausstehend'
}

function hwBadgeClass(s: string | null | undefined): string {
  const v = (s ?? '').toLowerCase()
  if (v === 'akzeptiert') return 'bg-emerald-100 text-emerald-900'
  if (v === 'abgelehnt') return 'bg-red-100 text-red-900'
  if (v === 'angefragt') return 'bg-blue-100 text-blue-900'
  return 'bg-canvas text-muted'
}

export function AngebotVersandSection({
  detail,
  bruttoMin,
  bruttoMax,
  positionen,
  gueltigBis,
}: {
  detail: AngebotDetail
  bruttoMin: number
  bruttoMax: number
  positionen: AngebotPosition[]
  gueltigBis: string
}) {
  const router = useRouter()
  const [kundeModal, setKundeModal] = useState(false)
  const [subject, setSubject] = useState('Ihr Angebot von Bärenwald München')
  const [pending, startTransition] = useTransition()

  const kunde = detail.kunden
  const kundeEmail = kunde?.email?.trim() ?? ''
  const kundeName = kunde?.name?.trim() ?? 'Kundin'
  const vorname = kundeName.split(/\s+/)[0] || kundeName

  const rows = useMemo(() => detail.angebot_handwerker ?? [], [detail.angebot_handwerker])

  const previewHtml = useMemo(
    () =>
      buildKundenAngebotMail({
        kundeVorname: vorname,
        positionen,
        bruttoMin,
        bruttoMax,
        gueltigBis,
        firm: defaultFirmenEinstellungen(),
      }),
    [vorname, positionen, bruttoMin, bruttoMax, gueltigBis]
  )

  const allHandwerkerAngefragt = useMemo(() => {
    if (rows.length === 0) return false
    return rows.every((r) => {
      const s = (r.status ?? 'ausstehend').toLowerCase()
      return s === 'angefragt' || s === 'akzeptiert' || s === 'abgelehnt'
    })
  }, [rows])

  const kannAnKunde =
    (detail.status === 'entwurf' || detail.status === 'handwerker_akzeptiert') && Boolean(kundeEmail)

  function sendKunde() {
    startTransition(async () => {
      const res = await fetch(`/api/angebote/${detail.id}/senden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typ: 'kunde', subject }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        toast.error(json.error ?? 'Versand fehlgeschlagen')
        return
      }
      toast.success(`Angebot an ${kundeName} gesendet`)
      setKundeModal(false)
      router.refresh()
    })
  }

  async function sendHandwerker(z: AngebotHandwerkerRow, sendEmail: boolean) {
    const res = await fetch(`/api/angebote/${detail.id}/senden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        typ: 'handwerker',
        zuweisung_id: z.id,
        send_email: sendEmail,
      }),
    })
    const json = (await res.json()) as { error?: string; link?: string; gesendet?: boolean }
    if (!res.ok) {
      toast.error(json.error ?? 'Aktion fehlgeschlagen')
      return
    }
    const name = z.handwerker?.name?.trim() ?? 'Handwerkerin'
    if (sendEmail && json.gesendet) {
      toast.success(`Mail an ${name} gesendet`)
    }
    if (!sendEmail && json.link) {
      try {
        await navigator.clipboard.writeText(json.link)
        toast.success('Link kopiert — jetzt in WhatsApp einfügen')
      } catch {
        toast.message('Link', { description: json.link })
      }
    }
    router.refresh()
  }

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-lg font-semibold text-ink">Versand</h2>

      {allHandwerkerAngefragt && rows.length > 0 ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Alle Handwerker wurden angefragt.
        </div>
      ) : null}

      <Card id="angebot-versand-kunde" className="mb-6 space-y-4 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">An Kunden senden</h3>
        {kannAnKunde ? (
          <Button type="button" variant="primary" onClick={() => setKundeModal(true)} disabled={pending}>
            Angebot an Kunden senden
          </Button>
        ) : (
          <p className="text-sm text-muted">
            {!kundeEmail
              ? 'Kunden-E-Mail fehlt — Versand nicht möglich.'
              : 'Nur bei Status „Entwurf“ oder „Handwerker akzeptiert“ versendbar.'}
          </p>
        )}
      </Card>

      <Card id="angebot-versand-handwerker" className="space-y-4 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">An Handwerker senden</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Keine Handwerker zugewiesen.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((z) => {
              const hwEmail = z.handwerker?.email?.trim()
              const name = z.handwerker?.name ?? '—'
              const gw = z.gewerke?.name ?? 'Gewerk'
              return (
                <li key={z.id} className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium text-ink">
                      {name} — {gw}
                    </p>
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        hwBadgeClass(z.status as string)
                      )}
                    >
                      {hwStatusLabel(z.status as string)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!hwEmail || pending}
                      title={!hwEmail ? 'Keine E-Mail hinterlegt' : undefined}
                      onClick={() => void sendHandwerker(z, true)}
                    >
                      <Mail className="mr-1 inline h-4 w-4" aria-hidden />
                      Per Mail
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => void sendHandwerker(z, false)}>
                      <Link2 className="mr-1 inline h-4 w-4" aria-hidden />
                      Link kopieren
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {kundeModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-ink">An Kunden senden</h3>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted hover:bg-canvas"
                onClick={() => setKundeModal(false)}
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-2 text-sm text-muted">
              Empfänger: <span className="font-medium text-ink">{kundeEmail}</span>
            </p>
            <Input label="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-3" />
            <p className="mb-1 text-xs font-medium text-muted">Vorschau</p>
            <iframe
              title="Vorschau"
              sandbox="allow-same-origin"
              className="mb-3 h-[280px] w-full rounded-lg border border-border bg-white"
              srcDoc={previewHtml}
            />
            <p className="mb-3 text-sm text-ink">
              Gesamtbetrag (Brutto):{' '}
              <strong>
                {bruttoMin.toLocaleString('de-DE')} – {bruttoMax.toLocaleString('de-DE')} €
              </strong>
            </p>
            <p className="mb-4 text-xs text-muted">PDF wird angehängt.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={sendKunde} disabled={pending}>
                Jetzt senden
              </Button>
              <Button type="button" variant="secondary" onClick={() => setKundeModal(false)}>
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
