import type { Metadata } from 'next'
import { listKatalogPositionen, listVerwendetePositionen } from '@/app/(dashboard)/katalog/actions'
import {
  AllePositionenClient,
  type PreislistenZeile,
} from '@/components/preislisten/AllePositionenClient'

export const metadata: Metadata = {
  title: 'Preisliste',
}

/** Einstellungen → Preisliste: alle gespeicherten Positionen — dieselbe Quelle wie die Positionsauswahl. */
export default async function EinstellungenPreisePage() {
  const [katalog, verwendet] = await Promise.all([listKatalogPositionen(), listVerwendetePositionen()])
  const zeilen: PreislistenZeile[] = [
    ...katalog.flatMap((p) =>
      p.varianten.map((v) => ({
        id: v.id,
        titel: v.variante?.trim() ? `${p.titel} · ${v.variante.trim()}` : p.titel,
        gewerk: p.gewerk_name?.trim() || 'Allgemein',
        einheit: v.einheit,
        preis: Number(v.preis) || 0,
        quelle: 'katalog' as const,
      }))
    ),
    ...verwendet.map((p) => ({
      id: p.id,
      titel: p.titel,
      gewerk: p.gewerk_name?.trim() || 'Allgemein',
      einheit: p.varianten[0]?.einheit || 'Stück',
      preis: Number(p.varianten[0]?.preis) || 0,
      quelle: 'verwendet' as const,
    })),
  ].sort((a, b) => a.titel.localeCompare(b.titel, 'de'))

  return <AllePositionenClient zeilen={zeilen} />
}
