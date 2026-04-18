import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { PageHeader } from '@/components/layout/PageHeader'
import { RechnungEntwurfForm } from '@/components/rechnungen/RechnungEntwurfForm'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { DEFAULT_ZAHLUNGSZIEL_TAGE } from '@/lib/rechnung-config'

export default async function RechnungNeuPage({
  searchParams,
}: {
  searchParams: { auftrag_id?: string }
}) {
  const auftragId = searchParams.auftrag_id
  if (!auftragId) {
    redirect('/rechnungen')
  }

  const supabase = createClient()
  const [{ data: auf }, firm] = await Promise.all([
    supabase
      .from('auftraege')
      .select(
        `
        id,
        kunde_id,
        angebot_id,
        angebote(id, positionen),
        kunden(id, name)
      `
      )
      .eq('id', auftragId)
      .maybeSingle(),
    fetchFirmenEinstellungen(supabase),
  ])

  if (!auf?.kunde_id) notFound()

  const angRaw = auf.angebote as { positionen?: unknown } | unknown[] | null | undefined
  const ang = Array.isArray(angRaw) ? angRaw[0] : angRaw
  const positionen = normalizeAngebotPositionen(
    (ang as { positionen?: unknown } | null)?.positionen ?? []
  )
  if (!positionen.length) {
    return (
      <div>
        <PageHeader title="Rechnung erstellen" />
        <p className="text-sm text-danger">
          Keine Angebotspositionen vorhanden. Bitte zuerst ein Angebot mit Positionen verknüpfen.
        </p>
        <Link href={`/auftraege/${auftragId}`} className="mt-4 inline-block text-primary underline">
          Zurück zum Auftrag
        </Link>
      </div>
    )
  }

  const zt = Math.max(1, parseInt(firm.zahlungsziel_tage, 10) || DEFAULT_ZAHLUNGSZIEL_TAGE)

  return (
    <div>
      <PageHeader
        title="Rechnung erstellen"
        action={
          <Link
            href={`/auftraege/${auftragId}`}
            className="text-sm font-medium text-primary"
          >
            Zurück
          </Link>
        }
      />
      <RechnungEntwurfForm
        angebot_id={(auf as { angebot_id: string | null }).angebot_id ?? null}
        auftrag_id={auftragId}
        kunde_id={auf.kunde_id as string}
        positionen={positionen}
        zahlungszielTage={zt}
      />
    </div>
  )
}
