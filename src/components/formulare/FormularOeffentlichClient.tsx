'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  FormularFelderRenderer,
  validateFormularPflicht,
} from '@/components/formulare/FormularFelderRenderer'
import type { FormularFeld } from '@/lib/types'
import {
  flattenFotoUrlsAusWerten,
  type OeffentlichesFormularInitial,
} from '@/lib/hw-formular-oeffentlich'
import { BAUTAGEBUCH_MAX_FOTOS, mergeBautagebuchFotoUrls } from '@/lib/auftraege/bautagebuch-fotos'
import { cn } from '@/lib/utils'

function zaehleBeantwortet(felder: FormularFeld[], daten: Record<string, unknown>): number {
  let n = 0
  for (const f of felder) {
    const v = daten[f.id]
    let ok = false
    if (f.typ === 'checkbox') ok = Boolean(v)
    else if (f.typ === 'foto') ok = Array.isArray(v) && (v as unknown[]).length > 0
    else ok = v != null && v !== ''
    if (ok) n += 1
  }
  return n
}

export function FormularOeffentlichClient({
  initial,
}: {
  initial: OeffentlichesFormularInitial
}) {
  const [daten, setDaten] = useState<Record<string, unknown>>(initial.felder_werte)
  const [done, setDone] = useState(initial.abgeschlossen)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const felder = initial.felder
  const total = felder.length
  const beantwortet = useMemo(() => zaehleBeantwortet(felder, daten), [felder, daten])
  const progressPct = total > 0 ? Math.round((beantwortet / total) * 100) : 0

  function setField(id: string, value: unknown) {
    setDaten((d) => ({ ...d, [id]: value }))
  }

  async function handleFoto(feldId: string, file: File) {
    setErr(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`/api/formular/${encodeURIComponent(initial.token)}/foto`, {
      method: 'POST',
      body: fd,
    })
    const json = (await res.json()) as { url?: string; error?: string }
    if (!res.ok || !json.url) {
      setErr(json.error ?? 'Upload fehlgeschlagen')
      return
    }
    setDaten((d) => {
      const prev = (d[feldId] as string[] | undefined) ?? []
      if (prev.length >= BAUTAGEBUCH_MAX_FOTOS) {
        setErr(`Maximal ${BAUTAGEBUCH_MAX_FOTOS} Fotos.`)
        return d
      }
      return { ...d, [feldId]: mergeBautagebuchFotoUrls(prev, [json.url!]) }
    })
  }

  function buildPayload() {
    const foto_urls = flattenFotoUrlsAusWerten(felder, daten)
    return { felder_werte: daten, foto_urls }
  }

  function zwischenspeichern() {
    setErr(null)
    startTransition(async () => {
      const { felder_werte, foto_urls } = buildPayload()
      const res = await fetch(`/api/formular/${encodeURIComponent(initial.token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ felder_werte, foto_urls }),
      })
      const j = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) setErr(j.error ?? 'Speichern fehlgeschlagen')
    })
  }

  function einreichen() {
    setErr(null)
    const pflichtErr = validateFormularPflicht(felder, daten)
    if (pflichtErr) {
      setErr(pflichtErr)
      return
    }
    startTransition(async () => {
      const { felder_werte, foto_urls } = buildPayload()
      const res = await fetch(`/api/formular/${encodeURIComponent(initial.token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ felder_werte, foto_urls }),
      })
      const j = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        setErr(j.error ?? 'Senden fehlgeschlagen')
        return
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mb-4 text-5xl" aria-hidden><Check className="h-5 w-5 text-[#2E7D52]" aria-hidden /></div>
        <h1 className="text-2xl font-semibold text-bw-text">Vielen Dank!</h1>
        <p className="mt-2 text-bw-light">Ihre Angaben wurden übermittelt.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-xl font-semibold text-bw-text">{initial.tabName}</h1>
      <p className="mt-1 text-sm text-bw-light">Bitte füllen Sie die Felder aus.</p>

      <div className="mt-6">
        <div className="mb-2 flex justify-between text-xs text-bw-light">
          <span>
            Schritt {beantwortet} von {total} Feldern
          </span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bw-border">
          <div
            className={cn('h-full rounded-full bg-bw-accent transition-all')}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {err ? (
        <p className="mt-4 rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <Card className="mt-6 p-4">
        <FormularFelderRenderer
          felder={felder}
          daten={daten}
          onChange={setField}
          oeffentlicherFotoUpload
          onFotoDatei={handleFoto}
          maxFotos={BAUTAGEBUCH_MAX_FOTOS}
        />
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="secondary" fullWidth loading={pending} onClick={zwischenspeichern}>
          Zwischenspeichern
        </Button>
        <Button type="button" variant="primary" fullWidth loading={pending} onClick={einreichen}>
          Einreichen
        </Button>
      </div>
    </div>
  )
}
