'use client'

import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
import { useState } from 'react'
import type { KiEmpfehlungRow } from '@/lib/ki-hub/types'

type Props = {
  items: KiEmpfehlungRow[]
  analyseLauf: string | null
  analyzing?: boolean
  onMarkDone?: (id: string) => Promise<void>
}

const KATEGORIE_LABELS: Record<string, string> = {
  saison: 'Saison',
  nachfrage: 'Nachfrage',
  foerderung: 'Förderung',
  wettbewerb: 'Wettbewerb',
  kosten: 'Kosten',
  seo: 'SEO & Sichtbarkeit',
  regulierung: 'Regulierung',
  sonstiges: 'Markt',
}

const RELEVANZ_STYLES: Record<string, string> = {
  hoch: 'bg-status-contact-bg text-status-contact-text border-status-contact-bg',
  mittel: 'bg-status-new-bg text-status-new-text border-status-new-bg',
  gering: 'bg-bw-bg text-muted border-bw-border',
}

function meta(row: KiEmpfehlungRow) {
  const d = row.daten_basis as {
    kategorie?: string
    bezug_crm?: string | null
    handlung?: string | null
    quelle_hinweis?: string | null
    relevanz?: string
  } | null
  return d ?? {}
}

export function KiHubMarktTrendsSection({
  items,
  analyseLauf,
  analyzing = false,
  onMarkDone,
}: Props) {
  const [doneLoading, setDoneLoading] = useState<string | null>(null)

  async function handleDone(id: string) {
    if (!onMarkDone) return
    setDoneLoading(id)
    try {
      await onMarkDone(id)
    } finally {
      setDoneLoading(null)
    }
  }

  return (
    <section className="rounded-sheet border border-bw-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-bw-primary/10 text-bw-primary">
          <MockIcon n="trending-up" ctx="default" className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-bw-text">Markt &amp; Trends</h2>
          <p className="mt-0.5 text-xs text-muted">
            Live-Recherche (Anthropic Web Search) + Bezug zu euren CRM- und Marketing-Daten
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const m = meta(item)
            const kategorie = KATEGORIE_LABELS[String(m.kategorie ?? 'sonstiges')] ?? 'Markt'
            const relevanz = String(m.relevanz ?? item.prioritaet ?? 'mittel').toLowerCase()
            const relevanzStyle = RELEVANZ_STYLES[relevanz] ?? RELEVANZ_STYLES.mittel

            return (
              <li
                key={item.id}
                className="rounded-card border border-bw-border/80 bg-bw-bg p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-field border border-bw-primary/20 bg-bw-primary/5 px-2 py-0.5 text-fs-caption font-semibold uppercase tracking-wide text-bw-primary">
                    {kategorie}
                  </span>
                  <span
                    className={`rounded-field border px-2 py-0.5 text-fs-caption font-medium capitalize ${relevanzStyle}`}
                  >
                    Relevanz: {relevanz}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-semibold text-bw-text">{item.titel}</h3>

                {item.beschreibung ? (
                  <p className="mt-1 text-sm text-bw-text">{item.beschreibung}</p>
                ) : null}

                {m.bezug_crm ? (
                  <p className="mt-2 text-xs text-bw-text">
                    <span className="font-medium">Bezug zu euren Daten:</span> {m.bezug_crm}
                  </p>
                ) : null}

                {m.handlung ? (
                  <p className="mt-2 rounded-field border border-status-order-bg/80 bg-status-order-bg/80 px-2.5 py-2 text-xs text-status-order-text">
                    <span className="font-medium">Handlung:</span> {m.handlung}
                  </p>
                ) : null}

                {m.quelle_hinweis ? (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
                    <MockIcon n="world" ctx="default" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    {m.quelle_hinweis}
                  </p>
                ) : null}

                {onMarkDone ? (
                  <MockBtn className="mt-3 inline-flex items-center gap-1 rounded-button border border-bw-border bg-white px-2.5 py-1 text-xs font-medium hover:bg-surface disabled:opacity-50" type="button" onClick={() => void handleDone(item.id)} disabled={doneLoading === item.id}>
                    <MockIcon n="check" ctx="default" className="h-3.5 w-3.5" />
                    Gelesen
                  </MockBtn>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-4 rounded-card border border-dashed border-bw-border bg-bw-bg px-4 py-6 text-center">
          {analyzing ? (
            <p className="text-sm text-muted">Markt-Recherche läuft…</p>
          ) : analyseLauf ? (
            <p className="text-sm text-muted">
              In der letzten Analyse keine Markt-Trends — Web-Recherche erneut mit{' '}
              <strong className="font-medium text-bw-text">Aktualisieren</strong> starten.
            </p>
          ) : (
            <p className="text-sm text-muted">
              Erscheint nach der ersten KI-Analyse mit Web-Recherche (Saison, Förderungen,
              Wettbewerb, SEO …).
            </p>
          )}
        </div>
      )}
    </section>
  )
}
