'use client'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useTransition } from '@/components/ui/action-busy'

import { useMemo, useState } from 'react'
import { acceptNachtragByToken, type NachtragPublicPayload } from '@/app/(dashboard)/auftraege/nachtrag-baustopp-actions'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { formatDatum } from '@/lib/utils'
import { formatEuroSpanne, formatDatumZeit } from '@/lib/format/geld-datum'

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
  const heute = useMemo(() => formatDatum(new Date().toISOString()), [])

  if (n.kunde_bestaetigt_at) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-lg font-semibold text-bw-primary">
          Sie haben diesen Nachtrag am {formatDatum(n.kunde_bestaetigt_at)} bestätigt.
        </p>
        <p className="mt-2 text-sm text-muted">Vielen Dank — die Angaben sind gespeichert.</p>
      </div>
    )
  }

  if (doneAt) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <MockIcon n="check" ctx="default" className="mx-auto h-12 w-12 text-bw-primary" aria-hidden />
        <p className="mt-4 text-xl font-semibold text-ink">Vielen Dank für Ihre Bestätigung.</p>
        <p className="mt-2 text-sm text-muted">Wir setzen die Arbeiten umgehend fort.</p>
        <p className="mt-4 text-xs text-muted">{formatDatumZeit(doneAt)}</p>
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
        <div className="mb-4 rounded-card border border-status-contact-bg bg-status-contact-bg px-3 py-2 text-sm text-status-contact-text">
          Der ausführende Partner hat noch nicht bestätigt. Der Nachtrag ist noch nicht final — Sie können trotzdem
          bestätigen.
        </div>
      ) : null}

      {err ? <p className="mb-3 rounded-card bg-status-cancel-bg px-3 py-2 text-sm text-status-cancel-text">{err}</p> : null}

      <section className="mb-4 rounded-sheet border border-bw-border bg-white p-4 shadow-sm">
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

      <section className="mb-4 rounded-sheet border border-bw-border bg-bw-bg-soft p-4">
        <h2 className="text-sm font-semibold text-ink">Warum dieser Nachtrag?</h2>
        <p className="mt-2 text-base font-semibold text-ink">{n.grund}</p>
        {n.beschreibung ? <p className="mt-2 text-sm text-muted">{n.beschreibung}</p> : null}
      </section>

      <section className="mb-4 rounded-sheet border border-bw-border bg-white p-4">
        <h2 className="text-sm font-semibold text-ink">Was wird zusätzlich gemacht?</h2>
        <ul className="mt-2 divide-y divide-bw-border text-sm">
          {pos.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{p.beschreibung}</span>
              <span className="font-medium text-bw-primary whitespace-nowrap">
                {p.menge} {p.einheit} · {formatEuroSpanne(p.gesamt_min * p.menge, p.gesamt_max * p.menge)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {n.gesamt_min != null && n.gesamt_max != null ? (
        <div className="mb-4 rounded-sheet bg-bw-green-bg px-4 py-3">
          <p className="text-xs font-medium text-bw-primary">Gesamtkosten Nachtrag</p>
          <p className="text-xl font-bold text-bw-dark">
            + {formatEuroSpanne(n.gesamt_min, n.gesamt_max)}
          </p>
          <p className="text-xs text-bw-primary">zusätzlich zum ursprünglichen Auftrag</p>
        </div>
      ) : null}

      <p className="mb-6 text-xs text-muted">
        Mit Ihrer Bestätigung beauftragen Sie Bärenwald München mit der Durchführung dieser Zusatzleistungen. Die
        Abrechnung erfolgt nach tatsächlichem Aufwand.
      </p>

      <MockBtn fullWidth className="flex min-h-[48px] items-center justify-center rounded-button bg-bw-primary px-4 text-base font-semibold text-white disabled:opacity-50" type="button" disabled={pending} onClick={() => {
          setErr(null)
          startTransition(async () => {
            const r = await acceptNachtragByToken(n.token)
            if (!r.ok) {
              setErr(r.message)
              return
            }
            setDoneAt(new Date().toISOString())
          })
        }}>
        {pending ? '…' : 'Ich stimme dem Nachtrag zu'}
      </MockBtn>

      <p className="mt-6 text-center text-sm text-muted">
        Rückfragen?{' '}
        <a href="tel:+49891234567" className="font-medium text-bw-primary underline">
          Anrufen
        </a>
      </p>
    </div>
  )
}
