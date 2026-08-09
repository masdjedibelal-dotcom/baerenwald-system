'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { crmManuelleHandwerkerEinreichung } from '@/app/(dashboard)/angebote/actions'

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
  const [pending, startTransition] = useTransition()
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
      toast.error('Bitte ein Angebots-PDF auswählen.')
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
        toast.error(res.message)
        return
      }
      toast.success('Handwerker-Angebot manuell erfasst')
      onSaved()
      resetAndClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      title="Angebot manuell erfassen"
      size="md"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={resetAndClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-bw-text-muted">
        {handwerkerName} · {gewerkName}. Wie eine Portal-Einreichung: Preis, PDF und Status
        „eingereicht“. Danach im Angebot mit „Bestätigen & Partner informieren“ abschließen.
      </p>
      <div className="space-y-3">
        <Input
          label="Preis netto (€)"
          required
          value={preisNetto}
          onChange={(e) => setPreisNetto(e.target.value)}
          inputMode="decimal"
          placeholder="z. B. 4500"
        />
        <Input
          label="Preis brutto (€, optional)"
          value={preisBrutto}
          onChange={(e) => setPreisBrutto(e.target.value)}
          inputMode="decimal"
          placeholder="z. B. 5355"
        />
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-bw-text">Angebots-PDF</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full text-sm text-bw-text"
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
          />
        </label>
        <Textarea
          label="Interne Notiz (optional)"
          rows={2}
          value={notiz}
          onChange={(e) => setNotiz(e.target.value)}
          placeholder="z. B. per E-Mail erhalten am …"
        />
      </div>
    </Modal>
  )
}
