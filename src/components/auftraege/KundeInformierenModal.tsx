'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockInput } from '@/components/mock-ui/MockForm'
import { useEffect, useState } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { toast } from '@/components/ui/app-toast'
import { actionBusy } from '@/components/ui/action-busy'
import {
  getKundeInformierenMailDefaults,
  previewKundeInformierenMail,
  sendKundeInformierenMail,
  type KundeInformierenScope,
} from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
<<<<<<< Updated upstream
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'
=======

function InformierenFooter({
  pending,
  showPreview,
  onTogglePreview,
  onSend,
}: {
  pending: boolean
  showPreview: boolean
  onTogglePreview: () => void
  onSend: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="sheet-footer-actions ldr-cta">
      <MockBtn type="button" kind="secondary" onClick={() => requestClose?.()} disabled={pending}>
        Abbrechen
      </MockBtn>
      <MockBtn type="button" kind="secondary" loading={pending} onClick={onTogglePreview}>
        {showPreview ? (
          <>
            <EyeOff className="mr-1.5 h-4 w-4" aria-hidden />
            Vorschau aus
          </>
        ) : (
          <>
            <Eye className="mr-1.5 h-4 w-4" aria-hidden />
            Vorschau
          </>
        )}
      </MockBtn>
      <MockBtn type="button" kind="primary" loading={pending} onClick={onSend}>
        Senden
      </MockBtn>
    </div>
  )
}
>>>>>>> Stashed changes

/** Kunde informieren — EditorSheet Split-over (Mock Surface B). */
export function KundeInformierenModal({
  open,
  onClose,
  auftragId,
  scope,
  defaultBetreff,
  defaultNachricht,
  kundeName,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  scope: KundeInformierenScope | null
  defaultBetreff: string
  defaultNachricht: string
  kundeName: string
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, setPending] = useState(false)
  const [anrede, setAnrede] = useState<'du' | 'sie'>('sie')
  const [betreff, setBetreff] = useState(defaultBetreff)
  const [nachricht, setNachricht] = useState(defaultNachricht)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setBetreff(defaultBetreff)
    setNachricht(defaultNachricht)
    setPreviewHtml(null)
    setShowPreview(false)
    setDirty(false)
    void getKundeInformierenMailDefaults(auftragId).then((r) => {
      if (r.ok) setAnrede(r.defaultAnrede)
    })
  }, [open, auftragId, defaultBetreff, defaultNachricht])

  function loadPreview() {
    if (!scope || !betreff.trim() || !nachricht.trim() || pending) {
      if (!scope || !betreff.trim() || !nachricht.trim()) {
        applyFieldErrors({ _form: TOAST.bitte_betreff_und_nachricht_ausfuellen })
      }
      return
    }
    setPending(true)
    void actionBusy
      .run('Vorschau wird geladen…', async () => {
        const r = await previewKundeInformierenMail({
          auftragId,
          scope,
          betreff,
          nachricht,
          anrede,
        })
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        setPreviewHtml(r.html)
        setShowPreview(true)
      })
      .finally(() => setPending(false))
  }

  function senden() {
    if (!scope || !betreff.trim() || !nachricht.trim() || pending) {
      if (!scope || !betreff.trim() || !nachricht.trim()) {
        applyFieldErrors({ _form: TOAST.bitte_betreff_und_nachricht_ausfuellen })
      }
      return
    }
    setPending(true)
    void actionBusy
      .run('E-Mail wird gesendet…', async () => {
        const r = await sendKundeInformierenMail({
          auftragId,
          scope,
          betreff,
          nachricht,
          anrede,
        })
        if (!r.ok) {
          toast.systemError(r)
          throw new Error(r.message)
        }
        toast.success(TOAST.e_mail_an_kund_in_gesendet)
        setDirty(false)
        onClose()
      })
      .finally(() => setPending(false))
  }

  const scopeHint =
    scope?.type === 'phase'
      ? `Phase: ${scope.label}`
      : scope?.type === 'gewerk'
        ? `Gewerk: ${scope.gewerkName}`
        : scope?.type === 'leistung'
          ? `Leistung: ${scope.leistungName}`
          : ''

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Kunde informieren"
      crumb="Vor Ort >"
      context="detail"
      dirty={dirty}
      size="lg"
      compose
      composeLabel="Senden"
      onConfirm={senden}
      confirmBusy={pending}
      secondary={{ label: 'Abbrechen', disabled: pending }}
    >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              <div className="space-y-4">
        <p className="m-0 text-[length:var(--fs-text)] text-bw-text-muted">
          Update an <strong>{kundeName}</strong>
          {scopeHint ? <> · {scopeHint}</> : null}. Notizen und Fotos des Abschnitts werden auf der
          Kunden-Statusseite angezeigt.
        </p>

        <KiAssistFieldLabel
          label="Betreff"
          value={betreff}
          onApply={(text) => {
            setBetreff(text)
            setDirty(true)
          }}
          extraHint={`Kunde informieren · ${kundeName}`}
          multiline={false}
        >
          <MockInput value={betreff} onChange={(e) => {
              setBetreff(e.target.value)
              setDirty(true)
            }} />
        </KiAssistFieldLabel>
        <KiAssistFieldLabel
          label="Nachricht"
          value={nachricht}
          onApply={(text) => {
            setNachricht(text)
            setDirty(true)
          }}
          extraHint="Erscheint in Mail und auf der Kunden-Statusseite."
        >
          <RichTextEditor value={typeof (nachricht) === 'string' ? (nachricht) : ''} onChange={(__v) => {setNachricht(__v)
              setDirty(true)}} minHeight={144} />
        </KiAssistFieldLabel>

        <MockBtn
          type="button"
          kind="secondary"
          loading={pending}
          onClick={() => (showPreview ? setShowPreview(false) : void loadPreview())}
        >
          {showPreview ? (
            <>
              <MockIcon n="eye" ctx="default" className="mr-1.5 h-4 w-4" aria-hidden />
              Vorschau aus
            </>
          ) : (
            <>
              <MockIcon n="eye" ctx="default" className="mr-1.5 h-4 w-4" aria-hidden />
              Vorschau
            </>
          )}
        </MockBtn>

        {showPreview && previewHtml ? <CollapsibleMailPreview previewHtml={previewHtml} /> : null}
      </div>
    </EditorSheet>
  )
}
