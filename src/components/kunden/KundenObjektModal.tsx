'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { createKundenObjekt, updateKundenObjekt } from '@/app/actions/kunden-objekte'
import { toast } from '@/components/ui/app-toast'
import type { KundenObjekt } from '@/lib/types'

export function KundenObjektModal({
  open,
  onClose,
  kundeId,
  editObjekt,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  kundeId: string
  editObjekt?: KundenObjekt | null
  onSaved: (objekt: KundenObjekt) => void
}) {
  const [pending, startTransition] = useTransition()
  const [titel, setTitel] = useState('')
  const [strasse, setStrasse] = useState('')
  const [hausnummer, setHausnummer] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editObjekt) {
      setTitel(editObjekt.titel ?? '')
      setStrasse(editObjekt.strasse ?? '')
      setHausnummer(editObjekt.hausnummer ?? '')
      setPlz(editObjekt.plz ?? '')
      setOrt(editObjekt.ort ?? '')
    } else {
      setTitel('')
      setStrasse('')
      setHausnummer('')
      setPlz('')
      setOrt('')
    }
    setErr(null)
  }, [open, editObjekt])

  function speichern() {
    setErr(null)
    const payload = { titel, strasse, hausnummer, plz, ort }
    startTransition(async () => {
      if (editObjekt) {
        const r = await updateKundenObjekt(editObjekt.id, kundeId, payload)
        if (!r.ok) {
          setErr(r.message)
          return
        }
        onSaved({
          ...editObjekt,
          titel: titel.trim(),
          strasse: strasse.trim() || null,
          hausnummer: hausnummer.trim() || null,
          plz: plz.trim() || null,
          ort: ort.trim() || null,
        })
        toast.success('Objekt gespeichert')
        onClose()
        return
      }
      const r = await createKundenObjekt(kundeId, payload)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      onSaved(r.objekt)
      toast.success('Objekt angelegt')
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editObjekt ? 'Objekt bearbeiten' : 'Objekt hinzufügen'}
      size="md"
    >
      <div className="space-y-3">
        <Input
          label="Titel / Bezeichnung"
          placeholder="z. B. WEG Musterstraße"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          required
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <Input label="Straße" value={strasse} onChange={(e) => setStrasse(e.target.value)} required />
          <Input label="Nr." value={hausnummer} onChange={(e) => setHausnummer(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <Input label="PLZ" value={plz} onChange={(e) => setPlz(e.target.value)} required />
          <Input label="Ort" value={ort} onChange={(e) => setOrt(e.target.value)} required />
        </div>
        {err ? <p className="text-sm text-danger">{err}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
          <Button type="button" variant="primary" loading={pending} onClick={speichern}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
