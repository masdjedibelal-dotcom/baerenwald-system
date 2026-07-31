'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { EditorSheet, useEditorSheetRequestClose } from '@/components/surfaces/EditorSheet'
import { KiAssistFieldLabel } from '@/components/assistent/KiAssistFieldLabel'
import { Button } from '@/components/ui/Button'
import { CollapsibleMailPreview } from '@/components/ui/CollapsibleMailPreview'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import {
  getKundeInformierenMailDefaults,
  previewKundeInformierenMail,
  sendKundeInformierenMail,
  type KundeInformierenScope,
} from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'

function InformierenFooter({
  pending,
  showPreview,
  onTogglePreview,
  onSend,
}: {
  pending: boolean
  showPreview: boolean
  onTogglePreview: () => void
  onSend: () => void
}) {
  const requestClose = useEditorSheetRequestClose()
  return (
    <div className="sheet-footer-actions ldr-cta">
      <Button type="button" variant="secondary" onClick={() => requestClose?.()} disabled={pending}>
        Abbrechen
      </Button>
      <Button type="button" variant="secondary" loading={pending} onClick={onTogglePreview}>
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
      <Button type="button" variant="primary" loading={pending} onClick={onSend}>
        Senden
      </Button>
    </div>
  )
}

/** Kunde informieren — EditorSheet Split-over (Mock Surface B). */
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
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!open) return
    setBetreff(defaultBetreff)
    setNachricht(defaultNachricht)
    setPreviewHtml(null)
    setShowPreview(false)
    setDirty(false)
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
      setDirty(false)
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
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Kunde informieren"
      crumb="Vor Ort >"
      context="detail"
      dirty={dirty}
      size="lg"
      compose
      composeLabel="Senden"
      onConfirm={senden}
      confirmBusy={pending}
      footer={
        <InformierenFooter
          pending={pending}
          showPreview={showPreview}
          onTogglePreview={() => (showPreview ? setShowPreview(false) : void loadPreview())}
          onSend={senden}
        />
      }
    >
      <div className="space-y-4">
        <p className="m-0 text-[length:var(--fs-text)] text-bw-text-muted">
          Update an <strong>{kundeName}</strong>
          {scopeHint ? <> · {scopeHint}</> : null}. Notizen und Fotos des Abschnitts werden auf der
          Kunden-Statusseite angezeigt.
        </p>

        <div className="flex gap-3">
          <label className="flex items-center gap-2 text-[length:var(--fs-text)]">
            <input
              type="radio"
              checked={anrede === 'sie'}
              onChange={() => {
                setAnrede('sie')
                setDirty(true)
              }}
            />
            Sie
          </label>
          <label className="flex items-center gap-2 text-[length:var(--fs-text)]">
            <input
              type="radio"
              checked={anrede === 'du'}
              onChange={() => {
                setAnrede('du')
                setDirty(true)
              }}
            />
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
          extraHint={`Kunde informieren · ${kundeName}`}
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
        <KiAssistFieldLabel
          label="Nachricht"
          value={nachricht}
          onApply={(text) => {
            setNachricht(text)
            setDirty(true)
          }}
          extraHint="Erscheint in Mail und auf der Kunden-Statusseite."
        >
          <Textarea
            rows={6}
            value={nachricht}
            onChange={(e) => {
              setNachricht(e.target.value)
              setDirty(true)
            }}
          />
        </KiAssistFieldLabel>

        {showPreview && previewHtml ? <CollapsibleMailPreview previewHtml={previewHtml} /> : null}
      </div>
    </EditorSheet>
  )
}
