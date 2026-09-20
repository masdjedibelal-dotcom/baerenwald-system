'use client'
import { MockField, MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'
import { useCallback, useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { toast } from '@/components/ui/app-toast'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import {
  getBautagebuchMailDefaults,
  previewBautagebuchKundenMail,
  sendBautagebuchAnKunde,
} from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { AuftragBautagebuchEintrag } from '@/lib/types'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

/** Bautagebuch an Kunden — EditorSheet Split-over (Mock Surface B). */
export function BautagebuchKundeSendModal({
  open,
  onClose,
  auftragId,
  eintrag,
  kundeName,
  onSent,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  eintrag: AuftragBautagebuchEintrag | null
  kundeName: string
  onSent: () => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useTransition()
  const [anrede, setAnrede] = useState<AngebotMailAnrede>('sie')
  const [projektTitel, setProjektTitel] = useState('')
  const [betreff, setBetreff] = useState('')
  const [nachricht, setNachricht] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [mailReady, setMailReady] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open || !eintrag) return
    setPreviewHtml(null)
    setMailReady(false)
    setDirty(false)
    void getBautagebuchMailDefaults(auftragId, eintrag.id).then((r) => {
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      setAnrede('sie')
      setBetreff(r.defaultBetreff)
      setNachricht(r.defaultNachricht)
      setProjektTitel(r.projektTitel)
      setMailTo(r.defaultTo)
      setMailCc([])
      setMailReady(true)
    })
  }, [open, auftragId, eintrag])

  const refreshPreview = useCallback(() => {
    if (!mailReady || !eintrag || !betreff.trim() || !nachricht.trim()) return
    startTransition(async () => {
      const r = await previewBautagebuchKundenMail({
        auftragId,
        eintragId: eintrag.id,
        betreff,
        nachricht,
        anrede,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      setPreviewHtml(r.html)
      if (mailTo.length === 0 && r.defaultTo.length) setMailTo(r.defaultTo)
      if (mailCc.length === 0 && r.defaultCc.length) setMailCc(r.defaultCc)
    })
  }, [mailReady, betreff, nachricht, anrede, auftragId, eintrag, mailTo.length, mailCc.length])

  useEffect(() => {
    if (!open || !mailReady) return
    refreshPreview()
  }, [open, mailReady, betreff, nachricht, anrede, refreshPreview])

  function senden() {
    if (!eintrag || !betreff.trim() || !nachricht.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_betreff_und_nachricht_ausfuellen })
      return
    }
    if (!mailTo.length) {
      applyFieldErrors({ _form: TOAST.bitte_mindestens_eine_empfaenger_adresse_in_an_a })
      return
    }
    startTransition(async () => {
      const r = await sendBautagebuchAnKunde({
        auftragId,
        eintragId: eintrag.id,
        betreff,
        nachricht,
        anrede,
        to: mailTo,
        cc: mailCc.length ? mailCc : undefined,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.eintrag_veroeffentlicht_und_e_mail_gesendet)
      setDirty(false)
      onSent()
      onClose()
    })
  }

  if (!eintrag) return null

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Versand"
      crumb="Bautagebuch >"
      context="detail"
      dirty={dirty}
      size="lg"
      compose
      composeLabel="Senden"
      onConfirm={senden}
      confirmBusy={pending}
      secondary={{ label: 'Abbrechen', disabled: pending, kind: 'ghost' }}
    >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              <div className="space-y-4">
        <p className="m-0 text-[length:var(--fs-text)] text-bw-text-muted">
          <strong>{eintrag.titel}</strong> · {kundeName}
        </p>

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
          disabled={pending}
        />

        <KiAssistFieldLabel
          label="Betreff"
          value={betreff}
          onApply={(text) => {
            setBetreff(text)
            setDirty(true)
          }}
          extraHint={`Bautagebuch-Mail an ${kundeName}.`}
          multiline={false}
        >
          <MockInput value={betreff} onChange={(e) => {
              setBetreff(e.target.value)
              setDirty(true)
            }} />
        </KiAssistFieldLabel>

        {previewHtml ? (
          <CollapsibleMailPreview previewHtml={previewHtml} />
        ) : mailReady ? (
          <p className="py-6 text-center text-[length:var(--fs-text)] text-bw-text-muted">
            E-Mail-Vorschau wird geladen…
          </p>
        ) : null}

        <KiAssistFieldLabel
          label="Nachricht"
          value={nachricht}
          onApply={(text) => {
            setNachricht(text)
            setDirty(true)
          }}
          extraHint={`Bautagebuch-Mailtext. Anrede: ${anrede}.`}
        >
          <MockTextarea rows={6} value={nachricht} onChange={(e) => {
              setNachricht(e.target.value)
              setDirty(true)
            }} className="resize-y py-2 min-h-[120px]" />
        </KiAssistFieldLabel>
      </div>
    </EditorSheet>
  )
}
