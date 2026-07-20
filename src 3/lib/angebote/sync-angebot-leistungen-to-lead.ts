import { GEWERK_SLUG_ANFAHRT } from '@/lib/anfahrt-angebot'
import {
  GEWERK_BESCHREIBUNG_TITEL,
  istGesamtrabattPosition,
  istGewerkBeschreibungPosition,
} from '@/lib/dokument-zeilen'
import { loadGewerkeAusfuehrung } from '@/lib/gewerke-ausfuehrung'
import { neueWasZeilenId, type ProjektWasZeile } from '@/lib/lead-projekt-was'
import { createClient } from '@/lib/supabase-server'
import type { AngebotPosition, Gewerk } from '@/lib/types'
import { BEREICH_TO_GEWERK } from '@/lib/utils'
import {
  saveLeadProjektWasZeilen,
  updateLeadProjekt,
} from '@/app/(dashboard)/anfragen/actions'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function bereichKeyFromGewerkSlug(slug: string | undefined): string | undefined {
  if (!slug || slug === GEWERK_SLUG_ANFAHRT) return undefined
  const hit = Object.entries(BEREICH_TO_GEWERK).find(([, s]) => s === slug)
  return hit?.[0]
}

function shouldSyncPosition(p: AngebotPosition): boolean {
  if (istGesamtrabattPosition(p)) return false
  if (istGewerkBeschreibungPosition(p)) return false
  if ((p.gewerk_slug ?? '') === GEWERK_SLUG_ANFAHRT) return false
  if (p.kostenart === 'anfahrt') return false
  const titel = (p.leistung ?? p.leistung_name ?? '').trim()
  if (!titel || titel === GEWERK_BESCHREIBUNG_TITEL) return false
  return true
}

/** Angebots-Positionen (Variante A) → konkrete Leistungen der Anfrage. */
export function angebotPositionenToProjektWasZeilen(
  positionen: AngebotPosition[],
  gewerke: Gewerk[] = []
): ProjektWasZeile[] {
  const gwById = new Map(gewerke.map((g) => [g.id, g]))
  const out: ProjektWasZeile[] = []

  for (const p of positionen) {
    if (!shouldSyncPosition(p)) continue

    const g = p.gewerk_id ? gwById.get(p.gewerk_id) : undefined
    const slug = g?.slug ?? p.gewerk_slug
    const titel = (p.leistung ?? p.leistung_name ?? 'Leistung').trim()

    let beschreibung: string | undefined
    const ext = p.notiz_extern?.trim()
    if (ext) {
      beschreibung = ext
    } else {
      const bd = p.beschreibung?.trim()
      if (bd && bd !== titel) beschreibung = bd
    }

    const leistungId = p.leistung_id?.trim()
    const preisliste_id =
      leistungId && UUID_RE.test(leistungId) ? leistungId : undefined

    const mengeRaw = Number(p.menge)
    const menge = Number.isFinite(mengeRaw) && mengeRaw > 0 ? mengeRaw : 1
    const einheit = (p.einheit ?? 'pauschal').trim() || 'pauschal'

    out.push({
      id: neueWasZeilenId(),
      titel,
      beschreibung,
      menge,
      einheit,
      bereich_key: bereichKeyFromGewerkSlug(slug),
      gewerk_id: p.gewerk_id || g?.id,
      preisliste_id,
      relevant_fuer_rechnung: true,
      ergaenzungen: [],
    })
  }

  return out
}

export function bereicheAusAngebotPositionen(
  positionen: AngebotPosition[],
  gewerke: Gewerk[] = []
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const z of angebotPositionenToProjektWasZeilen(positionen, gewerke)) {
    const k = z.bereich_key
    if (k && !seen.has(k)) {
      seen.add(k)
      out.push(k)
    }
  }
  return out
}

/**
 * Überschreibt „Konkrete Leistungen“ der Anfrage mit den Angebots-Positionen (Variante A).
 */
export async function syncAngebotLeistungenToLead(
  leadId: string,
  positionen: AngebotPosition[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient()
  const gewerke = await loadGewerkeAusfuehrung(supabase)
  const zeilen = angebotPositionenToProjektWasZeilen(positionen, gewerke)

  const saveRes = await saveLeadProjektWasZeilen(leadId, zeilen)
  if (!saveRes.ok) return saveRes

  const bereiche = bereicheAusAngebotPositionen(positionen, gewerke)
  if (bereiche.length > 0) {
    const bereichRes = await updateLeadProjekt(leadId, { bereiche })
    if (!bereichRes.ok) return bereichRes
  }

  return { ok: true }
}
