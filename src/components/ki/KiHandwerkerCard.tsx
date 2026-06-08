import Link from 'next/link'
import type { HandwerkerRankingErgebnis, KiClusterAnalyseRow } from '@/lib/ki/types'
import { KiClaudeNarrative } from '@/components/ki/KiClaudeNarrative'

export function KiHandwerkerCard({ analyse }: { analyse: KiClusterAnalyseRow }) {
  const ergebnis = analyse.ergebnis as HandwerkerRankingErgebnis
  const zeilen = ergebnis.zeilen ?? []
  const tops = ergebnis.top_je_gewerk ?? []

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

      {tops.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-bw-border bg-bw-bg/60 px-4 py-2.5">
          {tops.map((t) => (
            <span
              key={t.gewerk}
              className="rounded-full border border-[#2E7D52]/30 bg-[#EAF3DE] px-2.5 py-1 text-[11px] text-[#2E7D52]"
            >
              {t.gewerk}: <strong>{t.handwerker}</strong> ({t.score.toFixed(1)})
            </span>
          ))}
        </div>
      ) : null}

      {zeilen.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">
          Noch keine Handwerker-Zuweisungen mit Preisdaten. Sobald Auftragspositionen Handwerker
          haben, erscheint hier das Ranking.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-bw-border bg-bw-bg text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-semibold">Handwerker</th>
                <th className="px-4 py-2 font-semibold">Gewerk</th>
                <th className="px-4 py-2 font-semibold text-right">Score</th>
                <th className="px-4 py-2 font-semibold text-right">Aufträge</th>
                <th className="px-4 py-2 font-semibold text-right">Bewertung</th>
                <th className="px-4 py-2 font-semibold text-right">Marge</th>
                <th className="px-4 py-2 font-semibold text-right">Antwort</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr
                  key={`${z.handwerker_id}-${z.gewerk}`}
                  className={`border-b border-bw-border/70 ${z.warnung && z.verlaesslich ? 'bg-red-50/60' : ''}`}
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/handwerker/${z.handwerker_id}`}
                      className="font-medium text-bw-primary hover:underline"
                    >
                      {z.handwerker_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-bw-text">{z.gewerk}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                    {z.score.toFixed(1)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {z.auftraege}
                    {!z.verlaesslich ? (
                      <span className="ml-1 text-[10px] text-amber-700">wenig Daten</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {z.bewertung != null ? `${z.bewertung.toFixed(1)} ★` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {z.marge_prozent != null ? `${z.marge_prozent.toFixed(1)} %` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                    {z.antwort_stunden != null ? `${z.antwort_stunden} h` : '—'}
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
