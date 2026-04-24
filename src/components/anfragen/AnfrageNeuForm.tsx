'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Toggle } from '@/components/ui/Toggle'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { createAnfrage } from '@/app/(dashboard)/anfragen/actions'
import type { LeadKanal } from '@/lib/types'
import { BEREICH_LABELS, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

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
]

const BEREICH_KEYS = Object.keys(BEREICH_LABELS) as string[]

type WebsitePreisArt = 'budget' | 'fix' | 'range' | 'komplex'

const WEBSITE_PREIS_OPTIONS: { value: WebsitePreisArt; label: string }[] = [
  { value: 'budget', label: 'Ca.-Budget' },
  { value: 'fix', label: 'Festpreis' },
  { value: 'range', label: 'Preisrahmen (von – bis)' },
  { value: 'komplex', label: 'Komplex (individuell)' },
]

export function AnfrageNeuForm({
  defaultKundeId,
  onSuccess,
  onCancel,
}: {
  defaultKundeId?: string | null
  onSuccess?: (id: string) => void
  onCancel?: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verknuepfterKundeId, setVerknuepfterKundeId] = useState<string | null>(defaultKundeId?.trim() || null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [plz, setPlz] = useState('')
  const [kanal, setKanal] = useState<LeadKanal>('telefon')
  const [situation, setSituation] = useState('zuhause_erneuern')
  const [bereiche, setBereiche] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(BEREICH_KEYS.map((k) => [k, false]))
  )
  const [sonstigesText, setSonstigesText] = useState('')
  const [budget, setBudget] = useState('')
  const [websitePreisArt, setWebsitePreisArt] = useState<WebsitePreisArt>('budget')
  const [websiteFix, setWebsiteFix] = useState('')
  const [websiteMin, setWebsiteMin] = useState('')
  const [websiteMax, setWebsiteMax] = useState('')
  const [zeitraumTyp, setZeitraumTyp] = useState<'tag' | 'zeitraum' | null>(null)
  const [zeitraumVon, setZeitraumVon] = useState('')
  const [zeitraumBis, setZeitraumBis] = useState('')
  const [notizen, setNotizen] = useState('')
  const [sendBestaetigung, setSendBestaetigung] = useState(false)

  useEffect(() => {
    const kid = defaultKundeId?.trim()
    if (!kid) {
      setVerknuepfterKundeId(null)
      return
    }
    setVerknuepfterKundeId(kid)
    const supabase = createClient()
    void supabase
      .from('kunden')
      .select('name, email, telefon, plz, typ')
      .eq('id', kid)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        if (data.name) setName(String(data.name))
        if (data.email) setEmail(String(data.email))
        if (data.telefon) setTelefon(String(data.telefon))
        if (data.plz) setPlz(String(data.plz))
        if (data.typ === 'gewerbe') {
          setBereiche((prev) => ({ ...prev, gewerbe: true }))
        }
      })
  }, [defaultKundeId])

  const bereicheList = useMemo(() => BEREICH_KEYS.filter((k) => bereiche[k]), [bereiche])
  const sonstigesSelected = bereiche.sonstiges === true

  const isValid = useMemo(() => {
    if (!name.trim()) return false
    if (!email.trim() && !telefon.trim()) return false
    return true
  }, [name, email, telefon])

  function toggleBereich(key: string) {
    setBereiche((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleCancel() {
    if (onCancel) onCancel()
    else router.back()
  }

  async function handleSave() {
    setError(null)
    if (!name.trim()) {
      setError('Name ist ein Pflichtfeld.')
      return
    }
    if (!email.trim() && !telefon.trim()) {
      setError('Bitte mindestens E-Mail oder Telefon angeben.')
      return
    }
    if (zeitraumTyp === 'zeitraum' && zeitraumVon && zeitraumBis && zeitraumBis < zeitraumVon) {
      setError('„Bis“-Datum darf nicht vor „Von“ liegen.')
      return
    }

    let budgetN: number | null =
      budget.trim() === '' || Number.isNaN(Number(budget)) ? null : Number(budget)
    if (budgetN != null && budgetN < 0) {
      setError('Budget darf nicht negativ sein.')
      return
    }

    let preis_min: number | null = null
    let preis_max: number | null = null
    let funnel_daten: Record<string, unknown> | null = null
    let budgetOut: number | null = null

    if (kanal === 'website') {
      budgetOut = null
      if (websitePreisArt === 'budget') {
        budgetOut = budgetN
      } else if (websitePreisArt === 'fix') {
        const n = Number(String(websiteFix).replace(',', '.').trim())
        if (!Number.isFinite(n) || n <= 0) {
          setError('Bitte einen gültigen Festpreis eingeben.')
          return
        }
        preis_min = n
        preis_max = n
      } else if (websitePreisArt === 'range') {
        const mn = Number(String(websiteMin).replace(',', '.').trim())
        const mx = Number(String(websiteMax).replace(',', '.').trim())
        if (!Number.isFinite(mn) || mn <= 0 || !Number.isFinite(mx) || mx <= 0) {
          setError('Bitte Unter- und Obergrenze des Preisrahmens angeben.')
          return
        }
        if (mx < mn) {
          setError('„Bis“ darf nicht kleiner als „Von“ sein.')
          return
        }
        preis_min = mn
        preis_max = mx
      } else {
        funnel_daten = { preisModus: 'komplex' }
        const mnRaw = String(websiteMin).replace(',', '.').trim()
        const mxRaw = String(websiteMax).replace(',', '.').trim()
        if (mnRaw !== '') {
          const mn = Number(mnRaw)
          if (!Number.isFinite(mn) || mn <= 0) {
            setError('Optionale Untergrenze: bitte gültige Zahl.')
            return
          }
          preis_min = mn
        }
        if (mxRaw !== '') {
          const mx = Number(mxRaw)
          if (!Number.isFinite(mx) || mx <= 0) {
            setError('Optionale Obergrenze: bitte gültige Zahl.')
            return
          }
          preis_max = mx
        }
        if (preis_min != null && preis_max != null && preis_max < preis_min) {
          setError('„Bis“ darf nicht kleiner als „Von“ sein.')
          return
        }
      }
    } else {
      budgetOut = budgetN
    }

    let zVon: string | null = null
    let zBis: string | null = null
    if (zeitraumTyp === 'tag' && zeitraumVon) {
      zVon = zeitraumVon
      zBis = null
    } else if (zeitraumTyp === 'zeitraum') {
      zVon = zeitraumVon.trim() || null
      zBis = zeitraumBis.trim() || null
    }

    setLoading(true)
    const res = await createAnfrage({
      kunde_id: verknuepfterKundeId,
      name: name.trim(),
      email: email.trim(),
      telefon: telefon.trim(),
      plz: plz.trim(),
      kanal,
      situation,
      bereiche: bereicheList,
      bereiche_sonstiges: sonstigesSelected ? sonstigesText.trim() || null : null,
      budget_ca: budgetOut,
      preis_min,
      preis_max,
      funnel_daten,
      zeitraum_von: zVon,
      zeitraum_bis: zBis,
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

    router.refresh()
    if (onSuccess) {
      onSuccess(res.id)
      return
    }
    router.push(`/anfragen/${res.id}`)
  }

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="flex max-h-[min(85vh,720px)] flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-1 pb-4 pt-1">
        <fieldset className="card-body card space-y-4">
          <legend className="card-title px-1">Kunde</legend>
          <Input name="name" label="Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            name="email"
            type="email"
            label="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Mindestens E-Mail oder Telefon"
          />
          <Input name="telefon" type="tel" label="Telefon" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
          <Input name="plz" label="PLZ" value={plz} onChange={(e) => setPlz(e.target.value)} inputMode="numeric" />
        </fieldset>

        <fieldset className="card-body card space-y-4">
          <legend className="card-title px-1">Anfrage</legend>
          <Select
            name="kanal"
            label="Wie kam die Anfrage?"
            value={kanal}
            onChange={(e) => setKanal(e.target.value as LeadKanal)}
            options={KANAL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
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
            {sonstigesSelected ? (
              <div className="mt-2">
                <input
                  className="input"
                  placeholder="Bitte beschreiben…"
                  value={sonstigesText}
                  onChange={(e) => setSonstigesText(e.target.value)}
                />
              </div>
            ) : null}
          </div>

          {kanal === 'website' ? (
            <div className="space-y-3">
              <Select
                name="website_preis_art"
                label="Preisangabe (wie auf der Website)"
                value={websitePreisArt}
                onChange={(e) => setWebsitePreisArt(e.target.value as WebsitePreisArt)}
                options={WEBSITE_PREIS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              {websitePreisArt === 'budget' ? (
                <div>
                  <label className="input-label">Ca.-Budget (optional)</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="z.B. 15000"
                      className="input pr-8"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      min={0}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bw-text-muted">
                      €
                    </span>
                  </div>
                </div>
              ) : null}
              {websitePreisArt === 'fix' ? (
                <Input
                  name="website_fix"
                  label="Festpreis (€)"
                  value={websiteFix}
                  onChange={(e) => setWebsiteFix(e.target.value)}
                  placeholder="z.B. 12500"
                  inputMode="decimal"
                />
              ) : null}
              {websitePreisArt === 'range' ? (
                <div className="form-grid-2 grid gap-3 sm:grid-cols-2">
                  <Input
                    name="website_min"
                    label="Von (€)"
                    value={websiteMin}
                    onChange={(e) => setWebsiteMin(e.target.value)}
                    placeholder="z.B. 8000"
                    inputMode="decimal"
                  />
                  <Input
                    name="website_max"
                    label="Bis (€)"
                    value={websiteMax}
                    onChange={(e) => setWebsiteMax(e.target.value)}
                    placeholder="z.B. 12000"
                    inputMode="decimal"
                  />
                </div>
              ) : null}
              {websitePreisArt === 'komplex' ? (
                <div className="space-y-3">
                  <p className="text-sm text-bw-text-muted">
                    Optional: grober Rahmen, wie im Funnel bei „Komplex (individuell)“.
                  </p>
                  <div className="form-grid-2 grid gap-3 sm:grid-cols-2">
                    <Input
                      name="website_komplex_min"
                      label="Von (€, optional)"
                      value={websiteMin}
                      onChange={(e) => setWebsiteMin(e.target.value)}
                      placeholder="—"
                      inputMode="decimal"
                    />
                    <Input
                      name="website_komplex_max"
                      label="Bis (€, optional)"
                      value={websiteMax}
                      onChange={(e) => setWebsiteMax(e.target.value)}
                      placeholder="—"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <label className="input-label">Budget (optional)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="z.B. 15000"
                  className="input pr-8"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min={0}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-bw-text-muted">
                  €
                </span>
              </div>
              <p className="mt-1 text-xs text-bw-text-muted">Ungefähres Budget des Kunden — auch bei B2B optional</p>
            </div>
          )}

          <div>
            <label className="input-label">Gewünschter Zeitraum (optional)</label>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setZeitraumTyp(zeitraumTyp === 'tag' ? null : 'tag')}
                className={cn('btn btn-sm', zeitraumTyp === 'tag' ? 'btn-primary' : 'btn-secondary')}
              >
                Einzeltag
              </button>
              <button
                type="button"
                onClick={() => setZeitraumTyp(zeitraumTyp === 'zeitraum' ? null : 'zeitraum')}
                className={cn('btn btn-sm', zeitraumTyp === 'zeitraum' ? 'btn-primary' : 'btn-secondary')}
              >
                Zeitraum
              </button>
            </div>
            {zeitraumTyp === 'tag' ? (
              <input type="date" className="input" value={zeitraumVon} onChange={(e) => setZeitraumVon(e.target.value)} min={minDate} />
            ) : null}
            {zeitraumTyp === 'zeitraum' ? (
              <div className="form-grid-2 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="input-label">Von</label>
                  <input type="date" className="input" value={zeitraumVon} onChange={(e) => setZeitraumVon(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Bis</label>
                  <input
                    type="date"
                    className="input"
                    value={zeitraumBis}
                    onChange={(e) => setZeitraumBis(e.target.value)}
                    min={zeitraumVon || undefined}
                  />
                </div>
              </div>
            ) : null}
          </div>
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
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}
      </div>

      <div
        className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-bw-border bg-bw-card px-4 py-3 md:static md:border-0 md:px-0 md:pt-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <button type="button" onClick={handleCancel} className="btn btn-secondary flex-1 md:flex-none">
          Abbrechen
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={loading || !isValid}
          className="btn btn-primary flex flex-1 items-center justify-center gap-2 md:flex-none"
        >
          {loading ? (
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
          ) : null}
          Anfrage speichern
        </button>
      </div>
    </div>
  )
}
