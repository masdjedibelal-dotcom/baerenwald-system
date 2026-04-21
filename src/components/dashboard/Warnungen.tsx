import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export type DashboardWarnungEintrag = {
  id: string
  typ: 'handwerker_abgelehnt' | 'keine_antwort_kunde' | 'compliance_fehlt' | 'einbehalt_faellig'
  name: string
  link: string
}

const WARNUNG_CONFIG: Record<
  DashboardWarnungEintrag['typ'],
  { icon: string; text: (name: string) => string; link_label: string }
> = {
  handwerker_abgelehnt: {
    icon: '⚠️',
    text: (name) => `${name} — Handwerker hat abgelehnt`,
    link_label: 'Lösen →',
  },
  keine_antwort_kunde: {
    icon: '⏰',
    text: (name) => `${name} — Angebot wartet auf Rückmeldung`,
    link_label: 'Nachfassen →',
  },
  compliance_fehlt: {
    icon: '❌',
    text: (name) => `${name} — Compliance fehlt`,
    link_label: 'Prüfen →',
  },
  einbehalt_faellig: {
    icon: '💰',
    text: (name) => `${name} — Einbehalt bald fällig`,
    link_label: 'Freigeben →',
  },
}

export function Warnungen({ items }: { items: DashboardWarnungEintrag[] }) {
  if (items.length === 0) return null

  return (
    <Card
      title="Handlungsbedarf"
      action={<span className="text-xs text-bw-text-muted">{items.length} offen</span>}
      bodyClassName="p-0"
    >
      <div className="divide-y divide-bw-border">
        {items.map((item) => {
          const config = WARNUNG_CONFIG[item.typ]
          if (!config) return null
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="flex-shrink-0">{config.icon}</span>
                <span className="text-sm text-bw-text">{config.text(item.name)}</span>
              </div>
              <Link href={item.link} className="flex-shrink-0 text-xs text-bw-link hover:underline">
                {config.link_label}
              </Link>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
