import type { KommunikationErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import {
  KiCountList,
  KiEmptyCardBody,
  KiHeroStat,
  type KiCardProps,
} from '@/components/ki/ki-card-shared'

export function KiKommunikationCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as KommunikationErgebnis
  const z = ergebnis.zusammenfassung
  const topTyp = ergebnis.email_nach_typ?.[0]
  const empty = analyse.sample_size === 0

  const hero = (
    <div className="grid gap-3 sm:grid-cols-4">
      <KiHeroStat label="E-Mails" value={z?.emails_gesamt ?? 0} />
      <KiHeroStat label="Timeline" value={z?.timeline_gesamt ?? 0} />
      <KiHeroStat
        label="Anfragen aktiv"
        value={z?.leads_mit_kommunikation ?? 0}
        sub={z?.leads_gesamt != null ? `von ${z.leads_gesamt}` : undefined}
      />
      <KiHeroStat
        label="Events / Anfrage"
        value={z?.events_pro_lead_median ?? '—'}
        sub="Median"
      />
    </div>
  )

  const details = (
    <div className="grid gap-4 sm:grid-cols-2">
      <KiCountList title="E-Mails nach Typ" items={ergebnis.email_nach_typ ?? []} />
      <KiCountList title="Timeline nach Typ" items={ergebnis.timeline_nach_typ ?? []} />
      <KiCountList title="Nach Kontext" items={ergebnis.email_nach_kontext ?? []} />
      <KiCountList title="Richtung" items={ergebnis.email_nach_richtung ?? []} />
      {topTyp ? (
        <p className="sm:col-span-2 text-xs text-muted">
          Häufigster Mail-Typ: <strong className="text-bw-text">{topTyp.name}</strong> ({topTyp.count}×)
        </p>
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
          title="Noch keine Kommunikationsdaten"
          hint="E-Mails aus Anfrage, Angebot oder Auftrag versenden — Timeline und Mail-Log füllen diese Auswertung."
        />
      }
    />
  )
}
