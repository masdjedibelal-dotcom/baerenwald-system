'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
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
import { type MailComposeContext } from '@/lib/kommunikation/types'
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
      <EditorSheet
        open={open && !!ctx}
        onClose={onClose}
        title="Mail"
        context="detail"
        compose
        composeLabel="Senden"
        confirmBusy={pending}
        onConfirm={senden}
        size="lg"
      >
        {ctx ? (
          <div className="space-y-3">
            <EmailPillsField label="An" emails={to} onChange={setTo} placeholder="kunde@beispiel.de" />
            <EmailPillsField label="CC" emails={cc} onChange={setCc} placeholder="optional" />
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
                Vorlage
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
            <KiAssistFieldLabel
              label="Betreff"
              value={betreff}
              onApply={setBetreff}
              extraHint={`Kunden-Mail Betreff. Anrede: ${anrede}.`}
              multiline={false}
            >
              <Input value={betreff} onChange={(e) => setBetreff(e.target.value)} />
            </KiAssistFieldLabel>
            <KiAssistFieldLabel
              label="Nachricht"
              value={bodyHtml}
              onApply={setBodyHtml}
              extraHint={`Kunden-Mail Text. Anrede: ${anrede}.`}
            >
              <Textarea rows={8} value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
            </KiAssistFieldLabel>
            <CollapsibleMailPreview previewHtml={previewHtml} />
          </div>
        ) : null}
      </EditorSheet>

      <EditorSheet
        open={saveVorlageOpen}
        onClose={() => setSaveVorlageOpen(false)}
        title="Vorlage"
        context="detail"
        confirmBusy={pending}
        onConfirm={speichereVorlage}
        size="md"
      >
        <Input
          label="Name"
          value={vorlageName}
          onChange={(e) => setVorlageName(e.target.value)}
          placeholder="z. B. Terminbestätigung"
        />
      </EditorSheet>
    </>
  )
}
