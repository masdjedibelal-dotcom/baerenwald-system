import { neuePositionsId } from '@/lib/angebot-positionen'
import type { LeadFunnelPosition } from '@/lib/lead-funnel-positionen'
import {
  fachdetailDisplayLabel,
  normalizeFunnelDaten,
  parseLeadFunnelDaten,
  type LeadFunnelDaten,
} from '@/lib/lead-funnel-daten'
import { bereicheFuerAnzeige } from '@/lib/lead-gewerbe-storage'
import type { Gewerk } from '@/lib/types'

export type ProjektErgaenzung = {
  id: string
  text: string
  relevant_fuer_rechnung: boolean
}

const DEFAULT_EINHEIT = 'pauschal'

export type ProjektWasZeile = {
  id: string
  /** Leistung / Gewerk im Projekt */
  titel: string
  beschreibung?: string
  menge: number
  einheit: string
  /** Sync mit funnel.fachdetails */
  bereich_key?: string
  gewerk_id?: string
  preisliste_id?: string
  relevant_fuer_rechnung: boolean
  ergaenzungen: ProjektErgaenzung[]
}

export function neueWasZeilenId(): string {
  return neuePositionsId()
}

export function neueErgaenzungId(): string {
  return neuePositionsId()
}

function parseBoolRel(raw: unknown, fallback: boolean): boolean {
  if (raw === false || raw === 'false') return false
  if (raw === true || raw === 'true') return true
  return fallback
}

function parseErgaenzung(raw: unknown): ProjektErgaenzung | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const text = String(r.text ?? r.leistung ?? '').trim()
  if (!text) return null
  return {
    id: String(r.id ?? neueErgaenzungId()),
    text,
    relevant_fuer_rechnung: parseBoolRel(r.relevant_fuer_rechnung, false),
  }
}

function parseWasZeile(raw: unknown): ProjektWasZeile | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const titel = String(r.titel ?? r.leistung ?? '').trim()
  const ergList = Array.isArray(r.ergaenzungen) ? r.ergaenzungen : []
  const ergaenzungen = ergList.map(parseErgaenzung).filter((e): e is ProjektErgaenzung => e != null)
  if (!titel && ergaenzungen.length === 0) return null
  const bereich_key = String(r.bereich_key ?? '').trim() || undefined
  const gewerk_id = String(r.gewerk_id ?? '').trim() || undefined
  const mengeRaw = Number(r.menge)
  const menge = Number.isFinite(mengeRaw) && mengeRaw > 0 ? mengeRaw : 1
  const einheit = String(r.einheit ?? DEFAULT_EINHEIT).trim() || DEFAULT_EINHEIT
  const beschreibung = String(r.beschreibung ?? '').trim() || undefined
  const preisliste_id = String(r.preisliste_id ?? '').trim() || undefined
  return {
    id: String(r.id ?? neueWasZeilenId()),
    titel,
    beschreibung,
    menge,
    einheit,
    bereich_key,
    gewerk_id,
    preisliste_id,
    relevant_fuer_rechnung: parseBoolRel(r.relevant_fuer_rechnung, true),
    ergaenzungen,
  }
}

/** Früher fälschlich aus Website-Fachdetails übernommene Zeilen — gehören nicht in „Konkrete Leistungen“. */
function isLegacyFachdetailImport(
  z: ProjektWasZeile,
  fachdetails: Record<string, string[]>
): boolean {
  if (!z.bereich_key || z.preisliste_id) return false
  const vals = fachdetails[z.bereich_key]
  if (!vals?.length) return false
  const titel = z.titel.trim().toLowerCase()
  if (!titel) return false
  return vals.some((v) => {
    const raw = String(v).trim().toLowerCase()
    const label = fachdetailDisplayLabel(z.bereich_key!, v).trim().toLowerCase()
    return raw === titel || label === titel
  })
}

/** Nur explizit gespeicherte konkrete Leistungen (was_zeilen) — keine Fachdetails/„Was“-Antworten. */
export function parseProjektWasZeilen(
  raw: unknown,
  opts?: { bereiche?: string[] | null; situation?: string | null; gewerke?: Gewerk[] }
): ProjektWasZeile[] {
  const funnel = parseLeadFunnelDaten(raw)
  if (!Array.isArray(funnel.was_zeilen) || funnel.was_zeilen.length === 0) {
    return []
  }

  const norm = normalizeFunnelDaten(raw, opts?.bereiche ?? null)
  return funnel.was_zeilen
    .map(parseWasZeile)
    .filter((z): z is ProjektWasZeile => z != null)
    .filter((z) => !isLegacyFachdetailImport(z, norm.fachdetails))
}

/** Flacht Was + Ergänzungen für Angebot-Import (nur rechnungsrelevante). */
export function wasZeilenToFunnelPositionen(zeilen: ProjektWasZeile[]): LeadFunnelPosition[] {
  const out: LeadFunnelPosition[] = []
  for (const w of zeilen) {
    const titel = w.titel.trim()
    if (titel && w.relevant_fuer_rechnung) {
      out.push({
        leistung: titel,
        menge: Math.max(w.menge, 0.01),
        einheit: w.einheit || DEFAULT_EINHEIT,
        preis_min: 0,
        preis_max: 0,
        relevant_fuer_rechnung: true,
        ...(w.gewerk_id ? { gewerk_id: w.gewerk_id } : {}),
      })
    }
    for (const e of w.ergaenzungen) {
      const text = e.text.trim()
      if (!text || !e.relevant_fuer_rechnung) continue
      out.push({
        leistung: text,
        menge: Math.max(w.menge, 0.01),
        einheit: w.einheit || DEFAULT_EINHEIT,
        preis_min: 0,
        preis_max: 0,
        relevant_fuer_rechnung: true,
        ...(w.gewerk_id ? { gewerk_id: w.gewerk_id } : {}),
      })
    }
  }
  return out
}

export function persistWasZeilenInFunnel(
  funnelIn: LeadFunnelDaten,
  zeilen: ProjektWasZeile[]
): LeadFunnelDaten {
  const funnel = { ...funnelIn }

  const positionen: LeadFunnelPosition[] = zeilen.flatMap((w) =>
    w.ergaenzungen.map((e) => ({
      leistung: e.text.trim(),
      menge: 1,
      einheit: 'pauschal',
      preis_min: 0,
      preis_max: 0,
      relevant_fuer_rechnung: e.relevant_fuer_rechnung,
      ...(w.gewerk_id ? { gewerk_id: w.gewerk_id } : {}),
    }))
  )

  return {
    ...funnel,
    was_zeilen: zeilen,
    positionen,
  }
}

export function bereicheForWasParse(lead: {
  bereiche?: string[] | null
  situation?: string | null
}): string[] {
  return bereicheFuerAnzeige(lead.bereiche, lead.situation)
}
