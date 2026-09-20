import Link from 'next/link'
import type { HandwerkerRankingErgebnis } from '@/lib/ki/types'
import { MockTable } from '@/components/mock-ui'
import { KiCardShell } from '@/components/ki/KiCardShell'
import { KiEmptyCardBody, type KiCardProps } from '@/components/ki/ki-card-shared'

export function KiHandwerkerCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as HandwerkerRankingErgebnis
  const zeilen = ergebnis.zeilen ?? []
  const tops = ergebnis.top_je_gewerk ?? []
  const empty = zeilen.length === 0

  const hero =
    tops.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {tops.map((t) => (
          <span
            key={t.gewerk}
            className="rounded-pill border border-bw-primary/30 bg-bw-green-bg px-3 py-1.5 text-sm text-bw-primary"
          >
            {t.gewerk}: <strong>{t.handwerker}</strong> ({t.score.toFixed(1)})
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted">Noch kein Ranking</p>
    )

  const details = (
    <MockTable wrapClassName="overflow-x-auto" className="w-full min-w-[560px] text-left text-sm">
      <thead>
        <tr className="border-b border-bw-border text-fs-caption uppercase text-muted">
          <th className="px-2 py-2 font-semibold">Partner</th>
          <th className="px-2 py-2 font-semibold">Gewerk</th>
          <th className="px-2 py-2 text-right font-semibold">Score</th>
          <th className="px-2 py-2 text-right font-semibold">Marge</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((z) => (
          <tr
            key={`${z.handwerker_id}-${z.gewerk}`}
            className={`border-b border-bw-border/70 ${z.warnung && z.verlaesslich ? 'bg-status-cancel-bg/50' : ''}`}
          >
            <td className="py-2">
              <Link href={`/handwerker/${z.handwerker_id}`} className="font-medium text-bw-primary hover:underline">
                {z.handwerker_name}
              </Link>
            </td>
            <td className="py-2 text-muted">{z.gewerk}</td>
            <td className="py-2 text-right font-semibold tabular-nums">{z.score.toFixed(1)}</td>
            <td className="py-2 text-right tabular-nums text-muted">
              {z.marge_prozent != null ? `${z.marge_prozent.toFixed(1)}%` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </MockTable>
  )

  return (
    <KiCardShell
      analyse={analyse}
      hinweis={ergebnis.hinweis}
      onGenerateKi={onGenerateKi}
      kiLoading={kiLoading}
      hero={hero}
      details={details}
      empty={empty}
      emptyBody={
        <KiEmptyCardBody
          title="Noch kein Partner-Ranking"
          hint="Auftragspositionen mit Partner und Partner-Preisen füllen das Ranking."
        />
      }
    />
  )
}
