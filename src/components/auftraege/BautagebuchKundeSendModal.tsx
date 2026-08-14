'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useCallback, useEffect, useState } from 'react'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { MockBtn } from '@/components/mock-ui/MockPrimitives'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import {
  getBautagebuchMailDefaults,
  previewBautagebuchKundenMail,
  sendBautagebuchAnKunde,
} from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import { defaultBautagebuchKundenNachricht } from '@/lib/mail/bautagebuch-kunden-mail'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import type { AuftragBautagebuchEintrag } from '@/lib/types'

function VersandFooter({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="kunde-create-footer">
      <button type="button" className="btn ghost" onClick={() => requestClose?.()} disabled={pending}>
        Abbrechen
      </button>
      <MockBtn kind="primary" icon="send" disabled={pending} onClick={onSubmit}>
        {pending ? '…' : 'Senden'}
      </MockBtn>
    </div>
  )
}

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
        toast.error(r.message)
        return
      }
      setAnrede(r.defaultAnrede)
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
        toast.error(r.message)
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

  function onAnredeChange(next: AngebotMailAnrede) {
    if (!eintrag) return
    setAnrede(next)
    setNachricht(defaultBautagebuchKundenNachricht(next, eintrag, projektTitel || kundeName))
    setDirty(true)
  }

  function senden() {
    if (!eintrag || !betreff.trim() || !nachricht.trim()) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    if (!mailTo.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse in An angeben.')
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
        toast.error(r.message)
        return
      }
      toast.success('Eintrag veröffentlicht und E-Mail gesendet')
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
      footer={<VersandFooter pending={pending} onSubmit={senden} />}
    >
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
          dokumentLabel="Projekt-Update"
        />

        <div className="flex gap-4 border-b border-bw-border pb-4 text-[length:var(--fs-text)]">
          <label className="flex items-center gap-2">
            <input type="radio" checked={anrede === 'sie'} onChange={() => onAnredeChange('sie')} />
            Sie
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={anrede === 'du'} onChange={() => onAnredeChange('du')} />
            Du
          </label>
        </div>

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
          <Input
            value={betreff}
            onChange={(e) => {
              setBetreff(e.target.value)
              setDirty(true)
            }}
          />
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
          <Textarea
            plain
            rows={6}
            value={nachricht}
            onChange={(e) => {
              setNachricht(e.target.value)
              setDirty(true)
            }}
          />
        </KiAssistFieldLabel>
      </div>
    </EditorSheet>
  )
}
