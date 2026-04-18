'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PublicProjektPayload } from '@/lib/projekt/load-public-projekt'
import type { AuftragStatus } from '@/lib/types'
import { formatDatum, formatDatumZeit } from '@/lib/utils'

function statusProgress(status: AuftragStatus): number {
  switch (status) {
    case 'offen':
      return 40
    case 'in_arbeit':
      return 65
    case 'abnahme':
      return 85
    case 'abgeschlossen':
      return 100
    case 'storniert':
      return 0
    default:
      return 35
  }
}

function statusLabel(status: AuftragStatus): string {
  if (status === 'offen') return 'Offen'
  if (status === 'in_arbeit') return 'In Arbeit'
  if (status === 'abnahme') return 'Abnahme'
  if (status === 'abgeschlossen') return 'Abgeschlossen'
  if (status === 'storniert') return 'Storniert'
  return status
}

function telHref(tel: string) {
  const digits = tel.replace(/\s/g, '')
  return digits.startsWith('+') ? `tel:${digits}` : `tel:${digits}`
}

export function ProjektStatusClient({
  initial,
  tel,
}: {
  initial: PublicProjektPayload | null
  tel: string
}) {
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState(() => new Date())
  const [angebotOpen, setAngebotOpen] = useState(false)
  const [alleUpdates, setAlleUpdates] = useState(false)

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      setLastRefresh(new Date())
    }, 60_000)
    return () => clearInterval(id)
  }, [router])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        router.refresh()
        setLastRefresh(new Date())
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [router])

  const minuten = useMemo(() => Math.max(0, Math.floor((Date.now() - lastRefresh.getTime()) / 60000)), [lastRefresh])

  if (!initial) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] px-4 py-16 text-center text-ink">
        <p className="text-lg font-semibold">Dieser Link ist nicht mehr gültig.</p>
        <p className="mt-3 text-sm text-muted">Bitte kontaktieren Sie uns:</p>
        <a href={telHref(tel)} className="mt-4 inline-block text-lg font-semibold text-[#2E7D52] underline">
          {tel}
        </a>
      </div>
    )
  }

  const { auftrag, kunde, gewerkeLabels, angebote, timeline, nachtraegeAkzeptiert } = initial
  const pct = statusProgress(auftrag.status)
  const ortLine = [kunde.plz, kunde.ort].filter(Boolean).join(' ') || '—'
  const adresseLine = kunde.adresse?.trim() || ortLine

  const gewerkTitle = gewerkeLabels.length ? gewerkeLabels.join(' · ') : auftrag.titel || 'Ihr Projekt'

  const schritte: { key: string; label: string }[] = [
    { key: 'a1', label: 'Anfrage eingegangen' },
    { key: 'a2', label: 'Angebot erstellt' },
    { key: 'a3', label: 'Auftrag bestätigt' },
    { key: 'a4', label: 'Arbeiten gestartet' },
    {
      key: 'a4b',
      label:
        gewerkeLabels.length > 0
          ? `Aktuelle Gewerke: ${gewerkeLabels.join(', ')}`
          : 'Ausführung durch unsere Handwerksbetriebe',
    },
    { key: 'a5', label: 'Abnahme' },
    { key: 'a6', label: 'Abgeschlossen' },
  ]

  const aktuell = (() => {
    const st = auftrag.status
    if (st === 'storniert') return 0
    if (st === 'abgeschlossen') return 6
    if (st === 'abnahme') return 5
    if (st === 'in_arbeit') return 4
    if (st === 'offen') return angebote ? 3 : 2
    return 2
  })()

  const nachtragSumme =
    nachtraegeAkzeptiert.reduce((s, n) => {
      const a = n.gesamt_min != null && n.gesamt_max != null ? (Number(n.gesamt_min) + Number(n.gesamt_max)) / 2 : Number(n.gesamt_max ?? n.gesamt_min ?? 0)
      return s + (Number.isFinite(a) ? a : 0)
    }, 0) || 0

  const letzte = timeline[0]
  const updatesAnzeige = alleUpdates ? timeline : timeline.slice(0, 1)

  const logoUrl = process.env.NEXT_PUBLIC_EMAIL_LOGO_URL ?? ''

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-12 text-ink">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#E5E3DF] bg-[#F7F6F3]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} width={32} height={32} alt="" className="h-8 w-8 object-contain" />
          ) : (
            <span className="text-sm font-bold text-[#1A3D2B]">Bärenwald</span>
          )}
        </div>
        <p className="max-w-[55%] text-right text-[11px] text-muted">Zuletzt aktualisiert: vor {minuten} Min.</p>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[#2E7D52]">Ihr Projekt</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug">{gewerkTitle}</h1>
        <p className="mt-2 text-sm text-muted">
          Adresse / PLZ: {adresseLine}
          {kunde.ort && kunde.plz ? ` · ${ortLine}` : null}
        </p>

        <section className="mt-8 rounded-xl border border-[#E5E3DF] bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-muted">Fortschritt</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#E5E3DF]">
            <div
              className="h-full rounded-full bg-[#2E7D52] transition-all"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-[#1A3D2B]">{statusLabel(auftrag.status)}</p>
          <p className="text-center text-xs text-muted">{pct}%</p>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-ink">Status</h2>
          <ol className="mt-4 space-y-0 border-l-2 border-[#E5E3DF] pl-4">
            {schritte.map((s, idx) => {
              const done = idx < aktuell || (idx === 1 && !angebote)
              const current = idx === aktuell
              return (
                <li key={s.key} className="relative pb-6 last:pb-0">
                  <span
                    className="absolute -left-[21px] top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white text-[10px]"
                    style={{
                      borderColor: done || current ? '#2E7D52' : '#ccc',
                      color: done ? '#2E7D52' : current ? '#1A3D2B' : '#999',
                    }}
                  >
                    {done ? '✓' : current ? '▶' : '○'}
                  </span>
                  <p className={`text-sm ${current ? 'font-semibold text-[#1A3D2B]' : 'text-muted'}`}>{s.label}</p>
                </li>
              )
            })}
          </ol>
        </section>

        {timeline.length > 0 ? (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Letztes Update</h2>
            {updatesAnzeige.map((u) => (
              <article key={u.id} className="rounded-xl border border-[#E5E3DF] bg-white p-4 shadow-sm">
                <p className="text-xs text-muted">{formatDatumZeit(u.created_at)}</p>
                <p className="mt-1 font-medium">{u.titel}</p>
                {u.beschreibung ? <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{u.beschreibung}</p> : null}
                {(u.foto_urls ?? []).length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(u.foto_urls ?? []).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg bg-canvas">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-28 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {timeline.length > 1 ? (
              <button
                type="button"
                className="w-full rounded-lg border border-border py-2 text-sm font-medium text-primary"
                onClick={() => setAlleUpdates((v) => !v)}
              >
                {alleUpdates ? 'Weniger anzeigen' : 'Alle Updates anzeigen'}
              </button>
            ) : null}
          </section>
        ) : null}

        {auftrag.status !== 'abgeschlossen' && auftrag.status !== 'storniert' ? (
          <section className="mt-8 rounded-xl border border-[#E5E3DF] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Nächster Schritt</h2>
            {auftrag.status === 'offen' ? (
              <p className="mt-2 text-sm text-muted">
                Wir starten die Arbeiten ab{' '}
                <strong>{auftrag.start_datum ? formatDatum(auftrag.start_datum) : '— (Termin folgt)'}</strong>.
              </p>
            ) : null}
            {auftrag.status === 'in_arbeit' ? (
              <p className="mt-2 text-sm text-muted">
                Voraussichtliche Fertigstellung:{' '}
                <strong>{auftrag.end_datum ? formatDatum(auftrag.end_datum) : '—'}</strong>
              </p>
            ) : null}
            {auftrag.status === 'abnahme' ? (
              <p className="mt-2 text-sm text-muted">Abnahme-Termin vereinbaren — wir melden uns bei Ihnen.</p>
            ) : null}
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
            <p className="text-sm font-semibold text-emerald-950">Alle Arbeiten abgeschlossen</p>
            <p className="mt-1 text-sm text-emerald-900">Vielen Dank für Ihr Vertrauen.</p>
          </section>
        )}

        {angebote && angebote.positionen.length > 0 ? (
          <section className="mt-8 rounded-xl border border-[#E5E3DF] bg-white shadow-sm">
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold"
              onClick={() => setAngebotOpen((o) => !o)}
            >
              <span>Ihr Angebot ansehen</span>
              <span className="text-muted">{angebotOpen ? '▲' : '▼'}</span>
            </button>
            {angebotOpen ? (
              <div className="border-t border-border px-4 pb-4 pt-2">
                <ul className="space-y-2 text-sm">
                  {angebote.positionen.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-dashed border-border pb-2 last:border-0">
                      <span className="min-w-0">{(p.beschreibung || p.leistung).trim()}</span>
                      <span className="shrink-0 whitespace-nowrap font-medium text-[#2E7D52]">
                        {p.gesamt_min.toLocaleString('de-DE')} – {p.gesamt_max.toLocaleString('de-DE')} €
                      </span>
                    </li>
                  ))}
                </ul>
                {angebote.gesamt_min != null && angebote.gesamt_max != null ? (
                  <p className="mt-3 text-sm font-semibold">
                    Gesamt: {angebote.gesamt_min.toLocaleString('de-DE')} – {angebote.gesamt_max.toLocaleString('de-DE')} €
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted">Detailliertes Angebot finden Sie in Ihrer E-Mail.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {nachtraegeAkzeptiert.length > 0 ? (
          <section className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold text-amber-950">Zusatzleistungen</h2>
            <ul className="mt-2 space-y-2 text-sm text-amber-950">
              {nachtraegeAkzeptiert.map((n) => (
                <li key={n.id} className="flex justify-between gap-2">
                  <span className="min-w-0">{n.grund}</span>
                  <span className="shrink-0 font-medium">
                    {n.gesamt_min != null && n.gesamt_max != null
                      ? `${Number(n.gesamt_min).toLocaleString('de-DE')} – ${Number(n.gesamt_max).toLocaleString('de-DE')} €`
                      : '—'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold text-amber-950">
              Gesamt Nachträge: +{nachtragSumme.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
          </section>
        ) : null}

        <section className="mt-10 rounded-xl border border-[#E5E3DF] bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold">Fragen zu Ihrem Projekt?</p>
          <a
            href={telHref(tel)}
            className="mt-4 flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2E7D52] px-4 text-base font-semibold text-white"
          >
            📞 {tel}
          </a>
          {kunde.email ? (
            <a href={`mailto:${encodeURIComponent(kunde.email)}`} className="mt-3 block text-center text-sm text-[#2E7D52] underline">
              ✉️ {kunde.email}
            </a>
          ) : null}
        </section>

        {letzte ? <p className="mt-6 text-center text-[11px] text-muted">Stand: {formatDatumZeit(letzte.created_at)}</p> : null}

        <footer className="mt-10 text-center text-[11px] text-muted">Bärenwald München</footer>
      </main>
    </div>
  )
}
