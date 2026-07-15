'use client'

import { AuftragLeistungenV3Tab } from '@/components/auftraege/leistungen-v3/AuftragLeistungenV3Tab'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import type {
  AngebotHandwerkerRow,
  AngebotPosition,
  AuftragHandwerkerRow,
  AuftragPosition,
  AuftragStatus,
} from '@/lib/types'

type GewerkOpt = { id: string; name: string; slug: string }

/** Leistungen & Steuerung — flache Liste (v3). */
export function AuftragPositionenSteuerungTab({
  auftragId,
  positionen,
  gewerke,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotHandwerker = [],
  handwerkerRows = [],
  handwerkerKontext,
  auftragAbgeschlossen = false,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  /** @deprecated v3 nutzt diese Props nicht mehr — Signatur bleibt für Aufrufer */
  handwerkerKontext?: HandwerkerZuweisenKontext
  angebotId?: string | null
  angebotTitel?: string
  /** @deprecated */
  angebotHandwerker?: AngebotHandwerkerRow[]
  handwerkerRows?: AuftragHandwerkerRow[]
  /** @deprecated */
  angebotPositionen?: AngebotPosition[]
  /** @deprecated */
  auftragStatus?: AuftragStatus
  auftragAbgeschlossen?: boolean
  /** @deprecated */
  eigenregie?: boolean
  /** @deprecated */
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onChanged: () => void
}) {
  return (
    <AuftragLeistungenV3Tab
      auftragId={auftragId}
      positionen={positionen}
      gewerke={gewerke}
      angebotId={angebotId}
      angebotTitel={angebotTitel}
      angebotHandwerker={angebotHandwerker}
      handwerkerRows={handwerkerRows}
      handwerkerKontext={handwerkerKontext}
      auftragAbgeschlossen={auftragAbgeschlossen}
      onChanged={onChanged}
    />
  )
}
