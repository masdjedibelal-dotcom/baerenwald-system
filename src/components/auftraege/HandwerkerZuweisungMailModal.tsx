'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Link2 } from 'lucide-react'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { Input } from '@/components/ui/Input'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { toast } from '@/components/ui/app-toast'

export type HandwerkerZuweisungMailTarget = {
  handwerkerId: string
  handwerkerName: string
  gewerkName: string
  positionId?: string
  positionIds?: string[]
}

function MailFooter({
  pending,
  loading,
  canSend,
  portalLink,
  onSend,
  onCopyLink,
}: {
  pending: boolean
  loading: boolean
  canSend: boolean
  portalLink?: string
  onSend: () => void
  onCopyLink: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="sheet-footer-actions ldr-cta">
      <Button type="button" variant="secondary" onClick={() => requestClose?.()} disabled={pending}>
        Später
      </Button>
      {portalLink ? (
        <Button type="button" variant="secondary" onClick={() => void onCopyLink()}>
          <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
          Link kopieren
        </Button>
      ) : null}
      <Button type="button" variant="primary" loading={pending || loading} disabled={!canSend} onClick={onSend}>
        Jetzt senden
      </Button>
    </div>
  )
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
        betreff: json.betreff ?? 'Leistungsanfrage — Bärenwald Partner',
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
    if (!target || !mail) return
    if (!mail.to.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse unter An angeben.')
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
      router.refresh()
      onClose()
    })
  }

  async function copyPortalLink() {
    if (!mail?.portalLink) return
    try {
      await navigator.clipboard.writeText(mail.portalLink)
      toast.success('Portal-Link kopiert')
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
      confirmDisabled={!mail}
      footer={
        <MailFooter
          pending={pending}
          loading={loading}
          canSend={!!mail}
          portalLink={mail?.portalLink}
          onSend={sendNow}
          onCopyLink={copyPortalLink}
        />
      }
    >
      {loading ? (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">E-Mail-Vorschau wird geladen…</p>
      ) : mail && target ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[length:var(--fs-text)] text-amber-950">
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
          <Input
            label="Betreff"
            value={mail.betreff}
            onChange={(e) => {
              setMail((prev) => (prev ? { ...prev, betreff: e.target.value } : prev))
              setDirty(true)
            }}
          />
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
