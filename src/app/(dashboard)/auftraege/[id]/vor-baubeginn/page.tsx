import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/actions'
import { VorBaubeginnForm } from '@/components/auftraege/VorBaubeginnForm'

export default async function VorBaubeginnPage({ params }: { params: { id: string } }) {
  const detail = await loadAuftragDetail(params.id)
  if (!detail) notFound()
  if (detail.status !== 'offen') {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-muted">Vor-Baubeginn-Protokoll ist nur bei Status „offen“ vorgesehen.</p>
        <Link href={`/auftraege/${params.id}`} className="mt-4 inline-block text-primary underline">
          Zurück zum Auftrag
        </Link>
      </div>
    )
  }

  if ((detail.vor_baubeginn_protokolle ?? []).length > 0) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <p className="text-sm text-muted">Für diesen Auftrag liegt bereits ein Vor-Baubeginn-Protokoll vor.</p>
        <Link href={`/auftraege/${params.id}`} className="mt-4 inline-block text-primary underline">
          Zurück zum Auftrag
        </Link>
      </div>
    )
  }

  const kunde = detail.kunden
  const adresse = [kunde?.adresse, [kunde?.plz, kunde?.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <Link href={`/auftraege/${params.id}`} className="text-sm font-medium text-primary underline">
        ← Zurück
      </Link>
      <h1 className="mt-4 text-xl font-semibold text-ink">Vor-Baubeginn Protokoll</h1>
      <VorBaubeginnForm auftragId={params.id} defaultAdresse={adresse || ''} />
    </div>
  )
}
