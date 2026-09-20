'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useEffect, useMemo, useState } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import {
  buildHandwerkerAuftragNachricht,
  handwerkerAnfrageMailSubject,
  type HandwerkerNachrichtInput,
} from '@/lib/auftraege/handwerker-nachricht'
import { formatDatum } from '@/lib/utils'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

export type HandwerkerKontaktModalMode = 'whatsapp' | 'email'

/** Partner WhatsApp/Mail — EditorSheet Split-over (Mock Surface B). */
export function PartnerKontaktModal({
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
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [nachricht, setNachricht] = useState('')
  const [betreff, setBetreff] = useState('')
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [telefonDraft, setTelefonDraft] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setNachricht(buildHandwerkerAuftragNachricht(nachrichtInput))
    setBetreff(handwerkerAnfrageMailSubject(nachrichtInput.gewerkName))
    setMailTo(email?.trim() ? [email.trim()] : [])
    setMailCc([])
    setTelefonDraft(telefon?.trim() ?? '')
    setDirty(false)
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
      toast.success(TOAST.nachricht_kopiert)
    } catch {
      toast.error(TOAST.kopieren_nicht_moeglich)
    }
  }

  function openWhatsapp() {
    const digits = telefonDraft.replace(/\D/g, '')
    if (!digits) {
      applyFieldErrors({ _form: TOAST.bitte_telefonnummer_eingeben })
      return
    }
    if (!nachricht.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_nachricht_ausfuellen })
      return
    }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(nachricht)}`, '_blank', 'noopener,noreferrer')
  }

  function openMailApp() {
    if (!mailTo.length) {
      applyFieldErrors({ _form: TOAST.bitte_mindestens_eine_empfaenger_adresse_in_an_a })
      return
    }
    if (!betreff.trim() || !nachricht.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_betreff_und_nachricht_ausfuellen })
      return
    }
    const params = new URLSearchParams()
    if (mailCc.length) params.set('cc', mailCc.join(','))
    params.set('subject', betreff)
    params.set('body', nachricht)
    const to = mailTo.map(encodeURIComponent).join(',')
    window.location.href = `mailto:${to}?${params.toString()}`
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title={mode === 'whatsapp' ? 'WhatsApp' : 'E-Mail'}
      crumb={`${handwerkerName} >`}
      context="detail"
      dirty={dirty}
      size="lg"
      secondary={{ label: 'Abbrechen' }}
      primary={{
        label: mode === 'whatsapp' ? 'In WhatsApp öffnen' : 'In Mail-App öffnen',
        onClick: mode === 'whatsapp' ? openWhatsapp : openMailApp,
      }}
    >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              <div className="space-y-4">
        <div className="rounded-card border border-bw-border bg-bw-bg px-3 py-2.5 text-[length:var(--fs-text)]">
          <p className="text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
            Projektdaten
          </p>
          <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
            <div>
              <dt className="text-[length:var(--fs-meta)] text-bw-text-muted">Kunde</dt>
              <dd className="font-medium text-bw-text">{projektKurz.kunde}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--fs-meta)] text-bw-text-muted">Ort</dt>
              <dd className="font-medium text-bw-text">{projektKurz.ort}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--fs-meta)] text-bw-text-muted">Gewerk</dt>
              <dd className="font-medium text-bw-text">{projektKurz.gewerk}</dd>
            </div>
            <div>
              <dt className="text-[length:var(--fs-meta)] text-bw-text-muted">Zeitraum</dt>
              <dd className="font-medium text-bw-text">{projektKurz.zeitraum}</dd>
            </div>
          </dl>
        </div>

        {mode === 'whatsapp' ? (
          <>
            <MockField label="Telefon / WhatsApp" hint={telefon?.trim()
                  ? 'Nummer aus dem Partner-Stamm — bei Bedarf anpassen.'
                  : 'Nummer fehlt — bitte eintragen oder Text kopieren.'}><MockInput type="tel" value={telefonDraft} onChange={(e) => {
                setTelefonDraft(e.target.value)
                setDirty(true)
              }} placeholder="+49 …" /></MockField>
            <MockField label="Nachricht" hint="Enthält Kunde, Ort, Zeitraum, Gewerk und Leistungen — vor dem Senden anpassen."><RichTextEditor value={typeof (nachricht) === 'string' ? (nachricht) : ''} onChange={(__v) => {setNachricht(__v)
                setDirty(true)}} minHeight={336} className=" font-mono text-[length:var(--fs-text)]" aria-label="Nachricht" /></MockField>
          </>
        ) : (
          <>
            <AngebotWizardVersandEmpfaengerCard
              mailTo={mailTo}
              onMailToChange={(v) => {
                setMailTo(v)
                setDirty(true)
              }}
              mailCc={mailCc}
              onMailCcChange={(v) => {
                setMailCc(v)
                setDirty(true)
              }}
            />
            <MockField label="Betreff"><MockInput value={betreff} onChange={(e) => {
                setBetreff(e.target.value)
                setDirty(true)
              }} /></MockField>
            <MockField label="Nachricht" hint="Enthält die wichtigsten Projektdaten — vor dem Öffnen der Mail-App anpassen."><RichTextEditor value={typeof (nachricht) === 'string' ? (nachricht) : ''} onChange={(__v) => {setNachricht(__v)
                setDirty(true)}} minHeight={336} className=" font-mono text-[length:var(--fs-text)]" aria-label="Nachricht" /></MockField>
            {!email?.trim() ? (
              <p className="flex items-start gap-2 text-[length:var(--fs-text)] text-status-contact-text">
                <MockIcon n="mail" ctx="default" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Keine E-Mail beim Partner hinterlegt — bitte unter An eine Adresse eintragen.
              </p>
            ) : null}
          </>
        )}

        <MockBtn type="button" kind="secondary" onClick={() => void copyText(nachricht)}>
          <MockIcon n="copy" ctx="default" className="mr-1.5 h-4 w-4" aria-hidden />
          Text kopieren
        </MockBtn>
      </div>
    </EditorSheet>
  )
}
