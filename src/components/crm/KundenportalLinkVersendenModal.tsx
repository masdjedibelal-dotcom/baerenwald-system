'use client'

import { useCallback, useEffect, useState } from 'react'
import { MockModal } from '@/components/mock-ui/MockModal'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockField } from '@/components/mock-ui/MockForm'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { toast } from '@/components/ui/app-toast'
import {
  getKundenPortalMailDraft,
  previewKundenPortalMail,
  sendKundenPortalLinkMail,
} from '@/app/actions/mails'
import { KUNDE_MAIL_BCC_HINT } from '@/lib/mail-constants'
import { parseEmailTokens } from '@/lib/email-recipients'

/**
 * Modal „Kundenportal-Link versenden“:
 * Vorschau + An/CC/Betreff/Text + Versenden (Kundenportal-Link).
 */
export function KundenportalLinkVersendenModal({
  open,
  onClose,
  kundeId,
  fallbackEmail,
}: {
  open: boolean
  onClose: () => void
  kundeId: string | null | undefined
  /** Wenn Draft keine Mail hat, z. B. Lead-Kontakt */
  fallbackEmail?: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [betreff, setBetreff] = useState('')
  const [text, setText] = useState('')
  const [html, setHtml] = useState('')
  const [portalLink, setPortalLink] = useState('')
  const [anrede, setAnrede] = useState<'du' | 'sie'>('du')

  const loadDraft = useCallback(async () => {
    if (!kundeId?.trim()) {
      toast.error('Kein Kunde verknüpft — Portal-Link nicht möglich.')
      onClose()
      return
    }
    setLoading(true)
    const draft = await getKundenPortalMailDraft(kundeId)
    setLoading(false)
    if (!draft.ok) {
      toast.error(draft.message)
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
    setAnrede(draft.anrede)
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
      toast.error('Kein Kunde verknüpft.')
      return
    }
    if (!mailTo.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse angeben.')
      return
    }
    setSending(true)
    const res = await sendKundenPortalLinkMail({
      kundeId,
      to: mailTo[0]!,
      cc: [...mailCc, ...mailTo.slice(1)],
      betreff: betreff.trim() || 'Dein Zugang zu MeinBärenwald',
      text,
      anrede,
    })
    setSending(false)
    if (!res.ok) {
      toast.error(res.message)
      return
    }
    toast.success('Kundenportal-Link versendet')
    onClose()
  }

  return (
    <MockModal
      open={open}
      onClose={onClose}
      icon="send"
      title="Kundenportal-Link versenden"
      sub="Einladung mit Login-Link und Vorschau"
      footer={
        <>
          <MockBtn sm kind="ghost" onClick={onClose} disabled={sending}>
            Abbrechen
          </MockBtn>
          <div style={{ flex: 1 }} />
          <MockBtn
            sm
            kind="primary"
            icon="send"
            disabled={sending || loading || !mailTo.length}
            onClick={() => void handleSend()}
          >
            {sending ? 'Wird gesendet…' : 'Versenden'}
          </MockBtn>
        </>
      }
    >
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
            hint={`Optional — ${KUNDE_MAIL_BCC_HINT}`}
            disabled={sending}
          />
          <MockField label="Betreff" full required>
            <input
              className="txt"
              value={betreff}
              onChange={(e) => setBetreff(e.target.value)}
              disabled={sending}
            />
          </MockField>
          <MockField label="Text" full>
            <textarea
              className="ta"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={sending}
            />
          </MockField>
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
                border: '0.5px solid var(--border)',
                borderRadius: 8,
                background: '#fff',
              }}
            />
          </div>
          {portalLink ? (
            <MockField label="Portal-Login" full hint="Button in der Mail führt auf diese Adresse.">
              <input className="txt" value={portalLink} readOnly />
            </MockField>
          ) : null}
        </div>
      )}
    </MockModal>
  )
}
