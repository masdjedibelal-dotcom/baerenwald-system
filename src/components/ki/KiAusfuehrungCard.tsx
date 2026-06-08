import type { AusfuehrungErgebnis } from '@/lib/ki/types'
import { KiCardShell } from '@/components/ki/KiCardShell'
import {
  KiEmptyCardBody,
  KiHeroStat,
  type KiCardProps,
  formatEur,
} from '@/components/ki/ki-card-shared'

function EigenFremdDonut({ eigenPct }: { eigenPct: number }) {
  const clamped = Math.min(100, Math.max(0, eigenPct))
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-20 w-20 shrink-0 rounded-full border border-bw-border"
        style={{
          background: `conic-gradient(#2E7D52 0% ${clamped}%, #cbd5e1 ${clamped}% 100%)`,
        }}
        aria-hidden
      />
      <div className="text-xs text-muted">
        <p>
          <span className="inline-block h-2 w-2 rounded-full bg-[#2E7D52] mr-1" />
          Eigen {clamped}%
        </p>
        <p className="mt-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300 mr-1" />
          Fremd {Math.round(100 - clamped)}%
        </p>
      </div>
    </div>
  )
}

export function KiAusfuehrungCard({ analyse, onGenerateKi, kiLoading }: KiCardProps) {
  const ergebnis = analyse.ergebnis as AusfuehrungErgebnis
  const z = ergebnis.zusammenfassung
  const gewerke = ergebnis.je_gewerk ?? []
  const empty = !z || analyse.sample_size === 0

  const hero = z ? (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <EigenFremdDonut eigenPct={z.eigen_anteil_prozent ?? 0} />
      <div className="grid gap-2 sm:grid-cols-3">
        <KiHeroStat label="Eigen" value={z.eigen_positionen} sub={`Marge ${z.marge_eigen_prozent ?? '—'}%`} />
        <KiHeroStat label="Fremd" value={z.fremd_positionen} sub={`Marge ${z.marge_fremd_prozent ?? '—'}%`} />
        <KiHeroStat label="VK gesamt" value={formatEur(z.vk_gesamt)} />
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted">Keine Ausführungsdaten</p>
  )

  const details = (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-[11px] uppercase text-muted">
          <th className="pb-2 font-semibold">Gewerk</th>
          <th className="pb-2 text-right font-semibold">Eigen</th>
          <th className="pb-2 text-right font-semibold">Fremd</th>
          <th className="pb-2 text-right font-semibold">Eigen %</th>
        </tr>
      </thead>
      <tbody>
        {gewerke.map((row) => (
          <tr key={row.gewerk} className="border-t border-bw-border/60">
            <td className="py-2">{row.gewerk}</td>
            <td className="py-2 text-right tabular-nums">{row.eigen_positionen}</td>
            <td className="py-2 text-right tabular-nums">{row.fremd_positionen}</td>
            <td className="py-2 text-right tabular-nums">{row.eigen_anteil_prozent ?? '—'}%</td>
          </tr>
        ))}
      </tbody>
    </table>
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
          title="Noch keine Ausführung"
          hint="Auftragspositionen mit Handwerker-Zuweisung oder Eigenleistung werden hier ausgewertet."
        />
      }
    />
  )
}
