'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Check } from 'lucide-react'
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
  downloadAbschlussdokumentationPdf,
  getAbschlussdokumentationMailDefaults,
  getAbschlussdokuVorschau,
  previewAbschlussdokumentationMail,
  sendAbschlussdokumentationAnKunde,
  type AbschlussdokuOptionen,
} from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { downloadPdfFromBase64 } from '@/lib/download-pdf-base64'
import { ABSCHLUSS_PROTOKOLL_TITEL } from '@/lib/auftraege/abschlussdokumentation-labels'
import { defaultAbschlussdokumentationNachricht } from '@/lib/mail/abschlussdokumentation-mail'
import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'
import { cn } from '@/lib/utils'

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
    handwerkerCount: 0,
  })
  const [optionen, setOptionen] = useState<AbschlussdokuOptionen>({
    mitBautagebuch: true,
    mitFotos: true,
    mitHandwerker: true,
    mitPreisen: false,
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
    void getAbschlussdokuVorschau(auftragId).then(setVorschau)
    void getAbschlussdokumentationMailDefaults(auftragId).then((r) => {
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
    setNachricht(defaultAbschlussdokumentationNachricht(next, projektTitel || kundeName))
  }

  function downloadPdf() {
    startTransition(async () => {
      const r = await downloadAbschlussdokumentationPdf(auftragId, optionen)
      if (!r.ok) toast.error(r.message)
      else {
        downloadPdfFromBase64(r.pdfBase64, r.filename)
        toast.success('PDF erstellt')
      }
    })
  }

  function senden() {
    if (!betreff.trim() || !nachricht.trim()) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    if (!mailTo.length) {
      toast.error('Bitte mindestens eine Empfänger-Adresse in An angeben.')
      return
    }
    startTransition(async () => {
      const r = await sendAbschlussdokumentationAnKunde(auftragId, optionen, {
        betreff,
        nachricht,
        anrede,
        to: mailTo,
        cc: mailCc.length ? mailCc : undefined,
      })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Abschlussdokumentation gesendet — Auftrag abgeschlossen')
        onDone()
        onClose()
      }
    })
  }

  const checklist = [
    { ok: true, label: 'Projektübersicht' },
    { ok: vorschau.positionenCount > 0, label: `Alle Positionen (${vorschau.positionenCount})` },
    {
      ok: optionen.mitBautagebuch && vorschau.bautagebuchCount > 0,
      label: `${ABSCHLUSS_PROTOKOLL_TITEL} (${vorschau.bautagebuchCount} Einträge)`,
      muted: !optionen.mitBautagebuch,
    },
    {
      ok: optionen.mitFotos && vorschau.fotoCount > 0,
      label: `Fotos (${vorschau.fotoCount})`,
      muted: !optionen.mitFotos,
    },
    {
      ok: vorschau.hasAbnahme,
      label: 'Abnahmeprotokoll',
      muted: !vorschau.hasAbnahme,
    },
    {
      ok: optionen.mitHandwerker && vorschau.handwerkerCount > 0,
      label: `Handwerker-Übersicht (${vorschau.handwerkerCount})`,
      muted: !optionen.mitHandwerker,
    },
  ]

  const flowFooter = (
    <ModalFormFooter
      onCancel={onClose}
      onSubmit={senden}
      submitLabel="Senden & abschließen"
      loading={pending}
      extra={
        <Button
          type="button"
          variant="secondary"
          className="w-full md:w-auto"
          loading={pending}
          onClick={downloadPdf}
        >
          PDF herunterladen
        </Button>
      }
    />
  )

  const body = (
    <>
      <p className="mb-3 text-sm text-bw-text-muted">
        Abschlussdokumentation für <strong>{kundeName}</strong> — PDF-Anhang und E-Mail an den Kunden.
      </p>

      <p className="mb-3 text-sm font-semibold text-bw-text">Enthalten im PDF</p>
      <ul className="mb-4 space-y-1.5">
        {checklist.map((c) => (
          <li
            key={c.label}
            className={cn(
              'flex items-center gap-2 text-[13px]',
              c.muted ? 'text-bw-text-muted' : 'text-bw-text'
            )}
          >
            <Check
              className={cn(
                'h-4 w-4 shrink-0',
                c.ok ? 'text-emerald-600' : c.muted ? 'text-bw-border' : 'text-bw-text-muted'
              )}
              aria-hidden
            />
            {c.label}
            {c.muted && !c.ok ? <span className="text-[11px]">(nicht vorhanden)</span> : null}
          </li>
        ))}
      </ul>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-bw-text-muted">PDF-Optionen</p>
      <div className="mb-5 space-y-2">
        {(
          [
            ['mitBautagebuch', `${ABSCHLUSS_PROTOKOLL_TITEL} einschließen`],
            ['mitFotos', 'Fotos einschließen'],
            ['mitHandwerker', 'Handwerker-Details'],
            ['mitPreisen', 'Preise anzeigen (intern)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={optionen[key]}
              onChange={(e) => setOptionen((o) => ({ ...o, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="border-t border-bw-border pt-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">E-Mail an Kunden</p>

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
          dokumentLabel="Abschlussdokumentation"
        />

        <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
        <Textarea
          label="Nachricht"
          plain
          rows={7}
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
          hint="Begrüßung und Google-Bewertung werden automatisch ergänzt — hier den Haupttext anpassen."
        />

        {previewHtml ? (
          <CollapsibleMailPreview previewHtml={previewHtml} />
        ) : mailReady ? (
          <p className="text-center text-[13px] text-bw-text-muted py-4">Vorschau wird geladen…</p>
        ) : null}
      </div>
    </>
  )

  if (presentation === 'flow') {
    return (
      <AuftragBaustelleScreen auftragId={auftragId} title="Abschlussdokumentation" footer={flowFooter}>
        {body}
      </AuftragBaustelleScreen>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Abschlussdokumentation" size="lg" footer={flowFooter}>
      {body}
    </Modal>
  )
}
