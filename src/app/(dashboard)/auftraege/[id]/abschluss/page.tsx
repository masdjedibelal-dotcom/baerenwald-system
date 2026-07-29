import { notFound } from 'next/navigation'
import { loadAuftragDetail } from '@/app/(dashboard)/auftraege/auftraege-data'
import { listAuftragBautagebuch } from '@/app/(dashboard)/auftraege/bautagebuch-actions'
import { loadAbschlussVoraussetzungen } from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { loadLeistungszeitraumAusRechnung } from '@/lib/auftraege/abschlussdokumentation-leistungszeitraum'
import { formatLeistungszeitraumText } from '@/lib/auftraege/abschlussdokumentation-html-payload'
import { formatAuftragsNr, auftragTitel } from '@/lib/auftraege/auftrag-liste-helpers'
import { auftragPositionenFuerSumme } from '@/lib/auftraege/auftrag-position-aktiv'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { richTextToPlain } from '@/lib/rich-text'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  AbschlussberichtCreateCanvas,
  type AbschlussCanvasGewerkGruppe,
} from '@/components/auftraege/AbschlussberichtCreateCanvas'

function formatDatumDe(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—'
  try {
    return new Date(`${iso.trim().slice(0, 10)}T12:00:00`).toLocaleDateString('de-DE')
  } catch {
    return iso
  }
}

export default async function AuftragAbschlussberichtPage({
  params,
}: {
  params: { id: string }
}) {
  const [detail, bautagebuch, voraus, zeitraum] = await Promise.all([
    loadAuftragDetail(params.id),
    listAuftragBautagebuch(params.id),
    loadAbschlussVoraussetzungen(params.id),
    loadLeistungszeitraumAusRechnung(supabaseAdmin, params.id),
  ])

  if (!detail?.kunden) notFound()

  const kundeName = kundeDisplayName(detail.kunden)
  const auftragsLabel = formatAuftragsNr(detail) || auftragTitel(detail)
  const zeitraumLabel = formatLeistungszeitraumText(zeitraum.von, zeitraum.bis)

  const positionen = auftragPositionenFuerSumme(detail.auftrag_positionen).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  const byGewerk = new Map<string, AbschlussCanvasGewerkGruppe>()
  for (const p of positionen) {
    const gewerk = p.gewerk_name?.trim() || 'Leistungen'
    let group = byGewerk.get(gewerk)
    if (!group) {
      group = { gewerk, leistungen: [] }
      byGewerk.set(gewerk, group)
    }
    const menge =
      p.menge != null && p.einheit
        ? `ca. ${p.menge} ${p.einheit}`
        : p.menge != null
          ? String(p.menge)
          : null
    const descParts = [p.beschreibung?.trim() || null, menge].filter(Boolean)
    group.leistungen.push({
      id: p.id,
      titel: p.leistung_name?.trim() || 'Leistung',
      beschreibung: descParts.length ? descParts.join(', ') : null,
      preisNetto: p.preis_fix != null ? Number(p.preis_fix) : null,
    })
  }

  const gewerkGruppen = Array.from(byGewerk.values())
  const gesamtNetto = positionen.reduce((s, p) => s + (Number(p.preis_fix) || 0), 0)

  const btb = [...bautagebuch]
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
    .map((e) => ({
      id: e.id,
      datumLabel: formatDatumDe(e.datum),
      titel: e.titel?.trim() || 'Eintrag',
      beschreibung: richTextToPlain(e.beschreibung)?.trim() || null,
    }))

  return (
    <AbschlussberichtCreateCanvas
      auftragId={detail.id}
      auftragsLabel={auftragsLabel}
      kundeName={kundeName}
      zeitraumLabel={zeitraumLabel}
      gewerkGruppen={gewerkGruppen}
      gesamtNetto={gesamtNetto > 0 ? Math.round(gesamtNetto * 100) / 100 : null}
      bautagebuch={btb}
      hasAbnahme={voraus.hasAbnahme}
      hasAbschlussbericht={Boolean(detail.abschlussdokumentation_url?.trim())}
      abschlussUrl={detail.abschlussdokumentation_url?.trim() || null}
    />
  )
}
