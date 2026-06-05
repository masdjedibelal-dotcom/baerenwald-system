'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { EmailPillsField } from '@/components/ui/EmailPillsField'
import { toast } from '@/components/ui/app-toast'
import {
  getMailComposeDraft,
  loadKommunikationMailVorlagen,
  previewFreitextKundenMail,
  saveKommunikationMailVorlage,
  sendFreitextKundenMail,
  type KommunikationMailVorlage,
} from '@/app/(dashboard)/kommunikation/actions'
import { KOMMUNIKATION_KONTEXT_LABELS, type MailComposeContext } from '@/lib/kommunikation/types'
import type { MailAnrede } from '@/lib/mail/anrede'
import { parseEmailTokens } from '@/lib/email-recipients'

export function KundenMailComposeModal({
  open,
  onClose,
  ctx,
  onSent,
}: {
  open: boolean
  onClose: () => void
  ctx: MailComposeContext | null
  onSent?: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [to, setTo] = useState<string[]>([])
  const [cc, setCc] = useState<string[]>([])
  const [betreff, setBetreff] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [anrede, setAnrede] = useState<MailAnrede>('du')
  const [previewHtml, setPreviewHtml] = useState('')
  const [vorlagen, setVorlagen] = useState<KommunikationMailVorlage[]>([])
  const [vorlageId, setVorlageId] = useState('')
  const [saveVorlageOpen, setSaveVorlageOpen] = useState(false)
  const [vorlageName, setVorlageName] = useState('')

  const kontextLabel = ctx ? KOMMUNIKATION_KONTEXT_LABELS[ctx.kontextTyp] : ''

  useEffect(() => {
    if (!open || !ctx) return
    startTransition(async () => {
      const [draft, vList] = await Promise.all([
        getMailComposeDraft(ctx),
        loadKommunikationMailVorlagen(ctx.kontextTyp),
      ])
      setVorlagen(vList)
      setVorlageId('')
      if (!draft.ok) {
        toast.error(draft.message)
        return
      }
      setTo(parseEmailTokens(draft.to))
      setCc(draft.cc)
      setBetreff(draft.betreff)
      setBodyHtml(draft.bodyHtml)
      setAnrede(draft.anrede)
      setPreviewHtml('')
    })
  }, [open, ctx])

  useEffect(() => {
    if (!open || !ctx) return
    const timer = setTimeout(() => {
      void previewFreitextKundenMail({ ctx, betreff, bodyHtml, anrede }).then((res) => {
        if (res.ok) setPreviewHtml(res.html)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [open, ctx, betreff, bodyHtml, anrede])

  const vorlageOptions = useMemo(
    () => [
      { value: '', label: 'Vorlage wählen…' },
      ...vorlagen.map((v) => ({ value: v.id, label: v.name })),
    ],
    [vorlagen]
  )

  function applyVorlage(id: string) {
    setVorlageId(id)
    const v = vorlagen.find((x) => x.id === id)
    if (!v) return
    if (v.betreff.trim()) setBetreff(v.betreff)
    if (v.body_text.trim()) setBodyHtml(v.body_text)
  }

  function senden() {
    if (!ctx) return
    const toJoined = to.join('; ')
    startTransition(async () => {
      const res = await sendFreitextKundenMail({
        ctx,
        to: toJoined,
        cc,
        betreff,
        bodyHtml,
        anrede,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('E-Mail gesendet')
      onClose()
      onSent?.()
    })
  }

  function speichereVorlage() {
    if (!ctx || !vorlageName.trim()) return
    startTransition(async () => {
      const res = await saveKommunikationMailVorlage({
        name: vorlageName,
        kontext_typ: ctx.kontextTyp,
        betreff,
        body_text: bodyHtml,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Vorlage gespeichert')
      setSaveVorlageOpen(false)
      setVorlageName('')
      const vList = await loadKommunikationMailVorlagen(ctx.kontextTyp)
      setVorlagen(vList)
    })
  }

  return (
    <>
      <Modal
        open={open && !!ctx}
        onClose={onClose}
        title={`E-Mail schreiben${kontextLabel ? ` · ${kontextLabel}` : ''}`}
        size="lg"
        footer={
          <ModalFormFooter
            onCancel={onClose}
            onSubmit={senden}
            submitLabel="Senden"
            loading={pending}
          />
        }
      >
        {ctx ? (
          <div className="space-y-3">
            <EmailPillsField label="An" emails={to} onChange={setTo} placeholder="kunde@beispiel.de" />
            <EmailPillsField label="CC (optional)" emails={cc} onChange={setCc} placeholder="team@baerenwald.de" />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Select
                  label="Vorlage"
                  name="mail-vorlage"
                  value={vorlageId}
                  onChange={(e) => applyVorlage(e.target.value)}
                  options={vorlageOptions}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={() => setSaveVorlageOpen(true)}
              >
                <Save className="h-3.5 w-3.5" aria-hidden />
                Als Vorlage speichern
              </Button>
            </div>
            <Select
              label="Anrede"
              name="mail-anrede"
              value={anrede}
              onChange={(e) => setAnrede(e.target.value === 'sie' ? 'sie' : 'du')}
              options={[
                { value: 'du', label: 'Du' },
                { value: 'sie', label: 'Sie' },
              ]}
            />
            <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
            <Textarea
              label="Nachricht"
              rows={8}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
            <CollapsibleMailPreview previewHtml={previewHtml} />
            <p className="text-xs text-bw-text-muted">
              Anrede und Team-Gruß werden automatisch ergänzt. Antworten des Kunden werden dem Thread
              zugeordnet, sobald Resend-Inbound aktiv ist.
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={saveVorlageOpen}
        onClose={() => setSaveVorlageOpen(false)}
        title="Vorlage speichern"
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setSaveVorlageOpen(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={speichereVorlage}>
              Speichern
            </Button>
          </div>
        }
      >
        <Input
          label="Name der Vorlage"
          value={vorlageName}
          onChange={(e) => setVorlageName(e.target.value)}
          placeholder="z. B. Terminbestätigung"
        />
      </Modal>
    </>
  )
}
