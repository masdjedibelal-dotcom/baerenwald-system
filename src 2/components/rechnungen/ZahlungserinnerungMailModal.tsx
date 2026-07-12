'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Paperclip } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
import { toast } from '@/components/ui/app-toast'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import { cn, formatDatum } from '@/lib/utils'
import {
  previewZahlungserinnerungMail,
  sendZahlungserinnerungMail,
} from '@/app/(dashboard)/rechnungen/actions'
import type { ZahlungserinnerungStufe } from '@/lib/mail/zahlungserinnerung-mail'

function defaultStufe(opts: {
  erinnerung7?: string | null
  erinnerung21?: string | null
}): ZahlungserinnerungStufe {
  if (opts.erinnerung7 && !opts.erinnerung21) return 2
  return 1
}

export function ZahlungserinnerungMailModal({
  open,
  onClose,
  rechnungId,
  rechnungsnummer,
  erinnerung7SentAt,
  erinnerung21SentAt,
  onSent,
}: {
  open: boolean
  onClose: () => void
  rechnungId: string
  rechnungsnummer: string
  erinnerung7SentAt?: string | null
  erinnerung21SentAt?: string | null
  onSent?: () => void
}) {
  const router = useRouter()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [stufe, setStufe] = useState<ZahlungserinnerungStufe>(() =>
    defaultStufe({ erinnerung7: erinnerung7SentAt, erinnerung21: erinnerung21SentAt })
  )
  const [mail, setMail] = useState<{
    betreff: string
    html: string
    to: string[]
    cc: string[]
    pdfName: string
    zahlbarBisLabel: string
    stufe1Gesendet: boolean
    stufe2Gesendet: boolean
  } | null>(null)

  useEffect(() => {
    if (!open) {
      setMail(null)
      return
    }
    setStufe(defaultStufe({ erinnerung7: erinnerung7SentAt, erinnerung21: erinnerung21SentAt }))
  }, [open, erinnerung7SentAt, erinnerung21SentAt])

  useEffect(() => {
    if (!open || !rechnungId) return
    let cancelled = false
    setLoading(true)
    setMail(null)
    void (async () => {
      const res = await previewZahlungserinnerungMail(rechnungId, stufe)
      if (cancelled) return
      setLoading(false)
      if (!res.ok) {
        toast.error(res.message)
        onCloseRef.current()
        return
      }
      setMail({
        betreff: res.betreff,
        html: res.html,
        to: res.defaultTo,
        cc: res.defaultCc,
        pdfName: res.pdfName,
        zahlbarBisLabel: res.zahlbarBisLabel,
        stufe1Gesendet: res.stufe1Gesendet,
        stufe2Gesendet: res.stufe2Gesendet,
      })
    })()
    return () => {
      cancelled = true
    }
  }, [open, rechnungId, stufe])

  function sendNow() {
    if (!mail) return
    if (!mail.to.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse unter An angeben.')
      return
    }
    startTransition(async () => {
      const res = await sendZahlungserinnerungMail(rechnungId, {
        stufe,
        to: mail.to,
        cc: mail.cc,
        betreff: mail.betreff,
        html: mail.html,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(
        stufe === 1
          ? `Zahlungserinnerung für ${rechnungsnummer} gesendet`
          : `2. Zahlungserinnerung für ${rechnungsnummer} gesendet`
      )
      onSent?.()
      router.refresh()
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Zahlungserinnerung — ${rechnungsnummer}`}
      size="lg"
      footer={
        <ModalFormFooter
          onCancel={onClose}
          onSubmit={sendNow}
          submitLabel="Jetzt senden"
          cancelLabel="Abbrechen"
          loading={pending || loading}
          submitDisabled={!mail}
        />
      }
    >
      {loading ? (
        <p className="text-sm text-bw-text-muted">E-Mail-Vorschau wird geladen…</p>
      ) : mail ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {([1, 2] as const).map((s) => {
              const gesendet = s === 1 ? mail.stufe1Gesendet : mail.stufe2Gesendet
              return (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    stufe === s
                      ? 'border-bw-primary bg-bw-primary/10 text-bw-primary'
                      : 'border-bw-border bg-bw-card text-bw-text hover:bg-bw-hover/60'
                  )}
                  onClick={() => setStufe(s)}
                >
                  Stufe {s}
                  {gesendet ? (
                    <span className="ml-1.5 text-xs font-normal text-bw-text-muted">(bereits gesendet)</span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {stufe === 1
              ? 'Freundliche Erinnerung — neue Frist: bisherige Fälligkeit + 7 Tage.'
              : 'Deutlichere Erinnerung — erneut +7 Tage auf die aktuelle Fälligkeit.'}{' '}
            Zahlbar bis: <strong>{mail.zahlbarBisLabel}</strong>
            {erinnerung7SentAt ? (
              <span className="mt-1 block text-xs text-amber-900/80">
                Stufe 1 zuletzt: {formatDatum(erinnerung7SentAt.slice(0, 10))}
              </span>
            ) : null}
          </p>

          <Input
            label="Betreff"
            value={mail.betreff}
            onChange={(e) => setMail((prev) => (prev ? { ...prev, betreff: e.target.value } : prev))}
          />
          <EmailPillsField
            label="An"
            required
            emails={mail.to}
            onChange={(emails) => setMail((prev) => (prev ? { ...prev, to: emails } : prev))}
            placeholder="kunde@beispiel.de"
          />
          <EmailPillsField
            label="CC"
            emails={mail.cc}
            onChange={(emails) => setMail((prev) => (prev ? { ...prev, cc: emails } : prev))}
            placeholder="weitere@beispiel.de"
            hint={KUNDE_MAIL_BCC_HINT}
          />
          <p className="inline-flex items-center gap-1.5 text-xs text-bw-text-muted">
            <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Anhang: {mail.pdfName}
          </p>
          <CollapsibleMailPreview previewHtml={mail.html} />
        </div>
      ) : null}
    </Modal>
  )
}
