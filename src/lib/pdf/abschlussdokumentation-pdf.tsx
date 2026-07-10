import type { AbnahmePunkt } from '@/lib/auftraege/abnahme-protokoll-types'
import type { AuftragBautagebuchEintrag, AuftragPosition, Kunde } from '@/lib/types'

/** Eingabedaten für Abschlussdokumentation-PDF (HTML-Rendering). */
export type AbschlussdokuPdfInput = {
  kunde: Kunde
  auftragsNr: string
  projektTitel: string
  positionen: AuftragPosition[]
  bautagebuch: AuftragBautagebuchEintrag[]
  fotoUrls: string[]
  abnahmePunkte: AbnahmePunkt[] | null
  mitPreisen: boolean
  mitBautagebuch: boolean
  mitFotos: boolean
}
