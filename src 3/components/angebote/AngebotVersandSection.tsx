'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Link2, Mail } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { cn } from '@/lib/utils'
import type { AngebotDetail, AngebotHandwerkerRow, AngebotPosition } from '@/lib/types'
import { HandwerkerEinreichungPruefung } from '@/components/angebote/HandwerkerEinreichungPruefung'
import {
  darfAngebotAnKundeSenden,
  handwerkerSendenBlockierHinweis,
} from '@/lib/angebote/angebot-handwerker-flow'
import { betragAnzeige } from '@/lib/angebot-einfach'
import {
  normalizeAngebotPositionen,
  summenAusPositionen,
  summenKostenaufstellungAusPositionen,
} from '@/lib/angebot-positionen'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { firmenEinstellungenToMailBranding } from '@/lib/mail-branding'
import { mailAngebot } from '@/lib/mail-templates'
import { resolveAngebotKundeTyp } from '@/lib/angebote/angebot-wizard-types'
import { kundeBegruessungsVorname } from '@/lib/kunde-rechnungsempfaenger'

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
  mode = 'full',
  kundeModalOpen,
  onKundeModalOpenChange,
  onKundeSent,
  auftragId = null,
  angebotTitel,
  onAcceptWizard,
}: {
  detail: AngebotDetail
  bruttoMin: number
  bruttoMax: number
  positionen: AngebotPosition[]
  gueltigBis: string
  /** full = Kunde + Handwerker; kunde = nur Kunden-Modal; handwerker = nur Handwerker-Block */
  mode?: 'full' | 'kunde' | 'handwerker'
  kundeModalOpen?: boolean
  onKundeModalOpenChange?: (open: boolean) => void
  onKundeSent?: () => void
  auftragId?: string | null
  angebotTitel?: string
  onAcceptWizard?: (ctx: {
    auftragId: string
    handwerkerId: string
    gewerkId: string
    zuweisungId: string
  }) => void
}) {
  const router = useRouter()
  const [kundeModalInternal, setKundeModalInternal] = useState(false)
  const kundeModalControlled = kundeModalOpen !== undefined
  const kundeModal = kundeModalControlled ? kundeModalOpen : kundeModalInternal
  const setKundeModal = (open: boolean) => {
    if (kundeModalControlled) onKundeModalOpenChange?.(open)
    else setKundeModalInternal(open)
  }
  const [subject, setSubject] = useState('Ihr Angebot von Bärenwald München')
  const [hwModal, setHwModal] = useState<{
    id: string
    name: string
    gewerk: string
    betreff: string
    html: string
    to: string[]
    cc: string[]
  } | null>(null)
  const [pending, startTransition] = useTransition()

  const kunde = detail.kunden
  const kundeTyp = resolveAngebotKundeTyp(kunde?.typ, detail.leads?.kundentyp)
  const kundeEmail = kunde?.email?.trim() ?? ''
  const kundeName = kunde?.name?.trim() ?? 'Kundin'
  const vorname =
    kundeBegruessungsVorname({
      name: kundeName,
      vorname: kunde?.vorname,
      nachname: kunde?.nachname,
      ansprechpartner: kunde?.ansprechpartner,
      typ: kunde?.typ,
    }) ?? (kundeName.split(/\s+/)[0] || kundeName)

  const rows = useMemo(() => detail.angebot_handwerker ?? [], [detail.angebot_handwerker])
  const orgFreigabeStatus = (detail.leads as { org_freigabe_status?: string } | null | undefined)
    ?.org_freigabe_status as import('@/lib/types').OrgFreigabeStatus | undefined
  const titel =
    angebotTitel?.trim() ||
    detail.notizen?.trim()?.slice(0, 80) ||
    (detail.angebotsnr ? `Angebot ${detail.angebotsnr}` : 'Projekt')

  const previewHtml = useMemo(() => {
    const posMail = normalizeAngebotPositionen(positionen)
    const summenMail = summenAusPositionen(posMail, 19)
    const base = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '')
    const statusLink = detail.lead_id ? `${base}/status/${detail.lead_id}` : base
    const b = firmenEinstellungenToMailBranding(defaultFirmenEinstellungen())
    return mailAngebot(
      {
        name: vorname,
        positionen: posMail,
        gesamt_min: summenMail.nettoMin,
        gesamt_max: summenMail.nettoMax,
        lohn_gesamt: summenKostenaufstellungAusPositionen(posMail)?.lohn_netto ?? 0,
        gueltig_bis: gueltigBis,
        statusLink,
        kundeTyp,
      },
      b
    ).html
  }, [vorname, positionen, gueltigBis, detail.lead_id, kundeTyp])

  const allHandwerkerAngefragt = useMemo(() => {
    if (rows.length === 0) return false
    return rows.every((r) => {
      const s = (r.status ?? 'ausstehend').toLowerCase()
      return s === 'angefragt' || s === 'akzeptiert' || s === 'abgelehnt'
    })
  }, [rows])

  const kannAnKunde =
    darfAngebotAnKundeSenden(rows, detail.status) &&
    (detail.status === 'entwurf' || detail.status === 'handwerker_akzeptiert') &&
    Boolean(kundeEmail)

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
      onKundeSent?.()
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
      toast.success(`Partner-Mail an ${name} gesendet`)
    }
    if (!sendEmail && json.link) {
      try {
        await navigator.clipboard.writeText(json.link)
        toast.success('Partner-Login kopiert — in WhatsApp einfügen')
      } catch {
        toast.message('Link', { description: json.link })
      }
    }
    router.refresh()
  }

  function openHandwerkerModal(z: AngebotHandwerkerRow) {
    startTransition(async () => {
      const res = await fetch(`/api/angebote/${detail.id}/senden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typ: 'handwerker',
          zuweisung_id: z.id,
          send_email: false,
          preview_only: true,
        }),
      })
      const json = (await res.json()) as {
        error?: string
        html?: string
        betreff?: string
        defaultTo?: string[]
        defaultCc?: string[]
      }
      if (!res.ok || !json.html) {
        toast.error(json.error ?? 'Vorschau konnte nicht geladen werden')
        return
      }
      setHwModal({
        id: z.id,
        name: z.handwerker?.name ?? 'Handwerker',
        gewerk: z.gewerke?.name ?? 'Gewerk',
        betreff: json.betreff ?? `Neue Anfrage: ${z.gewerke?.name ?? 'Gewerk'} — Bärenwald München`,
        html: json.html,
        to: (json.defaultTo ?? []).filter(Boolean),
        cc: (json.defaultCc ?? []).filter(Boolean),
      })
    })
  }

  function sendHandwerkerAusModal() {
    if (!hwModal) return
    startTransition(async () => {
      const res = await fetch(`/api/angebote/${detail.id}/senden`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typ: 'handwerker',
          zuweisung_id: hwModal.id,
          send_email: true,
          betreff: hwModal.betreff,
          to: hwModal.to,
          cc: hwModal.cc,
        }),
      })
      const json = (await res.json()) as { error?: string; gesendet?: boolean }
      if (!res.ok) {
        toast.error(json.error ?? 'Versand fehlgeschlagen')
        return
      }
      toast.success(`Partner-Mail an ${hwModal.name} gesendet`)
      setHwModal(null)
      router.refresh()
    })
  }

  const showKundeBlock = mode === 'full' || mode === 'kunde'
  const showHandwerkerBlock = mode === 'full' || mode === 'handwerker'
  const showKundeModalOnly = mode === 'kunde'

  return (
    <section className={showKundeModalOnly ? undefined : 'mb-6'}>
      {!showKundeModalOnly ? (
        <h2 className="mb-3 text-lg font-semibold text-ink">Versand</h2>
      ) : null}

      {allHandwerkerAngefragt && rows.length > 0 && showHandwerkerBlock ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Alle Handwerker wurden angefragt.
        </div>
      ) : null}

      {showKundeBlock && !showKundeModalOnly ? (
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
              : !darfAngebotAnKundeSenden(rows, detail.status)
                ? handwerkerSendenBlockierHinweis(rows, orgFreigabeStatus)
                : 'Nur bei Status „Entwurf“ oder „Handwerker akzeptiert“ versendbar.'}
          </p>
        )}
      </Card>
      ) : null}

      {showHandwerkerBlock ? (
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
                <li key={z.id} className="flex flex-col gap-3 py-4 first:pt-0">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
                        disabled={pending}
                        title={!hwEmail ? 'Keine E-Mail hinterlegt' : undefined}
                        onClick={() => openHandwerkerModal(z)}
                      >
                        <Mail className="mr-1 inline h-4 w-4" aria-hidden />
                        Partner-Mail
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        title="Partner-Login — Status wird auf „angefragt“ gesetzt"
                        onClick={() => void sendHandwerker(z, false)}
                      >
                        <Link2 className="mr-1 inline h-4 w-4" aria-hidden />
                        WhatsApp-Link
                      </Button>
                    </div>
                  </div>
                  <HandwerkerEinreichungPruefung
                    z={z}
                    angebotId={detail.id}
                    angebotTitel={titel}
                    auftragId={auftragId}
                    onRefresh={() => router.refresh()}
                    onAcceptWizard={onAcceptWizard}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </Card>
      ) : null}

      <Modal
        open={kundeModal}
        onClose={() => setKundeModal(false)}
        title="An Kunden senden"
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={sendKunde} disabled={pending}>
              Jetzt senden
            </Button>
            <Button type="button" variant="secondary" onClick={() => setKundeModal(false)}>
              Abbrechen
            </Button>
          </div>
        }
      >
        <p className="mb-2 text-sm text-bw-text-muted">
          Empfänger: <span className="font-medium text-bw-text">{kundeEmail}</span>
        </p>
        <Input label="Betreff" value={subject} onChange={(e) => setSubject(e.target.value)} className="mb-3" />
        <p className="mb-1 text-xs font-medium text-bw-text-muted">Vorschau</p>
        <iframe
          title="Vorschau"
          sandbox="allow-same-origin"
          className="mb-3 h-[280px] w-full rounded-lg border border-bw-border bg-white"
          srcDoc={previewHtml}
        />
        <p className="mb-3 text-sm text-bw-text">
          Gesamtbetrag (Brutto):{' '}
          <strong>{betragAnzeige(null, bruttoMin, bruttoMax)}</strong>
        </p>
        <p className="text-xs text-bw-text-muted">PDF wird angehängt.</p>
      </Modal>

      <Modal
        open={!!hwModal}
        onClose={() => setHwModal(null)}
        title={hwModal ? `Partner-Mail an ${hwModal.name}` : 'Partner-Mail'}
        size="lg"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setHwModal(null)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={sendHandwerkerAusModal}>
              Jetzt senden
            </Button>
          </div>
        }
      >
        {hwModal ? (
          <div className="space-y-3">
            <p className="text-sm text-bw-text-muted">
              Gewerk: <span className="font-medium text-bw-text">{hwModal.gewerk}</span>
            </p>
            <Input
              label="Betreff"
              value={hwModal.betreff}
              onChange={(e) => setHwModal((prev) => (prev ? { ...prev, betreff: e.target.value } : prev))}
            />
            <EmailPillsField
              label="An"
              required
              emails={hwModal.to}
              onChange={(emails) => setHwModal((prev) => (prev ? { ...prev, to: emails } : prev))}
              placeholder="handwerker@beispiel.de"
            />
            <EmailPillsField
              label="CC"
              emails={hwModal.cc}
              onChange={(emails) => setHwModal((prev) => (prev ? { ...prev, cc: emails } : prev))}
              placeholder="weitere@beispiel.de"
              hint="Optional — nur für zusätzliche Empfänger sichtbar."
            />
            <p className="mb-1 text-xs font-medium text-bw-text-muted">Vorschau</p>
            <p className="text-xs text-bw-text-muted">
              Versand über die Website (Partner-Portal), nicht über CRM-Resend.
            </p>
            <iframe
              title="Partner-Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[300px] w-full rounded-lg border border-bw-border bg-white"
              srcDoc={hwModal.html}
            />
          </div>
        ) : null}
      </Modal>
    </section>
  )
}
