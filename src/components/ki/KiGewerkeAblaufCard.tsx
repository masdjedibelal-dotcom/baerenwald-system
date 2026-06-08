import type { GewerkeAblaufErgebnis, KiClusterAnalyseRow } from '@/lib/ki/types'
import { KiClaudeNarrative } from '@/components/ki/KiClaudeNarrative'

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function KiGewerkeAblaufCard({ analyse }: { analyse: KiClusterAnalyseRow }) {
  const ergebnis = analyse.ergebnis as GewerkeAblaufErgebnis
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
          Noch keine Auftragspositionen mit Gewerk und Preisen. Sobald Aufträge mit Leistungen
          gepflegt sind, erscheinen hier Ablauf-Muster je Gewerk.
        </p>
      ) : (
        <div className="divide-y divide-bw-border">
          {zeilen.map((z) => (
            <div key={z.gewerk} className="px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-bw-text">{z.gewerk}</h4>
                  <p className="mt-0.5 text-xs text-muted">
                    {z.auftraege} Aufträge · {z.positionen_gesamt} Positionen
                    {!z.verlaesslich ? ' · wenig Daten' : ''}
                  </p>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <div className="font-medium text-bw-text">
                    Marge {z.marge_prozent.toFixed(1)} %
                  </div>
                  <div className="text-muted">
                    VK {formatEur(z.vk_median)} · Fremd {z.fremdleistung_anteil_prozent.toFixed(0)} %
                  </div>
                </div>
              </div>

              <p className="mt-2 rounded-lg bg-bw-bg px-3 py-2 text-xs text-bw-text">
                <span className="font-medium text-muted">Ablauf: </span>
                {z.ablauf_text}
                {z.dauer_gesamt_tage_median != null ? (
                  <span className="text-muted"> · gesamt ~{z.dauer_gesamt_tage_median} Tage</span>
                ) : null}
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Typische Leistungen
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-bw-text">
                    {z.typische_leistungen.slice(0, 5).map((l) => (
                      <li key={l.name}>
                        {l.name}{' '}
                        <span className="text-muted">
                          ({l.count}×, {l.anteil_prozent.toFixed(0)} %)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Kostenstruktur (Median)
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-bw-text">
                    <li>Verkauf (VK): {formatEur(z.vk_median)}</li>
                    <li>EK Partner: {formatEur(z.ek_partner_median)}</li>
                    <li>EK Eigen: {formatEur(z.ek_eigen_median)}</li>
                  </ul>
                  {z.phasen_ablauf.length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-xs text-muted">
                      {z.phasen_ablauf.map((p) => (
                        <li key={p.phase}>
                          {p.phase}
                          {p.dauer_tage_median != null ? ` · ~${p.dauer_tage_median} T` : ''}
                          <span className="text-[10px]"> ({p.auftraege_mit_phase} Auftr.)</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
