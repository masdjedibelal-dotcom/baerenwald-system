import type { KalenderTermin } from '@/lib/types'
import { KalenderTerminZeile } from '@/components/kalender/KalenderTerminZeile'

function headerForDatum(datumIso: string): string {
  const d = new Date(datumIso.includes('T') ? datumIso : `${datumIso}T12:00:00`)
  const t = new Date()
  const t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((d0.getTime() - t0.getTime()) / 86400000)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function DashboardTermineTab({ termine }: { termine: KalenderTermin[] }) {
  if (!termine.length) {
    return <div className="py-8 text-center text-sm text-bw-text-muted">Keine Termine</div>
  }

  const groups = new Map<string, KalenderTermin[]>()
  for (const t of termine) {
    const key = t.datum
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }
  const keys = Array.from(groups.keys()).sort()

  return (
    <div className="divide-y divide-bw-border">
      {keys.map((key) => (
        <div key={key}>
          <div className="bg-bw-bg px-4 py-2 text-xs font-semibold uppercase tracking-wide text-bw-mid">
            {headerForDatum(key)}
          </div>
          <div className="divide-y divide-bw-border">
            {groups.get(key)!.map((t) => (
              <KalenderTerminZeile key={t.id} termin={t} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
