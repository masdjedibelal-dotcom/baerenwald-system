'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { KiClusterAnalyseRow, ProduktePaketeErgebnis } from '@/lib/ki/types'
import { KiClaudeNarrative } from '@/components/ki/KiClaudeNarrative'

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)

  if (!text.trim()) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[11px] text-bw-primary hover:underline"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>
      <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-bw-bg px-3 py-2 text-xs text-bw-text font-sans">
        {text}
      </pre>
    </div>
  )
}

export function KiProdukteCard({ analyse }: { analyse: KiClusterAnalyseRow }) {
  const ergebnis = analyse.ergebnis as ProduktePaketeErgebnis
  const zeilen = ergebnis.zeilen ?? []

  return (
    <article className="rounded-xl border border-bw-border bg-bw-card overflow-hidden">
      <header className="border-b border-bw-border px-4 py-3">
        <h3 className="text-sm font-semibold text-bw-text">{analyse.titel}</h3>
        <p className="mt-1 text-xs text-muted">{ergebnis.hinweis}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          Aktualisiert {new Date(analyse.generiert_am).toLocaleString('de-DE')}
        </p>
      </header>

      <KiClaudeNarrative text={analyse.narrative} />

      {zeilen.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          Noch keine wiederkehrenden Leistungs-Kombinationen erkennbar.
        </p>
      ) : (
        <div className="divide-y divide-bw-border">
          {zeilen.map((z) => (
            <div key={z.gewerk} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-bw-text">{z.gewerk}</h4>
                  <p className="mt-0.5 text-xs text-muted">
                    {z.auftraege} Aufträge
                    {!z.verlaesslich ? ' · wenig Daten für Festpreise' : ''}
                  </p>
                </div>
                {z.festpreis_hinweis ? (
                  <p className="text-xs font-medium text-[#2E7D52]">{z.festpreis_hinweis}</p>
                ) : null}
              </div>

              {z.standardpakete.length > 0 ? (
                <div className="mt-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Standardpakete
                  </p>
                  {z.standardpakete.map((paket) => (
                    <div
                      key={paket.name + paket.haeufigkeit}
                      className="rounded-lg border border-bw-border bg-bw-bg/50 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-bw-text">{paket.name}</p>
                        <p className="text-xs text-muted">
                          {paket.haeufigkeit}× ({paket.anteil_prozent.toFixed(0)} %)
                          {paket.vk_median != null ? ` · ${formatEur(paket.vk_median)}` : ''}
                        </p>
                      </div>
                      <ul className="mt-1.5 flex flex-wrap gap-1">
                        {paket.leistungen.map((l) => (
                          <li
                            key={l}
                            className="rounded-full border border-bw-border bg-bw-card px-2 py-0.5 text-[11px] text-bw-text"
                          >
                            {l}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1.5 text-[11px] text-muted">{paket.koordination}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {z.kombinationen.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Leistungen die zusammen vorkommen
                  </p>
                  <ul className="mt-1 space-y-1.5 text-xs">
                    {z.kombinationen.slice(0, 4).map((k) => (
                      <li key={k.leistung} className="text-bw-text">
                        <strong>{k.leistung}</strong>
                        <span className="text-muted"> → </span>
                        {k.typisch_mit.map((m) => `${m.leistung} (${m.zusammen}×)`).join(', ')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <CopyBlock text={z.angebot_ablauf_vorschlag} label="Angebots-Ablauf (Vorschlag)" />
              {z.koordination_vorschlag ? (
                <p className="mt-2 text-xs text-muted">
                  <span className="font-medium">Disposition: </span>
                  {z.koordination_vorschlag}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
