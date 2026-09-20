'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { PublicProjektPayload } from '@/lib/projekt/load-public-projekt'
import type { AuftragStatus, LeadStatus } from '@/lib/types'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { TokenLinkInvalid } from '@/components/public/TokenLinkInvalid'
import { IconText } from '@/components/ui/IconText'
import { RichTextContent } from '@/components/ui/RichTextContent'
import { betragAnzeige } from '@/lib/angebot-einfach'
import { formatDatum } from '@/lib/utils'
import { aktuellePhaseIndexFromEntities } from '@/lib/auftraege/projekt-phasen'
import { formatEuro, formatDatumZeit } from '@/lib/format/geld-datum'

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

const PHASEN = ['Anfrage', 'Angebot', 'Auftrag', 'Abnahme', 'Fertig'] as const

export function ProjektStatusClient({
  initial,
  tel,
}: {
  initial: PublicProjektPayload | null
  tel: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightUpdateId = searchParams.get('update')?.trim() || null
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [angebotOpen, setAngebotOpen] = useState(false)
  const [alleUpdates, setAlleUpdates] = useState(false)

  useEffect(() => {
    setLastRefresh(new Date())
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      afterServerActionRefresh()
      setLastRefresh(new Date())
    }, 60_000)
    return () => clearInterval(id)
  }, [router])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        afterServerActionRefresh()
        setLastRefresh(new Date())
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [router])

  const timelineEarly = initial?.timeline ?? []
  const updatesFirstEarly = useMemo(() => timelineEarly.slice(0, 3), [timelineEarly])

  useEffect(() => {
    if (!initial || !highlightUpdateId || !timelineEarly.some((u) => u.id === highlightUpdateId)) return
    if (!alleUpdates && !updatesFirstEarly.some((u) => u.id === highlightUpdateId)) {
      setAlleUpdates(true)
    }
  }, [highlightUpdateId, initial, timelineEarly, alleUpdates, updatesFirstEarly])

  useEffect(() => {
    if (!initial || !highlightUpdateId) return
    const t = window.setTimeout(() => {
      const el = document.getElementById(`update-${highlightUpdateId}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(t)
  }, [highlightUpdateId, initial, alleUpdates, timelineEarly.length])

  const minuten = useMemo(() => {
    if (!lastRefresh) return 0
    return Math.max(0, Math.floor((Date.now() - lastRefresh.getTime()) / 60000))
  }, [lastRefresh])

  const siteFooter = process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/$/, '') ?? ''

  if (!initial) {
    return <TokenLinkInvalid />
  }

  const { auftrag, kunde, gewerkeLabels, angebote, timeline, nachtraegeAkzeptiert, leadStatus, milestones } = initial
  const ortLine = [kunde.plz, kunde.ort].filter(Boolean).join(' ') || '—'
  const adresseLine = kunde.adresse?.trim() || ortLine

  const gewerkTitle = gewerkeLabels.length ? gewerkeLabels.join(' · ') : auftrag.titel || 'Ihr Projekt'

  const nachtragSumme =
    nachtraegeAkzeptiert.reduce((s, n) => {
      const a =
        n.gesamt_min != null && n.gesamt_max != null
          ? (Number(n.gesamt_min) + Number(n.gesamt_max)) / 2
          : Number(n.gesamt_max ?? n.gesamt_min ?? 0)
      return s + (Number.isFinite(a) ? a : 0)
    }, 0) || 0

  const phaseIdx = aktuellePhaseIndexFromEntities({
    aufStatus: auftrag.status,
    hasAuftrag: true,
    hasAngebot: Boolean(angebote),
    leadStatus,
  })
  const pctBase = statusProgress(auftrag.status)
  const pct =
    typeof auftrag.fortschritt === 'number' && auftrag.fortschritt > 0 ? auftrag.fortschritt : pctBase

  const updatesFirst = timeline.slice(0, 3)
  const updatesAnzeige = alleUpdates ? timeline : updatesFirst

  const naechsterFreitext = auftrag.naechster_schritt?.trim()

  return (
    <div className="min-h-screen bg-bw-bg-soft pb-12 text-ink">
      <header className="bg-bw-dark px-4 py-4 text-white md:px-6">
        <div className="mx-auto flex max-w-[600px] items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo variant="white" height={32} />
            <span className="text-sm font-medium opacity-95">Ihr Projekt</span>
          </div>
          <p className="text-fs-caption opacity-80" suppressHydrationWarning>
            {lastRefresh ? `Aktualisiert vor ${minuten} Min.` : 'Aktualisiert …'}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4 py-6">
        <p className="text-xs font-medium uppercase tracking-wide text-bw-primary">Projekt</p>
        <h1 className="mt-1 text-xl font-semibold leading-snug text-bw-dark">{gewerkTitle}</h1>
        <p className="mt-2 text-sm text-muted">
          {adresseLine}
          {kunde.ort && kunde.plz ? ` · ${ortLine}` : null}
        </p>

        {/* 5 Phasen */}
        <section className="mt-8 overflow-x-auto pb-2">
          <div className="flex min-w-[520px] items-start justify-between gap-1 px-1">
            {PHASEN.map((label, i) => {
              const done = i < phaseIdx
              const active = i === phaseIdx
              return (
                <div key={label} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    {i > 0 ? (
                      <div className={`h-0.5 flex-1 ${i <= phaseIdx ? 'bg-bw-primary' : 'bg-bw-bg-soft'}`} />
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div
                      className={`mx-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border-2 text-xs font-bold ${
                        done
                          ? 'border-bw-primary bg-bw-primary text-white'
                          : active
                            ? 'border-bw-primary bg-white text-bw-dark'
                            : 'border-bw-border-strong bg-white text-bw-text-subtle'
                      }`}
                      aria-current={active ? 'step' : undefined}
                    >
                      {done ? (
                        <MockIcon n="check" ctx="default" className="h-4 w-4" aria-hidden />
                      ) : active ? (
                        <MockIcon n="circle" ctx="default" className="h-2.5 w-2.5 fill-current" aria-hidden />
                      ) : (
                        <MockIcon n="circle" ctx="default" className="h-3 w-3" aria-hidden />
                      )}
                    </div>
                    {i < PHASEN.length - 1 ? (
                      <div className={`h-0.5 flex-1 ${i < phaseIdx ? 'bg-bw-primary' : 'bg-bw-bg-soft'}`} />
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                  <p
                    className={`mt-2 max-w-[72px] text-fs-caption font-medium leading-tight md:max-w-none md:text-xs ${
                      active ? 'text-bw-dark' : 'text-bw-text-subtle'
                    }`}
                  >
                    {label}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mt-6 rounded-sheet border border-bw-border bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-muted">Fortschritt</p>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-pill bg-bw-bg-soft">
            <div
              className="h-full rounded-pill bg-bw-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-bw-dark">{statusLabel(auftrag.status)}</p>
        </section>

        {naechsterFreitext && auftrag.status !== 'abgeschlossen' && auftrag.status !== 'storniert' ? (
          <section className="mt-6 rounded-sheet border border-bw-border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bw-dark">Nächster Schritt</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-bw-text-mid">{naechsterFreitext}</p>
          </section>
        ) : null}

        {auftrag.abnahme_protokoll_url?.trim() ? (
          <section className="mt-6 rounded-sheet border border-bw-primary/30 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-bw-dark">Dokumente</h2>
            <p className="mt-1 text-sm text-muted">
              Abnahmeprotokoll
              {auftrag.abnahme_datum ? ` · ${formatDatum(auftrag.abnahme_datum)}` : ''}
            </p>
            <a
              href={auftrag.abnahme_protokoll_url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-[52px] items-center justify-center rounded-sheet bg-bw-primary px-4 text-base font-semibold text-white"
            >
              Abnahmeprotokoll öffnen (PDF)
            </a>
          </section>
        ) : null}

        {milestones.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Meilensteine</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-2 rounded-card border border-bw-border bg-white px-3 py-2">
                  <span className={m.erledigt ? 'text-bw-primary' : 'text-bw-text-subtle'}>
                    {m.erledigt ? <MockIcon n="check" ctx="default" className="h-4 w-4" aria-hidden /> : <MockIcon n="circle" ctx="default" className="h-3 w-3" aria-hidden />}
                  </span>
                  <div>
                    <p className="font-medium">{m.titel}</p>
                    {m.datum ? <p className="text-xs text-muted">{formatDatum(m.datum)}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {timeline.length > 0 ? (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Updates zu Ihrem Projekt</h2>
            {updatesAnzeige.map((u) => (
              <article
                key={u.id}
                id={`update-${u.id}`}
                className={`scroll-mt-24 rounded-sheet border bg-white p-4 shadow-sm ${
                  highlightUpdateId === u.id ? 'border-bw-primary ring-2 ring-bw-primary/25' : 'border-bw-border'
                }`}
              >
                <p className="text-xs text-muted">{formatDatumZeit(u.created_at)}</p>
                <p className="mt-1 font-medium text-bw-dark">{u.titel}</p>
                {u.beschreibung ? <p className="mt-2 whitespace-pre-wrap text-sm text-bw-text-mid">{u.beschreibung}</p> : null}
                {(u.foto_urls ?? []).length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(u.foto_urls ?? []).map((url) => (
                      <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-card bg-bw-bg-soft">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-28 w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            {timeline.length > 3 ? (
              <MockBtn fullWidth className="rounded-button border border-bw-border bg-white py-2 text-sm font-medium text-bw-primary" type="button" onClick={() => setAlleUpdates((v) => !v)}>
                {alleUpdates ? 'Weniger anzeigen ▲' : 'Alle Updates anzeigen ▼'}
              </MockBtn>
            ) : null}
          </section>
        ) : (
          <p className="mt-8 text-center text-sm text-muted">Noch keine Updates. Wir melden uns bald.</p>
        )}

        {angebote && angebote.positionen.length > 0 ? (
          <section className="mt-8 rounded-button border border-bw-border bg-white shadow-sm">
            <MockBtn fullWidth className="flex items-center justify-between px-4 py-3 text-left text-sm font-semibold text-bw-dark" type="button" onClick={() => setAngebotOpen((o) => !o)}>
              <span>Ihr Angebot ansehen</span>
              <span className="text-muted">{angebotOpen ? '▲' : '▼'}</span>
            </MockBtn>
            {angebotOpen ? (
              <div className="border-t border-bw-border px-4 pb-4 pt-2">
                <ul className="space-y-2 text-sm">
                  {angebote.positionen.map((p, i) => (
                    <li key={i} className="flex justify-between gap-2 border-b border-dashed border-bw-border pb-2 last:border-0">
                      <RichTextContent
                        html={(p.beschreibung || p.leistung).trim()}
                        className="min-w-0 text-sm"
                      />
                      <span className="shrink-0 whitespace-nowrap font-medium text-bw-primary">
                        {betragAnzeige(null, p.gesamt_min, p.gesamt_max)}
                      </span>
                    </li>
                  ))}
                </ul>
                {angebote.gesamt_min != null && angebote.gesamt_max != null ? (
                  <p className="mt-3 text-sm font-semibold">
                    Gesamt:{' '}
                    {betragAnzeige(
                      (angebote as { gesamt_fix?: number | null }).gesamt_fix ?? null,
                      angebote.gesamt_min,
                      angebote.gesamt_max
                    )}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-muted">Detailliertes Angebot finden Sie in Ihrer E-Mail.</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {nachtraegeAkzeptiert.length > 0 ? (
          <section className="mt-8 rounded-sheet border border-status-contact-bg bg-status-contact-bg p-4">
            <h2 className="text-sm font-semibold text-status-contact-text">Zusatzleistungen</h2>
            <ul className="mt-2 space-y-2 text-sm text-status-contact-text">
              {nachtraegeAkzeptiert.map((n) => (
                <li key={n.id} className="flex justify-between gap-2">
                  <span className="min-w-0">{n.grund}</span>
                  <span className="shrink-0 font-medium">
                    {betragAnzeige(null, n.gesamt_min, n.gesamt_max)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-semibold text-status-contact-text" suppressHydrationWarning>
              Gesamt Nachträge: +
              {formatEuro(nachtragSumme, { suffix: false })}{' '}
              €
            </p>
          </section>
        ) : null}

        <section className="mt-10 rounded-sheet border border-bw-border bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-bw-dark">Fragen zu Ihrem Projekt?</p>
          <a
            href={telHref(tel)}
            className="mt-4 flex min-h-[52px] items-center justify-center gap-2 rounded-sheet bg-bw-primary px-4 text-base font-semibold text-white"
          >
            <IconText icon="phone">{tel}</IconText>
          </a>
          {kunde.email ? (
            <a href={`mailto:${encodeURIComponent(kunde.email)}`} className="mt-3 block text-center text-sm text-bw-primary underline">
              <IconText icon="mail">{kunde.email}</IconText>
            </a>
          ) : null}
        </section>
      </main>

      <footer className="mt-10 border-t border-bw-border bg-bw-bg-soft px-4 py-6 text-center text-xs text-muted">
        Bärenwald Handwerksgruppe München
        <br />
        {siteFooter ? (
          <>
            <a href={`${siteFooter}/datenschutz`} className="text-bw-primary underline">
              Datenschutz
            </a>{' '}
            ·{' '}
            <a href={`${siteFooter}/impressum`} className="text-bw-primary underline">
              Impressum
            </a>
          </>
        ) : (
          <span>Datenschutz · Impressum (siehe Webseite)</span>
        )}
      </footer>
    </div>
  )
}
