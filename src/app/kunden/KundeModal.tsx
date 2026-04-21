'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Accordion } from '@/components/ui/Accordion'
import { findKundenDuplikate, saveKunde } from '@/app/actions/kunden'
import type { Kunde } from '@/lib/types'
const TYP_OPTS = [
  { value: 'privat', label: 'Privat' },
  { value: 'gewerbe', label: 'Gewerbe' },
  { value: 'hausverwaltung', label: 'Hausverwaltung' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const QUELLE_OPTS = [
  { value: '', label: '—' },
  { value: 'website', label: 'Website' },
  { value: 'empfehlung', label: 'Empfehlung' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'social', label: 'Social Media' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

export function KundeModal({
  open,
  onClose,
  editKunde,
}: {
  open: boolean
  onClose: () => void
  editKunde?: Kunde | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [typ, setTyp] = useState('privat')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [plz, setPlz] = useState('')
  const [ort, setOrt] = useState('')
  const [adresse, setAdresse] = useState('')
  const [webseite, setWebseite] = useState('')
  const [ansprechpartner, setAnsprechpartner] = useState('')
  const [geburtstag, setGeburtstag] = useState('')
  const [quelle, setQuelle] = useState('')
  const [notizen, setNotizen] = useState('')
  const [dupes, setDupes] = useState<Pick<Kunde, 'id' | 'name' | 'telefon' | 'email'>[]>([])
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (editKunde) {
      setName(editKunde.name ?? '')
      setTyp(editKunde.typ ?? 'privat')
      setTelefon(editKunde.telefon ?? '')
      setEmail(editKunde.email ?? '')
      setPlz(editKunde.plz ?? '')
      setOrt(editKunde.ort ?? '')
      setAdresse(editKunde.adresse ?? '')
      setWebseite(editKunde.webseite ?? '')
      setAnsprechpartner(editKunde.ansprechpartner ?? '')
      setGeburtstag(editKunde.geburtstag?.slice(0, 10) ?? '')
      setQuelle(editKunde.quelle ?? '')
      setNotizen(editKunde.notizen ?? '')
    } else {
      setName('')
      setTyp('privat')
      setTelefon('')
      setEmail('')
      setPlz('')
      setOrt('')
      setAdresse('')
      setWebseite('')
      setAnsprechpartner('')
      setGeburtstag('')
      setQuelle('')
      setNotizen('')
    }
    setDupes([])
    setErr(null)
  }, [open, editKunde])

  useEffect(() => {
    if (!open || editKunde) return
    const t = setTimeout(() => {
      startTransition(async () => {
        const d = await findKundenDuplikate(telefon || null, email || null)
        setDupes(d)
      })
    }, 400)
    return () => clearTimeout(t)
  }, [open, editKunde, telefon, email])

  function submit() {
    if (!name.trim()) {
      setErr('Name ist Pflicht.')
      return
    }
    setErr(null)
    startTransition(async () => {
      const res = await saveKunde(
        {
          name: name.trim(),
          typ,
          telefon: telefon || null,
          email: email || null,
          plz: plz || null,
          ort: ort || null,
          adresse: adresse || null,
          webseite: webseite || null,
          ansprechpartner: ansprechpartner || null,
          geburtstag: geburtstag || null,
          quelle: quelle || null,
          notizen: notizen || null,
        },
        editKunde?.id
      )
      if (!res.ok) {
        setErr(res.message)
        return
      }
      onClose()
      router.push(`/kunden/${res.id}`)
      router.refresh()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editKunde ? 'Kunde bearbeiten' : 'Neuer Kunde'}
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            Speichern
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}

        {!editKunde && dupes.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Mögliches Duplikat</p>
            <ul className="mt-1 list-inside list-disc">
              {dupes.map((d) => (
                <li key={d.id}>
                  {d.name} · {d.telefon ?? '—'} · {d.email ?? '—'}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">Trotzdem speichern legt einen neuen Datensatz an.</p>
          </div>
        ) : null}

        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <Input label="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select
            label="Typ *"
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            options={TYP_OPTS}
          />
          <Input
            label="Telefon"
            type="tel"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
          />
          <Input
            label="E-Mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input label="PLZ" value={plz} onChange={(e) => setPlz(e.target.value)} />
          <Input label="Ort" value={ort} onChange={(e) => setOrt(e.target.value)} />
        </div>

        <Accordion title="Weitere Details" defaultOpen={false}>
          <div className="form-grid-2 mt-2 grid gap-3 md:grid-cols-2">
            <Input label="Straße / Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
            <Input
              label="Webseite"
              type="url"
              value={webseite}
              onChange={(e) => setWebseite(e.target.value)}
            />
            <Input
              label="Ansprechpartner"
              value={ansprechpartner}
              onChange={(e) => setAnsprechpartner(e.target.value)}
            />
            <Input
              label="Geburtstag"
              type="date"
              value={geburtstag}
              onChange={(e) => setGeburtstag(e.target.value)}
            />
            <Select
              label="Quelle"
              value={quelle}
              onChange={(e) => setQuelle(e.target.value)}
              options={QUELLE_OPTS}
            />
          </div>
          <Textarea
            className="mt-3"
            label="Notizen"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            rows={3}
          />
        </Accordion>
      </div>
    </Modal>
  )
}
