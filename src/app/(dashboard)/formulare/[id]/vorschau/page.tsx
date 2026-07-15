import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadFormularTemplate } from '@/app/(dashboard)/formulare/actions'
import { FormularFelderRenderer } from '@/components/formulare/FormularFelderRenderer'
import { MockCard } from '@/components/mock-ui/MockCard'
import { FORMULAR_PHASE_LABELS } from '@/lib/utils'

export default async function FormularVorschauPage({ params }: { params: { id: string } }) {
  const template = await loadFormularTemplate(params.id)
  if (!template) notFound()

  const empty: Record<string, unknown> = {}
  for (const f of template.felder) {
    if (f.typ === 'checkbox') empty[f.id] = false
    else empty[f.id] = ''
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-ink">Vorschau: {template.name}</h1>
        <Link href={`/formulare/${params.id}/bearbeiten`} className="text-sm font-medium text-primary hover:underline">
          Bearbeiten
        </Link>
      </div>
      <MockCard className="p-4">
        <p className="text-sm text-muted">
          {template.typ === 'betreuer' ? 'Betreuer' : 'Handwerker'}
          {template.phase ? ` · ${FORMULAR_PHASE_LABELS[template.phase] ?? template.phase}` : null}
        </p>
        <p className="mt-2 text-xs text-muted">Nur-Lese-Ansicht (leere Werte).</p>
        <div className="mt-4">
          <FormularFelderRenderer felder={template.felder} daten={empty} readonly />
        </div>
      </MockCard>
    </div>
  )
}
