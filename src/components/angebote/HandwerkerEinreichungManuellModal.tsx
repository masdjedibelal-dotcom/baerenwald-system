'use client'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { toast } from '@/components/ui/app-toast'
import { crmManuelleHandwerkerEinreichung } from '@/app/(dashboard)/angebote/actions'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

export function HandwerkerEinreichungManuellModal({
  open,
  onClose,
  angebotId,
  zuweisungId,
  handwerkerName,
  gewerkName,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  angebotId: string
  zuweisungId: string
  handwerkerName: string
  gewerkName: string
  onSaved: () => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useLocalTransition()
  const [preisNetto, setPreisNetto] = useState('')
  const [preisBrutto, setPreisBrutto] = useState('')
  const [notiz, setNotiz] = useState('')
  const [pdf, setPdf] = useState<File | null>(null)

  function resetAndClose() {
    setPreisNetto('')
    setPreisBrutto('')
    setNotiz('')
    setPdf(null)
    onClose()
  }

  function speichern() {
    if (!pdf) {
      applyFieldErrors({ _form: TOAST.bitte_ein_angebots_pdf_auswaehlen })
      return
    }
    const fd = new FormData()
    fd.set('angebotId', angebotId)
    fd.set('zuweisungId', zuweisungId)
    fd.set('preisNetto', preisNetto)
    fd.set('preisBrutto', preisBrutto)
    fd.set('notiz', notiz)
    fd.set('pdf', pdf)

    startTransition(async () => {
      const res = await crmManuelleHandwerkerEinreichung(fd)
      if (!res.ok) {
        toast.systemError(res)
        return
      }
      toast.success(TOAST.partner_angebot_manuell_erfasst)
      onSaved()
      resetAndClose()
    })
  }

  return (
    <EditorSheet
      open={open}
      onClose={resetAndClose}
      title="Angebot manuell erfassen"
      size="md"
      secondary={{ label: 'Abbrechen', onClick: resetAndClose, disabled: pending }}
      primary={{
        label: 'Speichern',
        onClick: speichern,
        busy: pending,
      }}
    >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
              <p className="mb-4 text-[length:var(--fs-text)] text-bw-text-muted">
        {handwerkerName} · {gewerkName}. Wie eine Portal-Einreichung: Preis, PDF und Status
        „eingereicht“. Danach im Angebot mit „Bestätigen & Partner informieren“ abschließen.
      </p>
      <div className="space-y-3">
        <MockField label="Preis netto (€)" required><MockInput required value={preisNetto} onChange={(e) => setPreisNetto(e.target.value)} inputMode="decimal" placeholder="z. B. 4500" /></MockField>
        <MockField label="Preis brutto (€, optional)"><MockInput value={preisBrutto} onChange={(e) => setPreisBrutto(e.target.value)} inputMode="decimal" placeholder="z. B. 5355" /></MockField>
        <label className="block text-[length:var(--fs-text)]">
          <span className="mb-1 block font-medium text-bw-text">Angebots-PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-[length:var(--fs-text)] text-bw-text"
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
          />
        </label>
        <MockField label="Interne Notiz (optional)"><RichTextEditor value={typeof (notiz) === 'string' ? (notiz) : ''} onChange={(__v) => setNotiz(__v)} placeholder="z. B. per E-Mail erhalten am …" minHeight={120} aria-label="Interne Notiz (optional)" /></MockField>
      </div>
    </EditorSheet>
  )
}
