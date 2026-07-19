'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AuftragBaustelleScreen } from '@/components/auftraege/AuftragBaustelleScreen'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { AngebotWizardVersandEmpfaengerCard } from '@/components/angebote/AngebotWizardVersandEmpfaengerCard'
import {
  finalizeAbschlussdokumentationOhneMail,
  getAbschlussdokumentationMailDefaults,
  getAbschlussdokuVorschau,
  previewAbschlussdokumentationMail,
  sendAbschlussdokumentationAnKunde,
  type AbschlussVersandAuswahl,
  type AbschlussdokuOptionen,
} from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { defaultAbschlussdokumentationNachricht } from '@/lib/mail/abschlussdokumentation-mail'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import { cn } from '@/lib/utils'

type VersandDoc = {
  key: keyof AbschlussVersandAuswahl
  label: string
  ready: boolean
  hint: string
}

/** Modal „Auftrag abschließen“ mit Auswahl An Kunde versenden. */
export function AbschlussdokumentationModal({
  open,
  onClose,
  auftragId,
  kundeName,
  onDone,
  presentation = 'modal',
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  kundeName: string
  onDone: () => void
  presentation?: 'modal' | 'flow'
}) {
  const active = presentation === 'flow' || open
  const [pending, startTransition] = useTransition()
  const [vorschau, setVorschau] = useState({
    positionenCount: 0,
    bautagebuchCount: 0,
    fotoCount: 0,
    hasAbnahme: false,
    hasAbschlussbericht: false,
    hasRechnung: false,
    rechnungsnummer: null as string | null,
    hasKundeEmail: false,
    abschlussUrl: null as string | null,
  })
  const [optionen] = useState<AbschlussdokuOptionen>({
    mitBautagebuch: true,
    mitFotos: true,
    mitPreisen: true,
  })
  const [versand, setVersand] = useState<AbschlussVersandAuswahl>({
    abnahmeprotokoll: false,
    abschlussbericht: false,
    rechnung: false,
  })
  const [anrede, setAnrede] = useState<AngebotMailAnrede>('sie')
  const [projektTitel, setProjektTitel] = useState(kundeName)
  const [betreff, setBetreff] = useState('')
  const [nachricht, setNachricht] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [mailTo, setMailTo] = useState<string[]>([])
  const [mailCc, setMailCc] = useState<string[]>([])
  const [mailReady, setMailReady] = useState(false)

  useEffect(() => {
    if (!active) return
    setPreviewHtml(null)
    setMailReady(false)
    void getAbschlussdokuVorschau(auftragId).then((v) => {
      setVorschau(v)
      setVersand({
        abnahmeprotokoll: v.hasAbnahme,
        abschlussbericht: v.hasAbschlussbericht,
        rechnung: v.hasRechnung,
      })
    })
    void getAbschlussdokumentationMailDefaults(auftragId).then((r) => {
      if (!r.ok) return
      setAnrede(r.defaultAnrede)
      setBetreff(r.defaultBetreff)
      setNachricht(r.defaultNachricht)
      setProjektTitel(r.projektTitel)
      setMailTo(r.defaultTo)
      setMailCc([])
      setMailReady(true)
    })
  }, [active, auftragId])

  const refreshPreview = useCallback(
    (openPreview = false) => {
      if (!mailReady || !betreff.trim() || !nachricht.trim()) return
      startTransition(async () => {
        const r = await previewAbschlussdokumentationMail({
          auftragId,
          betreff,
          nachricht,
          anrede,
        })
        if (!r.ok) {
          if (openPreview) toast.error(r.message)
          return
        }
        setPreviewHtml(r.html)
        if (mailTo.length === 0 && r.defaultTo.length) setMailTo(r.defaultTo)
        if (mailCc.length === 0 && r.defaultCc.length) setMailCc(r.defaultCc)
      })
    },
    [mailReady, betreff, nachricht, anrede, auftragId, mailTo.length, mailCc.length]
  )

  useEffect(() => {
    if (!active || !mailReady) return
    refreshPreview(false)
  }, [active, mailReady, betreff, nachricht, anrede, refreshPreview])

  function onAnredeChange(next: AngebotMailAnrede) {
    setAnrede(next)
    setNachricht(
      defaultAbschlussdokumentationNachricht(next, projektTitel || kundeName, {
        hasAbnahme: vorschau.hasAbnahme,
        hasRechnung: vorschau.hasRechnung,
      })
    )
  }

  const docs: VersandDoc[] = [
    {
      key: 'abnahmeprotokoll',
      label: 'Abnahmeprotokoll',
      ready: vorschau.hasAbnahme,
      hint: 'Noch kein PDF — wird nicht mitgesendet',
    },
    {
      key: 'abschlussbericht',
      label: 'Abschlussbericht',
      ready: vorschau.hasAbschlussbericht,
      hint: 'Noch nicht erstellt — wird nicht mitgesendet',
    },
    {
      key: 'rechnung',
      label: vorschau.rechnungsnummer
        ? `Rechnung (${vorschau.rechnungsnummer})`
        : 'Rechnung',
      ready: vorschau.hasRechnung,
      hint: 'Noch nicht erstellt — wird nicht mitgesendet',
    },
  ]

  const selectedReady = docs.filter((d) => d.ready && versand[d.key])
  const willSendMail = selectedReady.length > 0 && mailReady && mailTo.length > 0

  function abschliessenUndVersenden() {
    if (willSendMail && (!betreff.trim() || !nachricht.trim())) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    if (willSendMail && !mailTo.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse in An angeben.')
      return
    }

    startTransition(async () => {
      if (!willSendMail) {
        const r = await finalizeAbschlussdokumentationOhneMail(auftragId)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
        const skipped = docs.filter((d) => !d.ready).map((d) => d.label)
        toast.success(
          skipped.length
            ? `Auftrag abgeschlossen (ohne Versand — fehlt: ${skipped.join(', ')})`
            : 'Auftrag abgeschlossen'
        )
        onDone()
        onClose()
        return
      }

      const r = await sendAbschlussdokumentationAnKunde(
        auftragId,
        optionen,
        {
          betreff,
          nachricht,
          anrede,
          to: mailTo,
          cc: mailCc.length ? mailCc : undefined,
        },
        {
          abnahmeprotokoll: versand.abnahmeprotokoll && vorschau.hasAbnahme,
          abschlussbericht: versand.abschlussbericht && vorschau.hasAbschlussbericht,
          rechnung: versand.rechnung && vorschau.hasRechnung,
        }
      )
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      if (r.closedWithoutMail || r.sentLabels.length === 0) {
        toast.success('Auftrag abgeschlossen (keine Unterlagen versendet)')
      } else {
        toast.success(`Abgeschlossen & versendet: ${r.sentLabels.join(', ')}`)
      }
      onDone()
      onClose()
    })
  }

  const flowFooter = (
    <ModalFormFooter
      onCancel={onClose}
      onSubmit={abschliessenUndVersenden}
      submitLabel="Abschließen & versenden"
      loading={pending}
      submitDisabled={false}
      extra={
        willSendMail ? null : (
          <p className="w-full text-[11px] text-bw-text-muted md:w-auto">
            Ohne fertige Unterlagen / E-Mail wird nur abgeschlossen.
          </p>
        )
      }
    />
  )

  const body = (
    <>
      <p className="mb-4 text-sm text-bw-text-muted">
        Auftrag für <strong>{kundeName}</strong> abschließen. Wähle, welche fertigen Unterlagen
        an den Kunden gehen — fehlende bleiben deaktiviert.
      </p>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
        An Kunde versenden
      </p>
      <div className="mb-5 space-y-2 rounded-lg border border-bw-border bg-bw-bg-soft/40 p-3">
        {docs.map((d) => (
          <label
            key={d.key}
            className={cn(
              'flex flex-col gap-0.5 rounded-md px-2 py-2 text-sm',
              d.ready ? 'text-bw-text' : 'text-bw-text-muted opacity-80'
            )}
          >
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                disabled={!d.ready || pending}
                checked={d.ready && versand[d.key]}
                onChange={(e) =>
                  setVersand((v) => ({ ...v, [d.key]: e.target.checked }))
                }
              />
              <span className="font-medium">{d.label}</span>
            </span>
            {!d.ready ? (
              <span className="pl-6 text-[11px] text-bw-text-muted">{d.hint}</span>
            ) : null}
          </label>
        ))}
      </div>

      {mailReady ? (
        <div className="border-t border-bw-border pt-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">
            E-Mail an Kunden
          </p>

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={anrede === 'sie'} onChange={() => onAnredeChange('sie')} />
              Sie
            </label>
            <label className="flex items-center gap-1.5">
              <input type="radio" checked={anrede === 'du'} onChange={() => onAnredeChange('du')} />
              Du
            </label>
          </div>

          <AngebotWizardVersandEmpfaengerCard
            mailTo={mailTo}
            onMailToChange={setMailTo}
            mailCc={mailCc}
            onMailCcChange={setMailCc}
            disabled={pending}
            dokumentLabel="Abschluss"
          />

          <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
          <Textarea
            label="Nachricht"
            plain
            rows={6}
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
            hint="Begrüßung und Google-Bewertung werden automatisch ergänzt."
          />

          {previewHtml ? (
            <CollapsibleMailPreview previewHtml={previewHtml} />
          ) : (
            <p className="py-3 text-center text-[13px] text-bw-text-muted">Vorschau wird geladen…</p>
          )}
        </div>
      ) : (
        <p className="border-t border-bw-border pt-4 text-sm text-bw-text-muted">
          Keine Kunden-E-Mail hinterlegt — Versand nicht möglich. Du kannst den Auftrag trotzdem
          abschließen.
        </p>
      )}
    </>
  )

  if (presentation === 'flow') {
    return (
      <AuftragBaustelleScreen auftragId={auftragId} title="Auftrag abschließen" footer={flowFooter}>
        {body}
      </AuftragBaustelleScreen>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Auftrag abschließen" size="lg" footer={flowFooter}>
      {body}
    </Modal>
  )
}
