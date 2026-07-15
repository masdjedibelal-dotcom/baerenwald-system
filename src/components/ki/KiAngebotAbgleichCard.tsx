import type { AngebotAbgleichErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import { KiCountList, KiEmptyCardBody, KiHeroStat, type KiCardProps } from '@/components/ki/ki-card-shared'

export function KiAngebotAbgleichCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as AngebotAbgleichErgebnis
  const abw = ergebnis.abweichungen
  const empty = ergebnis.verglichen === 0

  const hero = (
    <div className="grid gap-3 sm:grid-cols-3">
      <KiHeroStat
        label="Conversion"
        value={ergebnis.funnel?.conversion_prozent != null ? `${ergebnis.funnel.conversion_prozent}%` : '—'}
      />
      <KiHeroStat label="Abgleiche" value={ergebnis.verglichen} />
      <KiHeroStat
        label="Preisrahmen Δ (Median)"
        value={
          ergebnis.preis_abgleich?.median_delta_prozent != null
            ? `${ergebnis.preis_abgleich.median_delta_prozent > 0 ? '+' : ''}${ergebnis.preis_abgleich.median_delta_prozent}%`
            : '—'
        }
      />
    </div>
  )

  const details = (
    <div className="grid gap-4 sm:grid-cols-2">
      <KiCountList title="Gewerke ergänzt" items={abw?.gewerke_hinzugefuegt ?? []} />
      <KiCountList title="Gewerke entfernt" items={abw?.gewerke_entfernt ?? []} />
      <KiCountList title="Leistungen ergänzt" items={abw?.leistungen_hinzugefuegt ?? []} />
      <KiCountList title="Leistungen entfernt" items={abw?.leistungen_entfernt ?? []} />
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
          title="Kein Abgleich möglich"
          hint="Angebote brauchen Positionen und eine verknüpfte Anfrage (lead_id)."
        />
      }
    />
  )
}
