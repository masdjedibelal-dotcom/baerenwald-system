'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
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

  useEffect(() => {
    if (!open || !eintrag) return
    setPreviewHtml(null)
    setMailReady(false)
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

  const refreshPreview = useCallback(
    () => {
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
    },
    [mailReady, betreff, nachricht, anrede, auftragId, eintrag, mailTo.length, mailCc.length]
  )

  useEffect(() => {
    if (!open || !mailReady) return
    refreshPreview()
  }, [open, mailReady, betreff, nachricht, anrede, refreshPreview])

  function onAnredeChange(next: AngebotMailAnrede) {
    if (!eintrag) return
    setAnrede(next)
    setNachricht(defaultBautagebuchKundenNachricht(next, eintrag, projektTitel || kundeName))
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
      onSent()
      onClose()
    })
  }

  if (!eintrag) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kunden-Vorschau & versenden"
      size="lg"
      footer={
        <ModalFormFooter
          onCancel={onClose}
          onSubmit={senden}
          submitLabel="Veröffentlichen & senden"
          loading={pending}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-bw-text-muted">
          <strong>{eintrag.titel}</strong> — E-Mail an <strong>{kundeName}</strong> mit Gewerk-Phase und
          Bautagebuch-Update.
        </p>

        <AngebotWizardVersandEmpfaengerCard
          mailTo={mailTo}
          onMailToChange={setMailTo}
          mailCc={mailCc}
          onMailCcChange={setMailCc}
          disabled={pending}
          dokumentLabel="Projekt-Update"
        />

        <div className="flex gap-4 border-b border-bw-border pb-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={anrede === 'sie'} onChange={() => onAnredeChange('sie')} />
            Sie
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={anrede === 'du'} onChange={() => onAnredeChange('du')} />
            Du
          </label>
        </div>

        <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />

        {previewHtml ? (
          <CollapsibleMailPreview previewHtml={previewHtml} />
        ) : mailReady ? (
          <p className="py-6 text-center text-[13px] text-bw-text-muted">E-Mail-Vorschau wird geladen…</p>
        ) : null}

        <Textarea
          label="Nachricht"
          plain
          rows={6}
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
          hint="Begrüßung, Gewerk-Phase und Update werden automatisch ergänzt — hier den Fließtext anpassen."
        />
      </div>
    </Modal>
  )
}
