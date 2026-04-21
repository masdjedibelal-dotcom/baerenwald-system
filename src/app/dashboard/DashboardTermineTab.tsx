import type { KalenderTermin } from '@/lib/types'
import { KALENDER_TYP_BG } from '@/lib/utils'

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

function titelZeile(t: KalenderTermin) {
  if (t.titel?.trim()) return t.titel.trim()
  const l = t.leads?.kontakt_name
  const k = t.auftraege?.kunden?.name
  const a = t.auftraege?.titel
  return l || a || k || 'Termin'
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
          <div>
            {groups.get(key)!.map((t) => (
              <div key={t.id} className="flex gap-3 px-4 py-3">
                <span
                  className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: KALENDER_TYP_BG[t.typ] ?? '#9CA3AF' }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-bw-text">{t.uhrzeit_von ?? '—'}</div>
                  <div className="text-sm font-medium text-bw-text">{titelZeile(t)}</div>
                  {t.adresse ? <div className="text-xs text-bw-text-muted">{t.adresse}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
