'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, ExternalLink, Mail, MessageCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import {
  buildHandwerkerAuftragNachricht,
  handwerkerAnfrageMailSubject,
  type HandwerkerNachrichtInput,
} from '@/lib/auftraege/handwerker-nachricht'
import { formatDatum } from '@/lib/utils'

export type HandwerkerKontaktModalMode = 'whatsapp' | 'email'

export function HandwerkerKontaktModal({
  open,
  onClose,
  mode,
  handwerkerName,
  telefon,
  email,
  nachrichtInput,
}: {
  open: boolean
  onClose: () => void
  mode: HandwerkerKontaktModalMode
  handwerkerName: string
  telefon?: string | null
  email?: string | null
  nachrichtInput: HandwerkerNachrichtInput
}) {
  const [nachricht, setNachricht] = useState('')
  const [betreff, setBetreff] = useState('')
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [telefonDraft, setTelefonDraft] = useState('')

  useEffect(() => {
    if (!open) return
    setNachricht(buildHandwerkerAuftragNachricht(nachrichtInput))
    setBetreff(handwerkerAnfrageMailSubject(nachrichtInput.gewerkName))
    setMailTo(email?.trim() ? [email.trim()] : [])
    setMailCc([])
    setTelefonDraft(telefon?.trim() ?? '')
  }, [open, nachrichtInput, email, telefon])

  const projektKurz = useMemo(() => {
    const ort = [nachrichtInput.adresse?.trim(), [nachrichtInput.plz?.trim(), nachrichtInput.ort?.trim()].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ')
    const zeitraum =
      nachrichtInput.startDatum && nachrichtInput.endDatum
        ? `${formatDatum(nachrichtInput.startDatum)} – ${formatDatum(nachrichtInput.endDatum)}`
        : nachrichtInput.startDatum
          ? `ab ${formatDatum(nachrichtInput.startDatum)}`
          : nachrichtInput.endDatum
            ? `bis ${formatDatum(nachrichtInput.endDatum)}`
            : null
    return {
      kunde: nachrichtInput.kundeName.trim() || '—',
      ort: ort || '—',
      gewerk: nachrichtInput.gewerkName.trim() || '—',
      zeitraum: zeitraum ?? 'nach Absprache',
    }
  }, [nachrichtInput])

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Nachricht kopiert')
    } catch {
      toast.error('Kopieren nicht möglich')
    }
  }

  function openWhatsapp() {
    const digits = telefonDraft.replace(/\D/g, '')
    if (!digits) {
      toast.error('Bitte Telefonnummer eingeben.')
      return
    }
    if (!nachricht.trim()) {
      toast.error('Bitte Nachricht ausfüllen.')
      return
    }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(nachricht)}`, '_blank', 'noopener,noreferrer')
  }

  function openMailApp() {
    if (!mailTo.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse in An angeben.')
      return
    }
    if (!betreff.trim() || !nachricht.trim()) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    const params = new URLSearchParams()
    if (mailCc.length) params.set('cc', mailCc.join(','))
    params.set('subject', betreff)
    params.set('body', nachricht)
    const to = mailTo.map(encodeURIComponent).join(',')
    window.location.href = `mailto:${to}?${params.toString()}`
  }

  const title = mode === 'whatsapp' ? `WhatsApp — ${handwerkerName}` : `E-Mail — ${handwerkerName}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" variant="secondary" onClick={() => void copyText(nachricht)}>
            <Copy className="mr-1.5 h-4 w-4" aria-hidden />
            Text kopieren
          </Button>
          {mode === 'whatsapp' ? (
            <Button type="button" variant="primary" onClick={openWhatsapp}>
              <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
              In WhatsApp öffnen
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={openMailApp}>
              <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
              In Mail-App öffnen
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-bw-border bg-bw-bg px-3 py-2.5 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">Projektdaten</p>
          <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-bw-text-muted">Kunde</dt>
              <dd className="font-medium text-bw-text">{projektKurz.kunde}</dd>
            </div>
            <div>
              <dt className="text-xs text-bw-text-muted">Ort</dt>
              <dd className="font-medium text-bw-text">{projektKurz.ort}</dd>
            </div>
            <div>
              <dt className="text-xs text-bw-text-muted">Gewerk</dt>
              <dd className="font-medium text-bw-text">{projektKurz.gewerk}</dd>
            </div>
            <div>
              <dt className="text-xs text-bw-text-muted">Zeitraum</dt>
              <dd className="font-medium text-bw-text">{projektKurz.zeitraum}</dd>
            </div>
          </dl>
        </div>

        {mode === 'whatsapp' ? (
          <>
            <Input
              label="Telefon / WhatsApp"
              type="tel"
              value={telefonDraft}
              onChange={(e) => setTelefonDraft(e.target.value)}
              placeholder="+49 …"
              hint={
                telefon?.trim()
                  ? 'Nummer aus dem Handwerker-Stamm — bei Bedarf anpassen.'
                  : 'Keine Nummer hinterlegt — bitte eintragen oder Text kopieren.'
              }
            />
            <Textarea
              label="Nachricht"
              rows={14}
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              className="font-mono text-[13px]"
              hint="Enthält Kunde, Ort, Zeitraum, Gewerk und Leistungen — vor dem Senden anpassen."
            />
          </>
        ) : (
          <>
            <AngebotWizardVersandEmpfaengerCard
              mailTo={mailTo}
              onMailToChange={setMailTo}
              mailCc={mailCc}
              onMailCcChange={setMailCc}
              dokumentLabel="Handwerker-Anfrage"
            />
            <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
            <Textarea
              label="Nachricht"
              rows={14}
              value={nachricht}
              onChange={(e) => setNachricht(e.target.value)}
              className="font-mono text-[13px]"
              hint="Enthält die wichtigsten Projektdaten — vor dem Öffnen der Mail-App anpassen."
            />
            {!email?.trim() ? (
              <p className="flex items-start gap-2 text-sm text-amber-800">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Keine E-Mail beim Handwerker hinterlegt — bitte unter An eine Adresse eintragen.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Modal>
  )
}
