'use client'

import { useEffect, useState, useTransition } from 'react'
import { Eye, EyeOff, Send } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  getKundeInformierenMailDefaults,
  previewKundeInformierenMail,
  sendKundeInformierenMail,
  type KundeInformierenScope,
} from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'

export function KundeInformierenModal({
  open,
  onClose,
  auftragId,
  scope,
  defaultBetreff,
  defaultNachricht,
  kundeName,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  scope: KundeInformierenScope | null
  defaultBetreff: string
  defaultNachricht: string
  kundeName: string
}) {
  const [pending, startTransition] = useTransition()
  const [anrede, setAnrede] = useState<'du' | 'sie'>('sie')
  const [betreff, setBetreff] = useState(defaultBetreff)
  const [nachricht, setNachricht] = useState(defaultNachricht)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (!open) return
    setBetreff(defaultBetreff)
    setNachricht(defaultNachricht)
    setPreviewHtml(null)
    setShowPreview(false)
    void getKundeInformierenMailDefaults(auftragId).then((r) => {
      if (r.ok) setAnrede(r.defaultAnrede)
    })
  }, [open, auftragId, defaultBetreff, defaultNachricht])

  function loadPreview() {
    if (!scope || !betreff.trim() || !nachricht.trim()) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    startTransition(async () => {
      const r = await previewKundeInformierenMail({
        auftragId,
        scope,
        betreff,
        nachricht,
        anrede,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      setPreviewHtml(r.html)
      setShowPreview(true)
    })
  }

  function senden() {
    if (!scope || !betreff.trim() || !nachricht.trim()) {
      toast.error('Bitte Betreff und Nachricht ausfüllen.')
      return
    }
    startTransition(async () => {
      const r = await sendKundeInformierenMail({
        auftragId,
        scope,
        betreff,
        nachricht,
        anrede,
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('E-Mail an Kund:in gesendet')
      onClose()
    })
  }

  const scopeHint =
    scope?.type === 'phase'
      ? `Phase: ${scope.label}`
      : scope?.type === 'gewerk'
        ? `Gewerk: ${scope.gewerkName}`
        : scope?.type === 'leistung'
          ? `Leistung: ${scope.leistungName}`
          : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kunde informieren"
      size="lg"
      footer={
        <ModalFormFooter
          onCancel={onClose}
          onSubmit={senden}
          submitLabel="Senden"
          loading={pending}
          extra={
            <Button
              type="button"
              variant="secondary"
              className="w-full md:w-auto"
              loading={pending}
              onClick={() => (showPreview ? setShowPreview(false) : void loadPreview())}
            >
              {showPreview ? (
                <>
                  <EyeOff className="mr-1.5 h-4 w-4" aria-hidden />
                  Vorschau aus
                </>
              ) : (
                <>
                  <Eye className="mr-1.5 h-4 w-4" aria-hidden />
                  Vorschau
                </>
              )}
            </Button>
          }
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-bw-text-muted">
          Update an <strong>{kundeName}</strong>
          {scopeHint ? <> · {scopeHint}</> : null}. Notizen und Fotos des Abschnitts werden auf der
          Kunden-Statusseite angezeigt.
        </p>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={anrede === 'sie'} onChange={() => setAnrede('sie')} />
            Sie
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={anrede === 'du'} onChange={() => setAnrede('du')} />
            Du
          </label>
        </div>

        <Input label="Betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
        <Textarea
          label="Nachricht"
          rows={6}
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
        />

        {showPreview && previewHtml ? <CollapsibleMailPreview previewHtml={previewHtml} /> : null}
      </div>
    </Modal>
  )
}
