import type { AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import type { AbnahmeMangel } from '@/lib/auftraege/abnahme-protokoll-types'
import type { AbnahmeProtokollMeta } from '@/lib/auftraege/abnahme-protokoll-meta'
import type { AuftragBautagebuchEintrag, AuftragPosition, Kunde } from '@/lib/types'

/** Eingabedaten für Abschlussdokumentation-PDF (HTML-Rendering). */
export type AbschlussdokuPdfInput = {
  kunde: Kunde
  auftragsNr: string
  projektTitel: string
  positionen: AuftragPosition[]
  /** Chronologische Doku (Bautagebuch + Leistungs-Einträge). */
  bautagebuch: Array<{
    datum: string
    sort_order?: number
    titel: string
    beschreibung?: string | null
  }>
  fotoUrls: Array<{ url: string; caption?: string | null }>
  abnahmePunkte: AbnahmePunkt[] | null
  abnahmeMaengel?: AbnahmeMangel[] | null
  abnahmeMeta?: AbnahmeProtokollMeta | null
  abnahmeDatum?: string | null
  abnahmeNotizen?: string | null
  abnahmeErgebnisLabel?: string | null
  mitPreisen: boolean
  mitBautagebuch: boolean
  mitFotos: boolean
}

/** @deprecated Legacy — bautagebuch war früher AuftragBautagebuchEintrag[] */
export type AbschlussdokuBautagebuchLegacy = AuftragBautagebuchEintrag

