'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import type { LeadKanal } from '@/lib/types'
import { BEREICH_LABELS, cn } from '@/lib/utils'

const KANAL_OPTIONS: { value: LeadKanal; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'telefon', label: 'Telefon' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-Mail' },
  { value: 'vor_ort', label: 'Vor Ort' },
  { value: 'sonstiges', label: 'Sonstiges' },
]

const SITUATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'zuhause_erneuern', label: 'Zuhause erneuern' },
  { value: 'reparatur', label: 'Reparatur' },
  { value: 'defekt', label: 'Defekt' },
  { value: 'notfall', label: 'Notfall' },
  { value: 'neu_bauen', label: 'Neu bauen' },
  { value: 'betreuung', label: 'Betreuung' },
  { value: 'gewerbe', label: 'Gewerbe' },
]

const BEREICH_KEYS = Object.keys(BEREICH_LABELS) as string[]

export default function NeueAnfragePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [plz, setPlz] = useState('')
  const [kanal, setKanal] = useState<LeadKanal>('telefon')
  const [situation, setSituation] = useState('zuhause_erneuern')
  const [bereiche, setBereiche] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BEREICH_KEYS.map((k) => [k, false]))
  )
  const [preisMin, setPreisMin] = useState('')
  const [preisMax, setPreisMax] = useState('')
  const [zeitraum, setZeitraum] = useState('')
  const [notizen, setNotizen] = useState('')
  const [sendBestaetigung, setSendBestaetigung] = useState(false)

  function toggleBereich(key: string) {
    setBereiche((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Name ist ein Pflichtfeld.')
      return
    }
    if (!email.trim() && !telefon.trim()) {
      setError('Bitte mindestens E-Mail oder Telefon angeben.')
      return
    }

    const minV = preisMin.trim() === '' ? null : Number(preisMin)
    const maxV = preisMax.trim() === '' ? null : Number(preisMax)
    if (
      minV != null &&
      maxV != null &&
      !Number.isNaN(minV) &&
      !Number.isNaN(maxV) &&
      minV > maxV
    ) {
      setError('Preis Min darf nicht größer als Max sein.')
      return
    }

    const bereicheList = BEREICH_KEYS.filter((k) => bereiche[k])

    setLoading(true)
    const res = await createAnfrage({
      name: name.trim(),
      email: email.trim(),
      telefon: telefon.trim(),
      plz: plz.trim(),
      kanal,
      situation,
      bereiche: bereicheList,
      preis_min:
        preisMin.trim() === '' || Number.isNaN(Number(preisMin))
          ? null
          : Number(preisMin),
      preis_max:
        preisMax.trim() === '' || Number.isNaN(Number(preisMax))
          ? null
          : Number(preisMax),
      zeitraum: zeitraum.trim(),
      notizen: notizen.trim(),
    })
    setLoading(false)

    if (!res.ok) {
      setError(res.message)
      return
    }

    if (sendBestaetigung && email.trim()) {
      const { sendAnfrageBestaetigung } = await import('@/app/actions/mails')
      const mailRes = await sendAnfrageBestaetigung(res.id, true)
      if (!mailRes.ok) {
        console.warn('[Bestätigungsmail]', mailRes.message)
      }
    }

    router.push(`/anfragen/${res.id}`)
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader
        title="Neue Anfrage"
        breadcrumbs={[
          { label: 'Anfragen', href: '/anfragen' },
          { label: 'Neue Anfrage' },
        ]}
      />

      <form onSubmit={onSubmit} className="mt-6 space-y-6 pb-28">
        <fieldset className="card-body card space-y-4">
          <legend className="card-title px-1">Kunde</legend>
          <Input
            name="name"
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
          <Input
            name="email"
            type="email"
            label="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            hint="Mindestens E-Mail oder Telefon"
          />
          <Input
            name="telefon"
            type="tel"
            label="Telefon"
            value={telefon}
            onChange={(e) => setTelefon(e.target.value)}
            autoComplete="tel"
          />
          <Input
            name="plz"
            label="PLZ"
            value={plz}
            onChange={(e) => setPlz(e.target.value)}
            inputMode="numeric"
          />
        </fieldset>

        <fieldset className="card-body card space-y-4">
          <legend className="card-title px-1">Anfrage</legend>
          <Select
            name="kanal"
            label="Wie kam die Anfrage?"
            value={kanal}
            onChange={(e) => setKanal(e.target.value as LeadKanal)}
            options={KANAL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            hint="Website-Anfragen laufen automatisch ein."
          />
        </fieldset>

        <fieldset className="card-body card space-y-4">
          <legend className="card-title px-1">Projekt</legend>
          <Select
            name="situation"
            label="Situation"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            options={SITUATION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />

          <div>
            <span className="mb-2 block text-base font-medium text-ink">Bereiche</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BEREICH_KEYS.map((key) => (
                <label
                  key={key}
                  className={cn(
                    'flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                    bereiche[key]
                      ? 'border-bw-primary bg-bw-green-bg'
                      : 'border-bw-border bg-bw-bg hover:bg-bw-hover'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={!!bereiche[key]}
                    onChange={() => toggleBereich(key)}
                    className="h-5 w-5 accent-bw-primary"
                  />
                  <span className="text-base text-ink">{BEREICH_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>

          <Input
            name="preis_min"
            type="number"
            inputMode="decimal"
            label="Preisindikation Min (€)"
            value={preisMin}
            onChange={(e) => setPreisMin(e.target.value)}
            min={0}
          />
          <Input
            name="preis_max"
            type="number"
            inputMode="decimal"
            label="Preisindikation Max (€)"
            value={preisMax}
            onChange={(e) => setPreisMax(e.target.value)}
            min={0}
          />
          <Input
            name="zeitraum"
            label="Zeitraum"
            value={zeitraum}
            onChange={(e) => setZeitraum(e.target.value)}
          />
        </fieldset>

        <fieldset className="card-body card space-y-4">
          <legend className="card-title px-1">Notizen</legend>
          <Textarea
            name="notizen"
            label="Interne Notizen"
            value={notizen}
            onChange={(e) => setNotizen(e.target.value)}
            rows={4}
          />
        </fieldset>

        <div className="flex items-center gap-3 rounded-lg bg-bw-hover p-4">
          <Toggle
            checked={sendBestaetigung}
            onChange={setSendBestaetigung}
            label="Bestätigungsmail senden"
            hint="Sendet automatisch eine Bestätigung an den Kunden (wie bei Website-Anfragen)."
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-2 border-t border-bw-border bg-bw-card p-4 shadow-[0_-4px_12px_rgba(0,0,0,.08)] md:relative md:z-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <Link href="/anfragen" className="btn btn-secondary btn-lg flex-1 md:flex-none">
            Abbrechen
          </Link>
          <Button type="submit" variant="primary" size="lg" className="flex-1 md:w-auto" loading={loading}>
            Anfrage speichern
          </Button>
        </div>
      </form>
    </div>
  )
}
