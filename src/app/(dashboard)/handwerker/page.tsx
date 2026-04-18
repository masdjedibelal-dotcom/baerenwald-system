import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/layout/EmptyState'
import { Users } from 'lucide-react'

const demo: { id: string; name: string; firma: string | null }[] = []

export default function HandwerkerPage() {
  return (
    <div>
      <PageHeader title="Handwerker" />

      {demo.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Keine Handwerker"
          description="Lege Handwerker an, um sie hier zu verwalten."
        />
      ) : (
        <ul className="space-y-3">
          {demo.map((h) => (
            <li key={h.id}>
              <Link
                href={`/handwerker/${h.id}`}
                className="block rounded-lg border border-border bg-surface p-4 shadow-card hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <p className="font-semibold text-ink">{h.name}</p>
                {h.firma ? (
                  <p className="text-sm text-muted">{h.firma}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
