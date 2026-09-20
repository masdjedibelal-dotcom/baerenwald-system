'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'
import { Combobox } from '@/components/ui/Combobox'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useEffect, useMemo, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
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
import { TOAST } from '@/lib/copy'

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
  const [anrede] = useState<MailAnrede>('sie')
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
        toast.systemError(draft)
        return
      }
      setTo(parseEmailTokens(draft.to))
      setCc(draft.cc)
      setBetreff(draft.betreff)
      setBodyHtml(draft.bodyHtml)
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
        toast.systemError(res)
        return
      }
      toast.success(TOAST.emailGesendet)
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
        toast.systemError(res)
        return
      }
      toast.success(TOAST.vorlage_gespeichert)
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
                <Combobox label="Vorlage" id="mail-vorlage" name="mail-vorlage" options={vorlageOptions} value={vorlageId == null ? '' : String(vorlageId)} placeholder="Auswählen…" onChange={(next) => { applyVorlage(next); }} />
              </div>
              <MockBtn
                type="button"
                kind="secondary"
                className="shrink-0"
                onClick={() => setSaveVorlageOpen(true)}
              >
                <MockIcon n="device-floppy" ctx="default" className="h-3.5 w-3.5" aria-hidden />
                Vorlage
              </MockBtn>
            </div>
            <KiAssistFieldLabel
              label="Betreff"
              value={betreff}
              onApply={setBetreff}
              extraHint="Kunden-Mail Betreff (Sie-Anrede)."
              multiline={false}
            >
              <MockInput value={betreff} onChange={(e) => setBetreff(e.target.value)} />
            </KiAssistFieldLabel>
            <KiAssistFieldLabel
              label="Nachricht"
              value={bodyHtml}
              onApply={setBodyHtml}
              extraHint="Kunden-Mail Text (Sie-Anrede)."
            >
              <RichTextEditor value={typeof (bodyHtml) === 'string' ? (bodyHtml) : ''} onChange={(__v) => setBodyHtml(__v)} minHeight={192} />
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
        <MockField label="Name"><MockInput value={vorlageName} onChange={(e) => setVorlageName(e.target.value)} placeholder="z. B. Terminbestätigung" /></MockField>
      </EditorSheet>
    </>
  )
}
