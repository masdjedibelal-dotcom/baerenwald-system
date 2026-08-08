'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import {
  createHandwerker,
  updateHandwerker,
  type HandwerkerFormInput,
} from '@/app/(dashboard)/handwerker/actions'
import { normalizeHandwerkerNamen, validateHandwerkerStammPflicht } from '@/lib/handwerker-stammdaten'
import type { Gewerk, Handwerker } from '@/lib/types'

export function HandwerkerForm({
  gewerke,
  initial,
  isNew,
}: {
  gewerke: Gewerk[]
  initial: Handwerker | null
  isNew: boolean
}) {
  const router = useRouter()
  const legacy = normalizeHandwerkerNamen(initial ?? {})
  const [firma, setFirma] = useState(legacy.firma)
  const [vorname, setVorname] = useState(legacy.vorname)
  const [nachname, setNachname] = useState(legacy.nachname)
  const [email, setEmail] = useState(initial?.email ?? '')
  const [telefon, setTelefon] = useState(initial?.telefon ?? '')
  const [adresse, setAdresse] = useState(initial?.adresse ?? '')
  const [slugs, setSlugs] = useState<Set<string>>(() => new Set(initial?.gewerke ?? []))
  const [aktiv, setAktiv] = useState(initial?.aktiv ?? true)
  const [notizen, setNotizen] = useState(initial?.notizen ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggleGewerk = (slug: string) => {
    setSlugs((prev) => {
      const n = new Set(prev)
      if (n.has(slug)) n.delete(slug)
      else n.add(slug)
      return n
    })
  }

  const submit = async () => {
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
      aktiv,
      notizen: notizen.trim() || null,
    }
    setSaving(true)
    if (isNew) {
      const r = await createHandwerker(payload)
      setSaving(false)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      router.push(`/handwerker/${r.id}`)
      router.refresh()
      return
    }
    if (!initial?.id) return
    const r = await updateHandwerker(initial.id, payload)
    setSaving(false)
    if (!r.ok) {
      setErr(r.message)
      return
    }
    router.push(`/handwerker/${initial.id}`)
    router.refresh()
  }

  const aktiveGewerke = gewerke.filter((g) => g.aktiv)

  return (
    <div>
      <PageHeader
        action={
          <Link
            href={isNew ? '/handwerker' : `/handwerker/${initial?.id ?? ''}`}
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
          >
            Zurück
          </Link>
        }
      />

      {err ? (
        <p className="mb-4 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <div className="space-y-4 rounded-lg border border-border bg-surface p-4 shadow-card">
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
        <Input
          label="E-Mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input label="Telefon" type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        <Input label="Adresse" value={adresse} onChange={(e) => setAdresse(e.target.value)} />

        <fieldset className="space-y-2">
          <legend className="mb-2 text-base font-medium text-ink">Gewerke</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {aktiveGewerke.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={slugs.has(g.slug)}
                  onChange={() => toggleGewerk(g.slug)}
                  className="h-5 w-5 rounded border-border"
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={aktiv}
            onChange={(e) => setAktiv(e.target.checked)}
            className="h-5 w-5 rounded border-border"
          />
          Aktiv
        </label>

        <Textarea label="Notizen" value={notizen} onChange={(e) => setNotizen(e.target.value)} rows={4} />

        <Button type="button" variant="primary" loading={saving} onClick={() => void submit()}>
          Speichern
        </Button>
      </div>
    </div>
  )
}
