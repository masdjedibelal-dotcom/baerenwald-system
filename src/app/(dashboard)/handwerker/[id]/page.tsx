import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'

export default function HandwerkerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div>
      <PageHeader
        title="Handwerker"
        action={
          <Link
            href="/handwerker"
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary"
          >
            Zur Übersicht
          </Link>
        }
      />
      <Card className="space-y-2 text-sm">
        <p className="text-muted">Handwerker-ID</p>
        <p className="font-mono text-base text-ink">{params.id}</p>
        <p className="pt-2 text-muted">
          Detailansicht — verbinde diese Seite später mit Supabase-Daten.
        </p>
      </Card>
    </div>
  )
}
