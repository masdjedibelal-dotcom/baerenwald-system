import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { RechnungNeuForm } from '@/components/rechnungen/RechnungNeuForm'
import { normalizeAngebotPositionen } from '@/lib/angebot-positionen'
import { fetchFirmenEinstellungen } from '@/lib/firmen-einstellungen'
import { DEFAULT_ZAHLUNGSZIEL_TAGE } from '@/lib/rechnung-config'
import type { AngebotPosition } from '@/lib/types'

export default async function RechnungNeuPage({
  searchParams,
}: {
  searchParams: { auftrag_id?: string }
}) {
  const auftragId = searchParams.auftrag_id
  const supabase = createClient()
  const firm = await fetchFirmenEinstellungen(supabase)
  const zt = Math.max(1, parseInt(firm.zahlungsziel_tage, 10) || DEFAULT_ZAHLUNGSZIEL_TAGE)

  if (!auftragId) {
    return (
      <RechnungNeuForm
        angebot_id={null}
        auftrag_id={null}
        initialKundeId={null}
        kundenAdresseReadonly={null}
        positionen={[]}
        zahlungszielTage={zt}
        backHref="/rechnungen"
      />
    )
  }

  const { data: auf } = await supabase
    .from('auftraege')
    .select(
      `
      id,
      kunde_id,
      angebot_id,
      angebote(id, positionen),
      kunden(id, name, adresse, plz, ort)
    `
    )
    .eq('id', auftragId)
    .maybeSingle()

  if (!auf?.kunde_id) notFound()

  const angRaw = auf.angebote as { positionen?: unknown } | unknown[] | null | undefined
  const ang = Array.isArray(angRaw) ? angRaw[0] : angRaw
  const rawPos = (ang as { positionen?: unknown } | null)?.positionen ?? []
  const positionen: AngebotPosition[] = normalizeAngebotPositionen(rawPos)

  const k = auf.kunden as
    | { name?: string; adresse?: string | null; plz?: string | null; ort?: string | null }
    | { name?: string; adresse?: string | null; plz?: string | null; ort?: string | null }[]
    | null
  const kundeRow = Array.isArray(k) ? k[0] : k

  return (
    <RechnungNeuForm
      angebot_id={(auf as { angebot_id: string | null }).angebot_id ?? null}
      auftrag_id={auftragId}
      initialKundeId={auf.kunde_id as string}
      kundenAdresseReadonly={
        kundeRow?.name
          ? {
              name: kundeRow.name,
              adresse: kundeRow.adresse ?? null,
              plz: kundeRow.plz ?? null,
              ort: kundeRow.ort ?? null,
            }
          : null
      }
      positionen={positionen}
      zahlungszielTage={zt}
      backHref={`/auftraege/${auftragId}`}
    />
  )
}
