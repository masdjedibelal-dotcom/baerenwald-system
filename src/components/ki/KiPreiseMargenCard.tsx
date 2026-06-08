import type { KiClusterAnalyseRow, PreiseMargenErgebnis } from '@/lib/ki/types'
import { KiClaudeNarrative } from '@/components/ki/KiClaudeNarrative'

function formatEur(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function margeClass(marge: number) {
  if (marge >= 20) return 'text-[#2E7D52] bg-[#EAF3DE]'
  if (marge >= 15) return 'text-amber-800 bg-amber-50'
  return 'text-red-800 bg-red-50'
}

export function KiPreiseMargenCard({ analyse }: { analyse: KiClusterAnalyseRow }) {
  const ergebnis = analyse.ergebnis as PreiseMargenErgebnis
  const zeilen = ergebnis.zeilen ?? []

  return (
    <article className="rounded-xl border border-bw-border bg-bw-card overflow-hidden">
      <header className="border-b border-bw-border px-4 py-3">
        <h3 className="text-sm font-semibold text-bw-text">{analyse.titel}</h3>
        <p className="mt-1 text-xs text-muted">{ergebnis.hinweis}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {ergebnis.region_label} · Aktualisiert{' '}
          {new Date(analyse.generiert_am).toLocaleString('de-DE')}
        </p>
      </header>

      <KiClaudeNarrative text={analyse.narrative} />

      {zeilen.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          Noch keine auswertbaren Aufträge. Sobald Aufträge mit Positionen und Preisen vorliegen,
          erscheint hier der Preisrahmen je Gewerk.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-bw-border bg-bw-bg text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-semibold">Gewerk</th>
                <th className="px-4 py-2 font-semibold">Region</th>
                <th className="px-4 py-2 font-semibold text-right">Aufträge</th>
                <th className="px-4 py-2 font-semibold text-right">Preisrahmen</th>
                <th className="px-4 py-2 font-semibold text-right">Ø Marge</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={`${z.gewerk}-${z.plz_region}`} className="border-b border-bw-border/70">
                  <td className="px-4 py-2.5 font-medium text-bw-text">{z.gewerk}</td>
                  <td className="px-4 py-2.5 text-muted">{z.plz_region}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {z.anzahl}
                    {!z.verlaesslich ? (
                      <span className="ml-1 text-[10px] text-amber-700">wenig Daten</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-bw-text">
                    {formatEur(z.preis_min)} – {formatEur(z.preis_max)}
                    <div className="text-[11px] text-muted">Median {formatEur(z.preis_median)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${margeClass(z.marge_prozent)}`}
                    >
                      {z.marge_prozent.toFixed(1)} %
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}
