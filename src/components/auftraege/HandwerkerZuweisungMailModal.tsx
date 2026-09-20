'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { useTransition } from '@/components/ui/action-busy'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { toast } from '@/components/ui/app-toast'
import { TOAST } from '@/lib/copy'
import { buildPartnerSubject } from '@/lib/mail/build-subject'
import { useFieldErrors } from '@/lib/validation/form-schema'

export type HandwerkerZuweisungMailTarget = {
  handwerkerId: string
  handwerkerName: string
  gewerkName: string
  positionId?: string
  positionIds?: string[]
}

/** Partner-Mail — EditorSheet Split-over (Mock Surface B). */
export function HandwerkerZuweisungMailModal({
  open,
  onClose,
  auftragId,
  target,
  onSent,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  target: HandwerkerZuweisungMailTarget | null
  onSent?: () => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const router = useRouter()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [mail, setMail] = useState<{
    betreff: string
    html: string
    to: string[]
    cc: string[]
    portalLink: string
  } | null>(null)

  useEffect(() => {
    if (!open || !target?.handwerkerId) {
      setMail(null)
      setDirty(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setMail(null)
    setDirty(false)
    void (async () => {
      const res = await fetch(`/api/auftraege/${auftragId}/partner-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handwerker_id: target.handwerkerId,
          position_id: target.positionId,
          position_ids: target.positionIds,
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
        portalLink?: string
      }
      if (cancelled) return
      setLoading(false)
      if (!res.ok || !json.html) {
        toast.error(json.error ?? 'E-Mail-Vorschau konnte nicht geladen werden')
        onCloseRef.current()
        return
      }
      setMail({
        betreff: json.betreff ?? buildPartnerSubject({ ereignis: 'Leistungsanfrage' }),
        html: json.html,
        to: (json.defaultTo ?? []).filter(Boolean),
        cc: (json.defaultCc ?? []).filter(Boolean),
        portalLink: json.portalLink ?? '',
      })
    })()
    return () => {
      cancelled = true
    }
  }, [open, target, auftragId])

  function sendNow() {
    if (!target) return
    if (!mail) {
      applyFieldErrors({ _form: 'Mail wird geladen…' })
      return
    }
    if (!mail.to.length) {
      applyFieldErrors({ _form: TOAST.bitte_mindestens_eine_empfaenger_adresse_unter_a })
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/auftraege/${auftragId}/partner-mail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handwerker_id: target.handwerkerId,
          position_id: target.positionId,
          position_ids: target.positionIds,
          send_email: true,
          betreff: mail.betreff,
          to: mail.to,
          cc: mail.cc,
        }),
      })
      const json = (await res.json()) as { error?: string; gesendet?: boolean }
      if (!res.ok) {
        toast.error(json.error ?? 'Versand fehlgeschlagen')
        return
      }
      toast.success(`Partner-Mail an ${target.handwerkerName} gesendet`)
      setDirty(false)
      onSent?.()
      afterServerActionRefresh()
      onClose()
    })
  }

  async function copyPortalLink() {
    if (!mail?.portalLink) return
    try {
      await navigator.clipboard.writeText(mail.portalLink)
      toast.success(TOAST.portal_link_kopiert)
    } catch {
      toast.message('Portal-Link', { description: mail.portalLink })
    }
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Partner-Mail"
      crumb={target ? `${target.handwerkerName} >` : null}
      context="detail"
      dirty={dirty}
      size="lg"
      compose
      composeLabel="Senden"
      onConfirm={sendNow}
      confirmBusy={pending || loading}
      confirmDisabled={pending || loading}
      secondary={{ label: 'Abbrechen', disabled: pending }}
    >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              {loading ? (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">E-Mail-Vorschau wird geladen…</p>
      ) : mail && target ? (
        <div className="space-y-3">
          <p className="rounded-card border border-status-contact-bg bg-status-contact-bg px-3 py-2 text-[length:var(--fs-text)] text-status-contact-text">
            Leistungsanfrage an den Partner. Bitte Text und Portal-Link prüfen und versenden (An / CC wie
            gewohnt).
          </p>
          <p className="text-[length:var(--fs-text)] text-bw-text-muted">
            Gewerk: <span className="font-medium text-bw-text">{target.gewerkName}</span>
            {target.positionIds && target.positionIds.length > 1 ? (
              <span className="text-bw-text-muted">
                {' '}
                · {target.positionIds.length} Leistungen in einer Anfrage
              </span>
            ) : null}
          </p>
          {mail.portalLink ? (
            <MockBtn type="button" kind="secondary" onClick={() => void copyPortalLink()}>
              <MockIcon n="link" ctx="default" className="mr-1.5 h-4 w-4" aria-hidden />
              Link kopieren
            </MockBtn>
          ) : null}
          <MockField label="Betreff"><MockInput value={mail.betreff} onChange={(e) => {
              setMail((prev) => (prev ? { ...prev, betreff: e.target.value } : prev))
              setDirty(true)
            }} /></MockField>
          <EmailPillsField
            label="An"
            required
            emails={mail.to}
            onChange={(emails) => {
              setMail((prev) => (prev ? { ...prev, to: emails } : prev))
              setDirty(true)
            }}
            placeholder="handwerker@beispiel.de"
          />
          <EmailPillsField
            label="CC"
            emails={mail.cc}
            onChange={(emails) => {
              setMail((prev) => (prev ? { ...prev, cc: emails } : prev))
              setDirty(true)
            }}
            placeholder="weitere@beispiel.de"
            hint="Optional."
          />
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            Versand über CRM (Resend) — inkl. Button zum Partner-Portal.
          </p>
          <CollapsibleMailPreview previewHtml={mail.html} />
        </div>
      ) : null}
    </EditorSheet>
  )
}
