'use client'

import { useMemo, useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { acceptNachtragByToken, type NachtragPublicPayload } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { formatDatum } from '@/lib/utils'

function adresseText(k: NachtragPublicPayload['kunde']): string {
  const parts = [k.adresse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean)
  return parts.join(', ') || '—'
}

export function NachtragPublicForm({ initial }: { initial: NachtragPublicPayload }) {
  const [pending, startTransition] = useTransition()
  const [doneAt, setDoneAt] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const n = initial.nachtrag
  const pos = useMemo(() => normalizeAngebotPositionen(n.positionen ?? []), [n.positionen])
  const heute = useMemo(() => new Date().toLocaleDateString('de-DE'), [])

  if (n.kunde_bestaetigt_at) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-lg font-semibold text-[#2E7D52]">
          Sie haben diesen Nachtrag am {formatDatum(n.kunde_bestaetigt_at)} bestätigt.
        </p>
        <p className="mt-2 text-sm text-muted">Vielen Dank — die Angaben sind gespeichert.</p>
      </div>
    )
  }

  if (doneAt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Check className="mx-auto h-12 w-12 text-[#2E7D52]" aria-hidden />
        <p className="mt-4 text-xl font-semibold text-ink">Vielen Dank für Ihre Bestätigung.</p>
        <p className="mt-2 text-sm text-muted">Wir setzen die Arbeiten umgehend fort.</p>
        <p className="mt-4 text-xs text-muted">{new Date(doneAt).toLocaleString('de-DE')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24">
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bärenwald München</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Nachtrag zu Ihrem Auftrag</h1>
      </header>

      {!n.handwercher_bestaetigt ? (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Der ausführende Handwerker hat noch nicht bestätigt. Der Nachtrag ist noch nicht final — Sie können trotzdem
          bestätigen.
        </div>
      ) : null}

      {err ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p> : null}

      <section className="mb-4 rounded-xl border border-[#E5E3DF] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Projekt</h2>
        <p className="mt-1 text-sm">
          <span className="text-muted">Name:</span> {initial.kunde.name}
        </p>
        <p className="text-sm">
          <span className="text-muted">Adresse:</span> {adresseText(initial.kunde)}
        </p>
        <p className="text-sm">
          <span className="text-muted">Datum:</span> {heute}
        </p>
      </section>

      <section className="mb-4 rounded-xl border border-[#E5E3DF] bg-[#F7F6F3] p-4">
        <h2 className="text-sm font-semibold text-ink">Warum dieser Nachtrag?</h2>
        <p className="mt-2 text-base font-semibold text-ink">{n.grund}</p>
        {n.beschreibung ? <p className="mt-2 text-sm text-muted">{n.beschreibung}</p> : null}
      </section>

      <section className="mb-4 rounded-xl border border-[#E5E3DF] bg-white p-4">
        <h2 className="text-sm font-semibold text-ink">Was wird zusätzlich gemacht?</h2>
        <ul className="mt-2 divide-y divide-[#E5E3DF] text-sm">
          {pos.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{p.beschreibung}</span>
              <span className="font-medium text-[#2E7D52] whitespace-nowrap">
                {p.menge} {p.einheit} · {(p.gesamt_min * p.menge).toLocaleString('de-DE')} –{' '}
                {(p.gesamt_max * p.menge).toLocaleString('de-DE')} €
              </span>
            </li>
          ))}
        </ul>
      </section>

      {n.gesamt_min != null && n.gesamt_max != null ? (
        <div className="mb-4 rounded-xl bg-[#EAF3DE] px-4 py-3">
          <p className="text-xs font-medium text-[#2E7D52]">Gesamtkosten Nachtrag</p>
          <p className="text-xl font-bold text-[#1A3D2B]">
            + {n.gesamt_min.toLocaleString('de-DE')} – {n.gesamt_max.toLocaleString('de-DE')} €
          </p>
          <p className="text-xs text-[#2E7D52]">zusätzlich zum ursprünglichen Auftrag</p>
        </div>
      ) : null}

      <p className="mb-6 text-xs text-muted">
        Mit Ihrer Bestätigung beauftragen Sie Bärenwald München mit der Durchführung dieser Zusatzleistungen. Die
        Abrechnung erfolgt nach tatsächlichem Aufwand.
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setErr(null)
          startTransition(async () => {
            const r = await acceptNachtragByToken(n.token)
            if (!r.ok) {
              setErr(r.message)
              return
            }
            setDoneAt(new Date().toISOString())
          })
        }}
        className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#2E7D52] px-4 text-base font-semibold text-white disabled:opacity-50"
      >
        {pending ? '…' : 'Ich stimme dem Nachtrag zu'}
      </button>

      <p className="mt-6 text-center text-sm text-muted">
        Rückfragen?{' '}
        <a href="tel:+49891234567" className="font-medium text-[#2E7D52] underline">
          Anrufen
        </a>
      </p>
    </div>
  )
}
