'use client'

import { useEffect, useState, useTransition } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import {
  createHandwerker,
  type HandwerkerFormInput,
} from '@/app/(dashboard)/handwerker/actions'
import { findStammdatenDuplikate } from '@/app/actions/stammdaten-kontakt'
import { normalizeHandwerkerNamen, validateHandwerkerStammPflicht } from '@/lib/handwerker-stammdaten'
import type { StammdatenKontaktTreffer } from '@/lib/stammdaten-kontakt'
import type { GewerkOption } from '@/components/handwerker/HandwerkerListeClient'

export function HandwerkerModal({
  open,
  onClose,
  gewerkeOptionen,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  gewerkeOptionen: GewerkOption[]
  onSaved?: (id: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [firma, setFirma] = useState('')
  const [vorname, setVorname] = useState('')
  const [nachname, setNachname] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [adresse, setAdresse] = useState('')
  const [slugs, setSlugs] = useState<Set<string>>(() => new Set())
  const [notizen, setNotizen] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [dupes, setDupes] = useState<StammdatenKontaktTreffer[]>([])

  useEffect(() => {
    if (!open) return
    const blank = normalizeHandwerkerNamen({})
    setFirma(blank.firma)
    setVorname(blank.vorname)
    setNachname(blank.nachname)
    setEmail('')
    setTelefon('')
    setAdresse('')
    setSlugs(new Set())
    setNotizen('')
    setErr(null)
    setDupes([])
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      void (async () => {
        const d = await findStammdatenDuplikate('handwerker', { email, telefon })
        setDupes(d)
      })()
    }, 400)
    return () => clearTimeout(t)
  }, [open, email, telefon])

  const toggleGewerk = (slug: string) => {
    setSlugs((prev) => {
      const n = new Set(prev)
      if (n.has(slug)) n.delete(slug)
      else n.add(slug)
      return n
    })
  }

  function submit() {
    setErr(null)
    const pflicht = validateHandwerkerStammPflicht({ firma, vorname, nachname })
    if (pflicht) {
      setErr(pflicht)
      return
    }
    const payload: HandwerkerFormInput = {
      firma: firma.trim() || null,
      vorname: vorname.trim() || null,
      nachname: nachname.trim() || null,
      email: email.trim() || null,
      telefon: telefon.trim() || null,
      whatsapp: null,
      webseite: null,
      adresse: adresse.trim() || null,
      gewerke: Array.from(slugs),
      subkategorie: null,
      ist_fachbetrieb: true,
      partner_kategorie_id: null,
      steuernummer: null,
      ustid: null,
      iban: null,
      aktiv: true,
      notizen: notizen.trim() || null,
    }
    startTransition(async () => {
      const r = await createHandwerker(payload)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      onClose()
      onSaved?.(r.id)
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neuer Handwerker"
      size="md"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            Anlegen
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {err ? <p className="text-sm text-status-cancel-text">{err}</p> : null}

        {dupes.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <p className="font-medium">Bereits als Handwerker vorhanden</p>
            <ul className="mt-1 list-inside list-disc">
              {dupes.map((d) => (
                <li key={d.id}>
                  {d.name} · {d.telefon ?? '—'} · {d.email ?? '—'}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs">
              Nur Hinweis auf bestehende Handwerker-Datensätze. Kunden/Partner mit gleichen Kontaktdaten sind
              erlaubt und bleiben getrennt.
            </p>
          </div>
        ) : null}

        <Input label="Firmenname *" value={firma} onChange={(e) => setFirma(e.target.value)} />
        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <Input
            label="Vorname (Geschäftsführer)"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
          />
          <Input
            label="Nachname (Geschäftsführer)"
            value={nachname}
            onChange={(e) => setNachname(e.target.value)}
          />
        </div>
        <Input label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Telefon" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        <Input label="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />

        {gewerkeOptionen.length > 0 ? (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-bw-text">Gewerke</legend>
            <div className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {gewerkeOptionen.map((g) => (
                <label key={g.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={slugs.has(g.slug)}
                    onChange={() => toggleGewerk(g.slug)}
                    className="h-4 w-4 rounded border-bw-border"
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Textarea label="Notizen" value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={3} />
        <p className="text-xs text-bw-text-muted">
          Firmenname oder Vor-/Nachname des Geschäftsführers ist Pflicht. Weitere Stammdaten kannst du danach im
          Profil ergänzen.
        </p>
      </div>
    </Modal>
  )
}
