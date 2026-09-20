'use client'

import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { C } from '@/lib/tokens/colors'

import { useCallback, useEffect, useState } from 'react'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { toast } from '@/components/ui/app-toast'
import {
  getKundenPortalMailDraft,
  previewKundenPortalMail,
  sendKundenPortalLinkMail,
} from '@/app/actions/mails'
import { parseEmailTokens } from '@/lib/email-recipients'
import { TOAST } from '@/lib/copy'
import { defaultPortalInviteBetreff } from '@/lib/portal-utils'
import { useFieldErrors } from '@/lib/validation/form-schema'

/**
 * Modal „Kundenportal-Link versenden“:
 * Vorschau + An/CC/Betreff/Text + Versenden (Kundenportal-Link).
 */
export function KundenportalLinkVersendenModal({
  open,
  onClose,
  kundeId,
  fallbackEmail,
  onSent,
}: {
  open: boolean
  onClose: () => void
  kundeId: string | null | undefined
  /** Wenn Draft keine Mail hat, z. B. Lead-Kontakt */
  fallbackEmail?: string | null
  /** Nach erfolgreichem Versand (z. B. Stammdaten-Portal-Zeile → „eingeladen“) */
  onSent?: () => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [betreff, setBetreff] = useState('')
  const [text, setText] = useState('')
  const [html, setHtml] = useState('')
  const [portalLink, setPortalLink] = useState('')
  const [anrede, setAnrede] = useState<'du' | 'sie'>('sie')

  const loadDraft = useCallback(async () => {
    if (!kundeId?.trim()) {
      toast.error(TOAST.kein_kunde_verknuepft_portal_link_nicht_moeglich)
      onClose()
      return
    }
    setLoading(true)
    const draft = await getKundenPortalMailDraft(kundeId)
    setLoading(false)
    if (!draft.ok) {
      toast.systemError(draft)
      onClose()
      return
    }
    const to =
      draft.to.trim() ||
      (fallbackEmail?.trim() ? parseEmailTokens(fallbackEmail)[0] ?? '' : '')
    setMailTo(to ? [to] : [])
    setMailCc(draft.cc.filter(Boolean))
    setBetreff(draft.betreff)
    setText(draft.text)
    setHtml(draft.html)
    setPortalLink(draft.portalLink)
    setAnrede('sie')
  }, [kundeId, fallbackEmail, onClose])

  useEffect(() => {
    if (!open) return
    void loadDraft()
  }, [open, loadDraft])

  useEffect(() => {
    if (!open || !kundeId?.trim() || loading) return
    const timer = setTimeout(() => {
      void (async () => {
        const preview = await previewKundenPortalMail({
          kundeId: kundeId!,
          text,
          anrede,
        })
        if (preview.ok) setHtml(preview.html)
      })()
    }, 350)
    return () => clearTimeout(timer)
  }, [open, kundeId, text, anrede, loading])

  async function handleSend() {
    if (!kundeId?.trim()) {
      toast.error(TOAST.kein_kunde_verknuepft)
      return
    }
    if (!mailTo.length) {
      applyFieldErrors({ _form: TOAST.bitte_mindestens_eine_empfaenger_adresse_angeben })
      return
    }
    setSending(true)
    const res = await sendKundenPortalLinkMail({
      kundeId,
      to: mailTo[0]!,
      cc: [...mailCc, ...mailTo.slice(1)],
      betreff: betreff.trim() || defaultPortalInviteBetreff('du'),
      text,
      anrede,
    })
    setSending(false)
    if (!res.ok) {
      toast.systemError(res)
      return
    }
    toast.success(TOAST.kundenportal_link_versendet)
    onSent?.()
    onClose()
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Kundenportal-Link versenden"
      subtitle="Einladung mit Login-Link und Vorschau"
      secondary={{ label: 'Abbrechen', onClick: onClose, disabled: sending, kind: 'ghost' }}
      primary={{
        label: sending ? 'Wird gesendet…' : 'Versenden',
        onClick: () => void handleSend(),
        disabled: sending || loading || !mailTo.length,
        busy: sending,
      }}
    >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          Vorschau wird geladen…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <EmailPillsField
            label="An"
            required
            emails={mailTo}
            onChange={setMailTo}
            placeholder="kunde@beispiel.de"
            disabled={sending}
          />
          <EmailPillsField
            label="CC"
            emails={mailCc}
            onChange={setMailCc}
            placeholder="weitere@beispiel.de"
            disabled={sending}
          />
          <KiAssistFieldLabel
            label="Betreff"
            value={betreff}
            onApply={setBetreff}
            extraHint={`Portal-Einladung. Anrede: ${anrede}.`}
            multiline={false}
            required
            disabled={sending}
          >
            <MockInput className="txt" value={betreff} onChange={(e) => setBetreff(e.target.value)} disabled={sending} />
          </KiAssistFieldLabel>
          <KiAssistFieldLabel
            label="Text"
            value={text}
            onApply={setText}
            extraHint="Portal-Einladungsmail an den Kunden."
            disabled={sending}
          >
            <MockTextarea className="ta" rows={5} value={text} onChange={(e) => setText(e.target.value)} disabled={sending} />
          </KiAssistFieldLabel>
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Mail-Vorschau
            </div>
            <iframe
              title="Kundenportal Mail-Vorschau"
              sandbox="allow-same-origin"
              srcDoc={html}
              style={{
                width: '100%',
                height: 280,
                border: '0.03125rem solid var(--border)',
                borderRadius: 8,
                background: C.white,
              }}
            />
          </div>
          {portalLink ? (
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>
                Portal-Login
              </div>
              <MockInput className="txt" value={portalLink} readOnly />
              <p className="field-hint" style={{ marginTop: 6 }}>
                Button in der Mail führt auf diese Adresse.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </EditorSheet>
  )
}
