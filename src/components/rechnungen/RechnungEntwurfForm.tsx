'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AngebotPosition } from '@/lib/types'
import { createRechnungEntwurf } from '@/app/(dashboard)/rechnungen/actions'
import { DEFAULT_MWST_SATZ } from '@/lib/rechnung-config'

function addDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function RechnungEntwurfForm({
  angebot_id,
  auftrag_id,
  kunde_id,
  positionen: initialPos,
  zahlungszielTage,
}: {
  angebot_id: string | null
  auftrag_id: string | null
  kunde_id: string
  positionen: AngebotPosition[]
  zahlungszielTage: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [faellig, setFaellig] = useState(() => addDaysIso(zahlungszielTage))
  const [err, setErr] = useState<string | null>(null)

  const jsonPreview = useMemo(() => JSON.stringify(initialPos, null, 2), [initialPos])

  function submit() {
    setErr(null)
    startTransition(async () => {
      const res = await createRechnungEntwurf({
        angebot_id,
        auftrag_id,
        kunde_id,
        positionen: initialPos,
        leistungszeitraum_von: von || null,
        leistungszeitraum_bis: bis || null,
        faellig_am: faellig || null,
        mwst_satz: DEFAULT_MWST_SATZ,
      })
      if (!res.ok) {
        setErr(res.message)
        return
      }
      router.push(`/rechnungen/${res.id}`)
      router.refresh()
    })
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {err ? (
        <p className="rounded-lg border border-danger/40 bg-danger/5 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}
      <p className="text-sm text-muted">
        Positionen und Beträge werden aus dem Angebot übernommen (untere Spanne). Nach dem Anlegen
        können Sie die Rechnung im Detail prüfen und das PDF erzeugen.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input type="date" label="Leistung von" value={von} onChange={(e) => setVon(e.target.value)} />
        <Input type="date" label="Leistung bis" value={bis} onChange={(e) => setBis(e.target.value)} />
      </div>
      <Input type="date" label="Fällig am" value={faellig} onChange={(e) => setFaellig(e.target.value)} />
      <details className="rounded-lg border border-border bg-canvas/50 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-ink">Positionen (JSON)</summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-muted">{jsonPreview}</pre>
      </details>
      <Button type="button" variant="primary" loading={pending} onClick={() => submit()}>
        Rechnung anlegen
      </Button>
    </div>
  )
}
