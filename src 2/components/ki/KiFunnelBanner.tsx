import { ArrowRight } from 'lucide-react'
import type { FunnelOverviewErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import { KiHeroStat, type KiCardProps } from '@/components/ki/ki-card-shared'

function tageLabel(stat: { median_tage: number | null; anzahl: number } | undefined) {
  if (!stat || stat.median_tage == null) return '—'
  return `${stat.median_tage} T`
}

export function KiFunnelBanner({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as FunnelOverviewErgebnis
  const k = ergebnis.kennzahlen
  const z = ergebnis.zyklen

  const hero = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'Anfragen', value: k?.leads_gesamt ?? 0 },
          { label: 'Mit Angebot', value: k?.leads_mit_angebot ?? 0 },
          { label: 'Aufträge', value: k?.auftraege_gesamt ?? 0 },
          { label: 'Abgeschlossen', value: k?.auftraege_abgeschlossen ?? 0 },
        ].map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 ? <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden /> : null}
            <div className="min-w-[5rem] rounded-lg border border-bw-border bg-bw-bg px-3 py-2 text-center">
              <p className="text-lg font-semibold tabular-nums">{step.value}</p>
              <p className="text-[11px] text-muted">{step.label}</p>
            </div>
          </div>
        ))}
      </div>

      {z ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <KiHeroStat
            label="Anfrage → Angebot"
            value={tageLabel(z.anfrage_zu_angebot)}
            sub={z.anfrage_zu_angebot.anzahl ? `n=${z.anfrage_zu_angebot.anzahl}` : undefined}
          />
          <KiHeroStat
            label="Angebot → Auftrag"
            value={tageLabel(z.angebot_zu_auftrag)}
            sub={z.angebot_zu_auftrag.anzahl ? `n=${z.angebot_zu_auftrag.anzahl}` : undefined}
          />
          <KiHeroStat
            label="Anfrage → Auftrag"
            value={tageLabel(z.anfrage_zu_auftrag)}
            sub={z.anfrage_zu_auftrag.anzahl ? `n=${z.anfrage_zu_auftrag.anzahl}` : undefined}
          />
          <KiHeroStat
            label="Anfrage → Abschluss"
            value={tageLabel(z.anfrage_zu_abschluss)}
            sub={z.anfrage_zu_abschluss.anzahl ? `n=${z.anfrage_zu_abschluss.anzahl}` : undefined}
          />
        </div>
      ) : null}
    </div>
  )

  const details =
    k?.conversion_anfrage_zu_angebot != null ? (
      <div className="space-y-2 text-sm text-bw-text">
        <p>
          Conversion Anfrage → Angebot: <strong>{k.conversion_anfrage_zu_angebot} %</strong>
          {k.conversion_angebot_zu_auftrag != null ? (
            <>
              {' '}
              · Angebot → Auftrag: <strong>{k.conversion_angebot_zu_auftrag} %</strong>
            </>
          ) : null}
        </p>
        {z ? (
          <p className="text-xs text-muted">
            Zykluszeiten als Median in Kalendertagen (erstes Angebot / erster Auftrag / frühester Abschluss je
            Anfrage).
          </p>
        ) : null}
      </div>
    ) : null

  return (
    <KiCardShell
      analyse={analyse}
      hinweis={ergebnis.hinweis}
      onGenerateKi={onGenerateKi}
      kiLoading={kiLoading}
      hero={hero}
      details={details}
      detailsLabel="Conversion & Zyklen"
    />
  )
}
