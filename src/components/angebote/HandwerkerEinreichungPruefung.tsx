'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'

/**
 * @deprecated Gegenvorschlag-Prüfung — nicht mehr im v3 Leistungen-Tab. Für Legacy/Angebot.
 */
import Link from 'next/link'
import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { cn, formatDatumZeit } from '@/lib/utils'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition } from '@/lib/types'
import { betragAnzeige } from '@/lib/angebot-einfach'
import {
  ablehneHandwerkerEinreichung,
  bestaetigeHandwerkerEinreichung,
  getHandwerkerEinreichungPdfUrl,
  rueckfrageHandwerkerEinreichung,
} from '@/app/(dashboard)/angebote/actions'
import {
  ekNettoFromHwEinreichung,
  hasHwEinreichung,
  hwStatusBadgeClass,
  hwStatusLabel,
  kannHwEinreichungPruefen,
} from '@/lib/partner/handwerker-einreichung'
import {
  parseHwAnhangStoragePaths,
  partnerHwDokumentListenName,
} from '@/lib/partner/partner-hw-dokument-typen'
import { parseHwKonditionen, hwKonditionForAuftragPosition } from '@/lib/partner/hw-konditionen'
import { HwKonditionenPruefungTable } from '@/components/angebote/HwKonditionenPruefungTable'
import {
  handwerkerEinreichungAntwortBetreff,
  handwerkerEinreichungAntwortPreviewHtml,
} from '@/lib/partner/handwerker-einreichung-antwort-mail'
import type { PartnerAngebotAntwortTyp } from '@/lib/partner/notify-partner-angebot-antwort'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

type AntwortModal = {
  typ: PartnerAngebotAntwortTyp
  crmNotiz: string
  betreff: string
  html: string
  to: string[]
  cc: string[]
}

export function HandwerkerEinreichungPruefung({
  z,
  angebotId,
  angebotTitel,
  auftragId,
  auftragPosition = null,
  angebotPositionen = [],
  onRefresh,
  onAcceptWizard,
  bestaetigenErstNachKundenJa = false,
}: {
  z: AngebotHandwerkerRow
  angebotId: string
  angebotTitel: string
  auftragId: string | null
  auftragPosition?: Pick<
    AuftragPosition,
    'id' | 'leistung_name' | 'gewerk_slug' | 'gewerk_name'
  > | null
  angebotPositionen?: AngebotPosition[]
  onRefresh: () => void
  onAcceptWizard?: (ctx: {
    auftragId: string
    handwerkerId: string
    gewerkId: string
    zuweisungId: string
  }) => void
  /** Partner-Einholung: Bestätigen erst nach Kunden-Ja. */
  bestaetigenErstNachKundenJa?: boolean
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useLocalTransition()
  const [notizModal, setNotizModal] = useState<PartnerAngebotAntwortTyp | null>(null)
  const [crmNotiz, setCrmNotiz] = useState('')
  const [mailModal, setMailModal] = useState<AntwortModal | null>(null)

  if (auftragId && z.ohne_lv !== true) {
    return (
      <div className="mt-3 rounded-card border border-bw-border bg-bw-bg px-3 py-2.5 text-[length:var(--fs-meta)] text-bw-text-muted">
        <p className="font-medium text-bw-text">Vorgänge-Flow (Auftrag aktiv)</p>
        <p className="mt-1">
          Preise und Leistungen pflegt ihr im Auftrag unter Tab{' '}
          <strong>Positionen</strong> (Zuweisen → Senden). Der Partner bestätigt im Portal unter{' '}
          <strong>Vorgänge</strong> — ohne Gegenvorschlag oder Bestätigung hier.
        </p>
        <Link
          href={`/auftraege/${auftragId}?tab=leistung`}
          className="mt-2 inline-block text-[length:var(--fs-text)] font-medium text-bw-primary hover:underline"
        >
          Zum Auftrag → Positionen
        </Link>
      </div>
    )
  }

  const eingereicht = hasHwEinreichung(z)
  const konditionenRaw = parseHwKonditionen(z.hw_konditionen)
  const konditionen =
    konditionenRaw && auftragPosition
      ? (() => {
          const zeile = hwKonditionForAuftragPosition(
            konditionenRaw,
            auftragPosition,
            angebotPositionen,
            auftragPosition.gewerk_slug,
            auftragPosition.gewerk_name
          )
          return zeile
            ? { ...konditionenRaw, positionen: [zeile] }
            : konditionenRaw
        })()
      : konditionenRaw
  const hwSt = (z.hw_status ?? '').toLowerCase()
  const kannPruefen = kannHwEinreichungPruefen(z) && !bestaetigenErstNachKundenJa
  const uebernommen = hwSt === 'uebernommen'
  const bestaetigt = hwSt === 'bestaetigt'
  const ek = eingereicht ? ekNettoFromHwEinreichung(z) : null
  const handwerkerName = z.handwerker?.name?.trim() || 'Partner'
  const gewerkName = z.gewerke?.name?.trim() || 'Gewerk'
  const hwEmail = z.handwerker?.email?.trim() || ''
  const unterlagePaths = parseHwAnhangStoragePaths(z.hw_angebot_anhang_urls, z.hw_angebot_pdf_url)
  const hatRechnung = Boolean(z.hw_rechnung_pdf_url?.trim())

  if (!eingereicht) return null

  function openUnterlagePdf(index: number) {
    startTransition(async () => {
      const res = await getHandwerkerEinreichungPdfUrl(z.id, 'angebot', index)
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    })
  }

  function openRechnungPdf() {
    startTransition(async () => {
      const res = await getHandwerkerEinreichungPdfUrl(z.id, 'rechnung')
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      window.open(res.url, '_blank', 'noopener,noreferrer')
    })
  }

  function bestaetigen() {
    startTransition(async () => {
      const res = await bestaetigeHandwerkerEinreichung({ angebotId, zuweisungId: z.id })
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      if (res.openWizard && onAcceptWizard) {
        toast.success(TOAST.konditionen_uebernommen)
        onAcceptWizard(res.openWizard)
        onRefresh()
        return
      }
      toast.success(TOAST.konditionen_uebernommen)
      onRefresh()
    })
  }

  function openAntwortSchritt(typ: PartnerAngebotAntwortTyp) {
    setCrmNotiz(z.hw_crm_notiz?.trim() ?? '')
    setNotizModal(typ)
  }

  function weiterZurMail() {
    if (!notizModal) return
    const text = crmNotiz.trim()
    if (!text) {
      applyFieldErrors({ _form: TOAST.bitte_eine_nachricht_an_den_partner_eingeben })
      return
    }
    const betreff = handwerkerEinreichungAntwortBetreff(notizModal, gewerkName)
    const html = handwerkerEinreichungAntwortPreviewHtml({
      typ: notizModal,
      handwerkerName,
      gewerkName,
      angebotTitel,
      crmNotiz: text,
      anfrageId: z.id,
    })
    setMailModal({
      typ: notizModal,
      crmNotiz: text,
      betreff,
      html,
      to: hwEmail ? [hwEmail] : [],
      cc: [],
    })
    setNotizModal(null)
  }

  function sendAntwort() {
    if (!mailModal) return
    if (!mailModal.to.length) {
      applyFieldErrors({ _form: TOAST.bitte_mindestens_eine_empfaenger_adresse_unter_a })
      return
    }
    startTransition(async () => {
      const payload = {
        angebotId,
        zuweisungId: z.id,
        crmNotiz: mailModal.crmNotiz,
        betreff: mailModal.betreff,
        cc: mailModal.cc,
      }
      const res =
        mailModal.typ === 'rueckfrage'
          ? await rueckfrageHandwerkerEinreichung(payload)
          : await ablehneHandwerkerEinreichung(payload)
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      const mailTeil = res.mailGesendet
        ? ' E-Mail an den Partner gesendet.'
        : res.mailHinweis
          ? ` Hinweis: ${res.mailHinweis}`
          : ''
      toast.success(
        mailModal.typ === 'rueckfrage'
          ? `Rückfrage gespeichert.${mailTeil}`
          : `Angebot abgelehnt.${mailTeil}`
      )
      setMailModal(null)
      onRefresh()
    })
  }

  return (
    <>
      <div className="mt-3 rounded-card border border-bw-border bg-bw-bg-soft/80 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-muted">
            Eingereichtes Angebot
          </span>
          <span
            className={cn(
              'rounded-pill px-2 py-0.5 text-[length:var(--fs-meta)] font-medium',
              hwStatusBadgeClass(z.hw_status)
            )}
          >
            {hwStatusLabel(z.hw_status)}
          </span>
        </div>

        <p className="text-[length:var(--fs-text)] text-bw-text">
          <span className="text-bw-text-muted">Netto:</span>{' '}
          {z.hw_preis_netto != null ? betragAnzeige(z.hw_preis_netto, null, null) : '—'}
          {' · '}
          <span className="text-bw-text-muted">Brutto:</span>{' '}
          {z.hw_preis_brutto != null ? betragAnzeige(z.hw_preis_brutto, null, null) : '—'}
          {!konditionen && ek != null ? (
            <span className="text-bw-text-muted"> · EK: {betragAnzeige(ek, null, null)}</span>
          ) : null}
        </p>

        {konditionen ? (
          <HwKonditionenPruefungTable
            z={{
              ...z,
              hw_konditionen: konditionen,
            }}
          />
        ) : null}

        {z.hw_eingereicht_at ? (
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            Eingereicht: {formatDatumZeit(z.hw_eingereicht_at)}
          </p>
        ) : null}

        {z.hw_notiz?.trim() ? (
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted whitespace-pre-wrap">
            <span className="font-medium text-bw-text">Partner-Notiz:</span> {z.hw_notiz.trim()}
          </p>
        ) : null}

        {z.hw_crm_notiz?.trim() && !kannPruefen ? (
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted whitespace-pre-wrap rounded-field border border-status-contact-bg bg-status-contact-bg px-2 py-1.5">
            <span className="font-medium text-status-contact-text">Deine letzte Nachricht:</span>{' '}
            {z.hw_crm_notiz.trim()}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {unterlagePaths.map((_, i) => (
            <MockBtn
              key={`unterlage-${i}`}
              type="button"
              kind="secondary" sm
              loading={pending}
              onClick={() => openUnterlagePdf(i)}
            >
              <MockIcon n="download" ctx="default" className="mr-1 h-3.5 w-3.5" aria-hidden />
              {partnerHwDokumentListenName('unterlage', { index: i, total: unterlagePaths.length })}
            </MockBtn>
          ))}

          {hatRechnung ? (
            <MockBtn type="button" kind="secondary" sm loading={pending} onClick={openRechnungPdf}>
              <MockIcon n="download" ctx="default" className="mr-1 h-3.5 w-3.5" aria-hidden />
              {partnerHwDokumentListenName('rechnung')}
            </MockBtn>
          ) : null}

          {kannPruefen ? (
            <>
              <MockBtn type="button" kind="primary" sm loading={pending} onClick={bestaetigen}>
                Bestätigen
              </MockBtn>
              <MockBtn
                type="button"
                kind="secondary" sm
                loading={pending}
                onClick={() => openAntwortSchritt('rueckfrage')}
              >
                Rückfrage
              </MockBtn>
              <MockBtn
                type="button"
                kind="danger" sm
                loading={pending}
                onClick={() => openAntwortSchritt('abgelehnt')}
              >
                Ablehnen
              </MockBtn>
            </>
          ) : null}

          {uebernommen ? (
            <span className="text-[length:var(--fs-meta)] font-medium text-bw-primary self-center">
              Übernommen — Partner hat bestätigt
            </span>
          ) : null}

          {bestaetigt ? (
            <p className="w-full rounded-field border border-status-new-bg bg-status-new-bg px-2 py-1.5 text-[length:var(--fs-meta)] text-status-new-text">
              Konditionen im CRM übernommen — <span className="font-medium">Partner muss im Portal noch bestätigen</span>{' '}
              (Tab Anfragen). Danach wechselt der Vorgang zu Angebote.
            </p>
          ) : null}
        </div>
      </div>

      <EditorSheet
        open={notizModal != null}
        onClose={() => setNotizModal(null)}
        title={notizModal === 'rueckfrage' ? 'Rückfrage an Partner' : 'Angebot ablehnen'}
        secondary={{ label: 'Abbrechen', onClick: () => setNotizModal(null) }}
        primary={{ label: 'Weiter zur E-Mail', onClick: weiterZurMail }}
      >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
                <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
          Dieser Text wird im Partner-Portal angezeigt und in der E-Mail an{' '}
          <span className="font-medium text-bw-text">{handwerkerName}</span> mitgeschickt.
        </p>
        <MockField label={notizModal === 'rueckfrage' ? 'Rückfrage / Hinweis' : 'Grund der Ablehnung'} required><RichTextEditor value={typeof (crmNotiz) === 'string' ? (crmNotiz) : ''} onChange={(__v) => setCrmNotiz(__v)} placeholder={notizModal === 'rueckfrage'
              ? 'z. B. Bitte Position X nochmal mit Material Y kalkulieren …'
              : 'z. B. Preis liegt deutlich über unserem Budget …'} minHeight={120} aria-label={notizModal === 'rueckfrage' ? 'Rückfrage / Hinweis' : 'Grund der Ablehnung'} /></MockField>
      </EditorSheet>

      <EditorSheet
        open={!!mailModal}
        onClose={() => setMailModal(null)}
        title={`E-Mail an ${handwerkerName}`}
        size="lg"
        secondary={{ label: 'Abbrechen', onClick: () => setMailModal(null) }}
        primary={{
          label: 'Senden & Status aktualisieren',
          onClick: sendAntwort,
          busy: pending,
        }}
      >
        {mailModal ? (
          <div className="space-y-3">
            <p className="text-[length:var(--fs-text)] text-bw-text-muted">
              Gewerk: <span className="font-medium text-bw-text">{gewerkName}</span>
            </p>
            <MockField label="Betreff"><MockInput value={mailModal.betreff} onChange={(e) =>
                setMailModal((prev) => (prev ? { ...prev, betreff: e.target.value } : prev))} /></MockField>
            <EmailPillsField
              label="An"
              required
              emails={mailModal.to}
              onChange={(emails) =>
                setMailModal((prev) => (prev ? { ...prev, to: emails } : prev))
              }
              placeholder="handwerker@beispiel.de"
            />
            <EmailPillsField
              label="CC"
              emails={mailModal.cc}
              onChange={(emails) =>
                setMailModal((prev) => (prev ? { ...prev, cc: emails } : prev))
              }
              placeholder="weitere@beispiel.de"
              hint="Optional."
            />
            <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
              Versand über die Website (Partner-Portal), nicht über CRM-Resend.
            </p>
            <iframe
              title="Partner-Mail Vorschau"
              sandbox="allow-same-origin"
              className="h-[280px] w-full rounded-card border border-bw-border bg-white"
              srcDoc={mailModal.html}
            />
          </div>
        ) : null}
      </EditorSheet>
    </>
  )
}
