import type { NachfrageErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import {
  KiCountList,
  KiEmptyCardBody,
  KiHeroStat,
  type KiCardProps,
  formatEur,
} from '@/components/ki/ki-card-shared'

export function KiNachfrageCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as NachfrageErgebnis
  const topPlz = ergebnis.plz_regionen?.[0]
  const topBereich = ergebnis.bereiche?.[0]
  const empty = analyse.sample_size === 0

  const hero = (
    <div className="grid gap-3 sm:grid-cols-3">
      <KiHeroStat label="Anfragen" value={analyse.sample_size} />
      <KiHeroStat
        label="Top PLZ-Region"
        value={topPlz?.name ?? '—'}
        sub={topPlz ? `${topPlz.count}×` : undefined}
      />
      <KiHeroStat
        label="Top Gewerk"
        value={topBereich?.name ?? '—'}
        sub={topBereich ? `${topBereich.count}×` : undefined}
      />
    </div>
  )

  const details = (
    <div className="grid gap-4 sm:grid-cols-2">
      <KiCountList title="PLZ-Regionen" items={ergebnis.plz_regionen ?? []} />
      <KiCountList title="Gewerke / Bereiche" items={ergebnis.bereiche ?? []} />
      <KiCountList title="Situationen" items={ergebnis.situationen ?? []} />
      <KiCountList title="Kanäle" items={ergebnis.kanaele ?? []} />
      <KiCountList title="Rechner-Leistungen" items={ergebnis.rechner_leistungen ?? []} />
      {ergebnis.budgets ? (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Preisrahmen</h4>
          <p className="text-sm">Median {formatEur(ergebnis.budgets.median)}</p>
          <p className="text-xs text-muted">{ergebnis.budgets.anzahl} Angaben</p>
        </div>
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
          title="Noch keine Anfragen"
          hint="Sobald Leads im CRM sind, erscheint hier die Nachfrage-Auswertung."
        />
      }
    />
  )
}
