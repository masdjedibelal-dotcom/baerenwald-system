import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import type { KalenderTermin } from '@/lib/types'
import { KALENDER_TYP_BG } from '@/lib/utils'

function typLabel(t: KalenderTermin['typ']) {
  switch (t) {
    case 'besichtigung':
      return 'Besichtigung'
    case 'beginn':
      return 'Beginn'
    case 'abnahme':
      return 'Abnahme'
    default:
      return 'Termin'
  }
}

function titelZeile(t: KalenderTermin) {
  if (t.titel?.trim()) return t.titel.trim()
  const l = t.leads?.kontakt_name
  const k = t.auftraege?.kunden?.name
  const a = t.auftraege?.titel
  return l || a || k || 'Termin'
}

export function DashboardTermineHeute({ termine }: { termine: KalenderTermin[] }) {
  if (!termine.length) return null

  return (
    <Card
      title="Heute"
      action={
        <Link href="/kalender" className="text-xs text-bw-link hover:underline">
          Kalender →
        </Link>
      }
      bodyClassName="p-0"
    >
      <div className="divide-y divide-bw-border">
        {termine.map((t) => (
          <div key={t.id} className="flex gap-3 px-5 py-3">
            <span
              className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: KALENDER_TYP_BG[t.typ] ?? '#9CA3AF' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-bw-text">{t.uhrzeit_von ?? '—'}</span>
                <span className="text-sm font-medium text-bw-text">{titelZeile(t)}</span>
              </div>
              <p className="text-xs text-bw-text-muted">
                {typLabel(t.typ)}
                {t.adresse ? ` · ${t.adresse}` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
