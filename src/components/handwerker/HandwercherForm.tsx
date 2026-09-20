'use client'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput } from '@/components/mock-ui/MockForm'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import Link from 'next/link'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
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
      afterServerActionRefresh()
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
    afterServerActionRefresh()
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
        <p className="mb-4 rounded-card border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <div className="space-y-4 rounded-field border border-border bg-surface p-4">
        <MockField label="Firmenname *"><MockInput value={firma} onChange={(e) => setFirma(e.target.value)} /></MockField>
        <div className="form-grid-2 grid gap-3 md:grid-cols-2">
          <MockField label="Vorname (Geschäftsführer)"><MockInput value={vorname} onChange={(e) => setVorname(e.target.value)} /></MockField>
          <MockField label="Nachname (Geschäftsführer)"><MockInput value={nachname} onChange={(e) => setNachname(e.target.value)} /></MockField>
        </div>
        <MockField label="E-Mail"><MockInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></MockField>
        <MockField label="Telefon"><MockInput type="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} /></MockField>
        <MockField label="Adresse"><MockInput value={adresse} onChange={(e) => setAdresse(e.target.value)} /></MockField>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-base font-medium text-ink">Gewerke</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {aktiveGewerke.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <MockCheckbox
                  checked={slugs.has(g.slug)}
                  onChange={() => toggleGewerk(g.slug)}
                  className="h-5 w-5 rounded-card border-border"
                />
                <span>{g.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <MockCheckbox
            checked={aktiv}
            onChange={(e) => setAktiv(e.target.checked)}
            className="h-5 w-5 rounded-card border-border"
          />
          Aktiv
        </label>

        <MockField label="Notizen"><RichTextEditor value={typeof (notizen) === 'string' ? (notizen) : ''} onChange={(__v) => setNotizen(__v)} minHeight={120} aria-label="Notizen" /></MockField>

        <MockBtn type="button" kind="primary" loading={saving} onClick={() => void submit()}>
          Speichern
        </MockBtn>
      </div>
    </div>
  )
}
