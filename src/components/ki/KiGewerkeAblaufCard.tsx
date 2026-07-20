import type { GewerkeAblaufErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import { KiEmptyCardBody, KiHeroStat, type KiCardProps, formatEur } from '@/components/ki/ki-card-shared'

export function KiGewerkeAblaufCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as GewerkeAblaufErgebnis
  const zeilen = ergebnis.zeilen ?? []
  const top = zeilen[0]
  const empty = zeilen.length === 0

  const hero = top ? (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        <KiHeroStat label="Top Gewerk" value={top.gewerk} />
        <KiHeroStat
          label="Dauer (Median)"
          value={top.dauer_gesamt_tage_median != null ? `${top.dauer_gesamt_tage_median} T` : '—'}
        />
        <KiHeroStat label="Marge" value={`${top.marge_prozent.toFixed(1)} %`} />
      </div>
      <p className="rounded-lg bg-bw-bg px-3 py-2 text-xs text-bw-text">{top.ablauf_text}</p>
    </div>
  ) : (
    <p className="text-sm text-muted">Kein Ablauf</p>
  )

  const details = (
    <div className="divide-y divide-bw-border">
      {zeilen.map((z) => (
        <div key={z.gewerk} className="py-3 first:pt-0">
          <div className="flex justify-between gap-2">
            <h4 className="font-semibold text-bw-text">{z.gewerk}</h4>
            <span className="text-xs text-muted">
              VK {formatEur(z.vk_median)} · {z.auftraege} Aufträge
            </span>
          </div>
          <p className="mt-1 text-xs text-bw-text">{z.ablauf_text}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {(z.typische_leistungen ?? []).slice(0, 5).map((l) => (
              <li
                key={l.name}
                className="rounded-full bg-bw-bg px-2 py-0.5 text-[11px] text-muted"
              >
                {l.name} ({l.anteil_prozent}%)
              </li>
            ))}
          </ul>
        </div>
      ))}
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
          title="Noch kein Ablauf"
          hint="Aufträge und Angebote mit Phasen und Leistungen füllen diese Auswertung."
        />
      }
    />
  )
}
