import type { PreiseMargenErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import {
  KiEmptyCardBody,
  KiHeroStat,
  type KiCardProps,
  formatEur,
  margeClass,
} from '@/components/ki/ki-card-shared'

export function KiPreiseMargenCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as PreiseMargenErgebnis
  const zeilen = ergebnis.zeilen ?? []
  const top = zeilen[0]
  const empty = zeilen.length === 0

  const hero = top ? (
    <div className="grid gap-3 sm:grid-cols-3">
      <KiHeroStat label="Top Gewerk" value={top.gewerk} sub={top.plz_region} />
      <KiHeroStat label="Median VK" value={formatEur(top.preis_median)} />
      <KiHeroStat label="Ø Marge" value={`${top.marge_prozent.toFixed(1)} %`} />
    </div>
  ) : (
    <p className="text-sm text-muted">Keine Preisdaten</p>
  )

  const details = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-bw-border bg-bw-bg text-[11px] uppercase tracking-wide text-muted">
            <th className="px-2 py-2 font-semibold">Gewerk</th>
            <th className="px-2 py-2 font-semibold">Region</th>
            <th className="px-2 py-2 text-right font-semibold">n</th>
            <th className="px-2 py-2 text-right font-semibold">Preisrahmen</th>
            <th className="px-2 py-2 text-right font-semibold">Marge</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <tr key={`${z.gewerk}-${z.plz_region}`} className="border-b border-bw-border/70">
              <td className="py-2 pr-2 font-medium">{z.gewerk}</td>
              <td className="py-2 text-muted">{z.plz_region}</td>
              <td className="py-2 text-right tabular-nums">{z.anzahl}</td>
              <td className="py-2 text-right tabular-nums">
                {formatEur(z.preis_min)} – {formatEur(z.preis_max)}
              </td>
              <td className="py-2 text-right">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${margeClass(z.marge_prozent)}`}
                >
                  {z.marge_prozent.toFixed(1)} %
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
          title="Noch keine Preisdaten"
          hint="Angebote und Aufträge mit Positionen und Preisen füllen diese Auswertung."
        />
      }
    />
  )
}
