import { neuePositionsId } from '@/lib/angebot-positionen'
import type { AuftragPosition } from '@/lib/types'

export type AbnahmePunktStatus = 'offen' | 'ok' | 'mangel'

export type AbnahmePunkt = {
  id: string
  gewerk: string
  /** Auftragsposition oder Gruppe für Freitext-Punkte */
  leistung_id?: string | null
  leistung_name?: string | null
  /** Text der Checkliste (Bullet) */
  beschreibung: string
  status: AbnahmePunktStatus
  notiz?: string | null
  foto_urls?: string[]
}

export type AbnahmeMangel = {
  punkt_id: string
  beschreibung: string
  foto_urls?: string[]
  frist: string | null
}

export type AuftragAbnahmeprotokoll = {
  id: string
  auftrag_id: string
  abnahme_datum: string
  notizen: string | null
  punkte: AbnahmePunkt[]
  maengel: AbnahmeMangel[]
  pdf_url: string | null
  an_kunde_gesendet_at: string | null
  created_at?: string | null
}

export type AbnahmeLeistungGruppe = {
  leistung_id: string
  leistung_name: string
  punkte: AbnahmePunkt[]
}

export type AbnahmeGewerkBlock = {
  gewerk: string
  leistungen: AbnahmeLeistungGruppe[]
}

function leistungKey(p: AbnahmePunkt): string {
  return p.leistung_id?.trim() || p.id
}

function leistungName(p: AbnahmePunkt): string {
  return p.leistung_name?.trim() || p.beschreibung?.trim() || 'Leistung'
}

/** Gewerk → Leistung → Checklistenpunkte (Reihenfolge aus Auftragspositionen). */
export function gruppiereAbnahmePunkte(punkte: AbnahmePunkt[]): AbnahmeGewerkBlock[] {
  const gewerkOrder: string[] = []
  const byGewerk = new Map<string, Map<string, AbnahmeLeistungGruppe>>()

  for (const p of punkte) {
    const gewerk = p.gewerk?.trim() || 'Sonstiges'
    if (!byGewerk.has(gewerk)) {
      byGewerk.set(gewerk, new Map())
      gewerkOrder.push(gewerk)
    }
    const byLeistung = byGewerk.get(gewerk)!
    const lid = leistungKey(p)
    if (!byLeistung.has(lid)) {
      byLeistung.set(lid, {
        leistung_id: lid,
        leistung_name: leistungName(p),
        punkte: [],
      })
    }
    byLeistung.get(lid)!.punkte.push(p)
  }

  return gewerkOrder.map((gewerk) => ({
    gewerk,
    leistungen: Array.from(byGewerk.get(gewerk)!.values()),
  }))
}

/** Ein Checklistenpunkt pro Auftragsposition (Gewerk + Leistung vom Auftrag). */
export function punkteAusAuftragPositionen(positionen: AuftragPosition[]): AbnahmePunkt[] {
  return [...positionen]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => ({
      id: neuePositionsId(),
      gewerk: p.gewerk_name?.trim() || '—',
      leistung_id: p.id,
      leistung_name: p.leistung_name?.trim() || 'Leistung',
      beschreibung:
        p.beschreibung?.trim() ||
        p.leistung_name?.trim() ||
        'Abnahmepunkt',
      status: 'offen' as const,
      notiz: null,
      foto_urls: [],
    }))
}

export function neuerBulletUnterLeistung(
  gewerk: string,
  leistung_id: string,
  leistung_name: string
): AbnahmePunkt {
  return {
    id: neuePositionsId(),
    gewerk,
    leistung_id,
    leistung_name,
    beschreibung: '',
    status: 'offen',
    notiz: null,
    foto_urls: [],
  }
}

export function neuerAbnahmePunktFreitext(): AbnahmePunkt {
  const id = neuePositionsId()
  return {
    id,
    gewerk: 'Sonstiges',
    leistung_id: id,
    leistung_name: 'Zusätzlicher Punkt',
    beschreibung: '',
    status: 'offen',
    notiz: null,
    foto_urls: [],
  }
}

export function maengelAusPunkten(punkte: AbnahmePunkt[]): AbnahmeMangel[] {
  return punkte
    .filter((p) => p.status === 'mangel')
    .map((p) => ({
      punkt_id: p.id,
      beschreibung: p.notiz?.trim() || p.beschreibung,
      foto_urls: [...(p.foto_urls ?? [])],
      frist: null,
    }))
}

export function abnahmePunkteStatistik(punkte: AbnahmePunkt[]): {
  ok: number
  mangel: number
  offen: number
  gesamt: number
} {
  let ok = 0
  let mangel = 0
  let offen = 0
  for (const p of punkte) {
    if (p.status === 'ok') ok++
    else if (p.status === 'mangel') mangel++
    else offen++
  }
  return { ok, mangel, offen, gesamt: punkte.length }
}
