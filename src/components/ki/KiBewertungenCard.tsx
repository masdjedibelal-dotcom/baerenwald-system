import type { BewertungenErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import { KiEmptyCardBody, KiHeroStat, type KiCardProps } from '@/components/ki/ki-card-shared'

function Stern({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted">—</span>
  return <span className="tabular-nums">{value.toFixed(1)} ★</span>
}

export function KiBewertungenCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as BewertungenErgebnis
  const zeilen = ergebnis.zeilen ?? []
  const kat = ergebnis.kategorien_durchschnitt
  const top = zeilen[0]
  const empty = zeilen.length === 0

  const hero = top ? (
    <div className="grid gap-3 sm:grid-cols-3">
      <KiHeroStat label="Top Handwerker" value={top.handwerker_name} sub={top.gewerk} />
      <KiHeroStat label="Gesamt" value={<Stern value={top.gesamt} />} />
      <KiHeroStat label="Bewertungen" value={analyse.sample_size} />
    </div>
  ) : (
    <p className="text-sm text-muted">Noch keine Bewertungen erfasst</p>
  )

  const details = (
    <>
      {kat ? (
        <p className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
          <span>Qualität <strong className="text-bw-text"><Stern value={kat.qualitaet} /></strong></span>
          <span>Termin <strong className="text-bw-text"><Stern value={kat.termintreue} /></strong></span>
          <span>Kommunikation <strong className="text-bw-text"><Stern value={kat.kommunikation} /></strong></span>
        </p>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase text-muted">
            <th className="pb-2 font-semibold">Handwerker</th>
            <th className="pb-2 font-semibold">Gewerk</th>
            <th className="pb-2 text-right font-semibold">Gesamt</th>
            <th className="pb-2 text-right font-semibold">n</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((row) => (
            <tr key={`${row.handwerker_id}-${row.gewerk}`} className="border-t border-bw-border/60">
              <td className="py-2">{row.handwerker_name}</td>
              <td className="py-2 text-muted">{row.gewerk}</td>
              <td className="py-2 text-right font-medium"><Stern value={row.gesamt} /></td>
              <td className="py-2 text-right tabular-nums">{row.anzahl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )

  return (
    <KiCardShell
      analyse={analyse}
      hinweis={ergebnis.hinweis}
      onGenerateKi={onGenerateKi}
      kiLoading={kiLoading}
      hero={hero}
      details={empty ? undefined : details}
      empty={empty}
      emptyBody={
        <KiEmptyCardBody
          title="Noch keine Handwerker-Bewertungen"
          hint="Nach Projektabschluss im Auftrag den Handwerker bewerten — dann erscheint hier das Qualitäts-Ranking."
        />
      }
    />
  )
}
