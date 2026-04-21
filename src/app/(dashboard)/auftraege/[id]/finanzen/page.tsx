import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AuftragFinanzenClient } from '@/components/auftraege/AuftragFinanzenClient'
import { loadAuftragFinanzenClientPayload } from '@/app/(dashboard)/auftraege/load-auftrag-finanzen-client-props'
import { createClient } from '@/lib/supabase-server'

export default async function AuftragFinanzenPage({ params }: { params: { id: string } }) {
  const id = params.id
  const supabase = createClient()
  const { data: auf } = await supabase.from('auftraege').select('id, kunden(name)').eq('id', id).maybeSingle()
  if (!auf) notFound()

  const payload = await loadAuftragFinanzenClientPayload(id)
  if (!payload) notFound()

  const kunde = (auf as { kunden?: { name?: string } | null }).kunden

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/auftraege/${id}`} className="text-sm font-medium text-primary underline">
          ← Zurück zum Auftrag
        </Link>
        <h1 className="text-xl font-semibold text-ink">Finanzen</h1>
        {kunde?.name ? <span className="text-sm text-muted">{kunde.name}</span> : null}
      </div>

      <AuftragFinanzenClient auftragId={id} {...payload} />
    </div>
  )
}
