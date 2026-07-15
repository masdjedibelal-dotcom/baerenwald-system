import type { DauerBautagebuchErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import {
  KiCountList,
  KiEmptyCardBody,
  KiHeroStat,
  type KiCardProps,
} from '@/components/ki/ki-card-shared'

export function KiDauerBautagebuchCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as DauerBautagebuchErgebnis
  const projekt = ergebnis.projekt
  const bt = ergebnis.bautagebuch
  const abnahme = ergebnis.abnahme
  const kontext = ergebnis.kontext_snippets ?? []
  const maengel = (abnahme?.checkliste_maengel ?? 0) + (abnahme?.maengel_eintraege ?? 0)
  const empty = analyse.sample_size === 0 && kontext.length === 0

  const hero = (
    <div className="grid gap-3 sm:grid-cols-4">
      <KiHeroStat
        label="Projekt-Dauer"
        value={projekt?.dauer_tage_median != null ? `${projekt.dauer_tage_median} T` : '—'}
      />
      <KiHeroStat label="Bautagebuch" value={bt?.eintraege ?? 0} />
      <KiHeroStat label="Notizen" value={ergebnis.positions_notizen?.eintraege ?? 0} />
      <KiHeroStat label="Mängel" value={maengel} sub={`${abnahme?.protokolle ?? 0} Abnahme(n)`} />
    </div>
  )

  const details = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <KiCountList title="Häufige Mängel" items={abnahme?.haeufige_maengel ?? []} limit={8} />
        <KiCountList title="Bautagebuch-Titel" items={bt?.haeufige_titel ?? []} limit={6} />
      </div>
      {kontext.length > 0 ? (
        <ul className="space-y-2">
          {kontext.map((s, i) => (
            <li key={i} className="rounded-lg bg-bw-bg px-3 py-2 text-sm">
              <p className="text-[11px] text-muted">
                {s.quelle} · {s.datum} · {s.gewerk}
              </p>
              <p className="mt-0.5 text-bw-text">{s.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
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
          title="Noch wenig Baustellen-Daten"
          hint="Bautagebuch pflegen, Termine an Positionen setzen und Abnahmeprotokolle ausfüllen."
        />
      }
    />
  )
}
