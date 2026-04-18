import { PageHeader } from '@/components/layout/PageHeader'
import { EinstellungenForm } from '@/components/einstellungen/EinstellungenForm'
import { loadEinstellungenForm } from '@/app/(dashboard)/einstellungen/actions'

export default async function EinstellungenPage() {
  const initial = await loadEinstellungenForm()
  return (
    <div>
      <PageHeader title="Einstellungen" />
      <p className="mb-6 text-sm text-muted">
        Firmendaten erscheinen auf Angebots- und Rechnungs-PDFs (nach SQL-Migration Tabelle
        <code className="mx-1 rounded bg-canvas px-1">einstellungen</code>).
      </p>
      <EinstellungenForm initial={initial} />
    </div>
  )
}
