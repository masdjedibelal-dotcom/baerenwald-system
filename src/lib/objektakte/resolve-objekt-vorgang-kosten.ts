import { betragAnzeigeBrutto } from '@/lib/angebot-einfach'
import { isPhaseWinningRechnung } from '@/lib/vorgang/resolve-vorgang'
import type { VorgangRechnungInput } from '@/lib/vorgang/types'
import { parseVorgangWertLabelEuro } from '@/lib/vorgang/vorgaenge-liste-summe'

export type ObjektVorgangKostenQuelle = 'rechnung' | 'auftrag' | 'offen'

export type ObjektVorgangKosten = {
  /** null bei „offen" — zählt nicht in Summen. */
  euro: number | null
  label: string
  quelle: ObjektVorgangKostenQuelle
}

type AngebotKostenRow = {
  id?: string
  status?: string
  gesamt_fix?: number | null
  gesamt_min?: number | null
  gesamt_max?: number | null
}

type AuftragKostenRow = {
  status: string
  angebot_id?: string | null
}

type RechnungKostenRow = {
  status: string
  brutto?: number | null
  rechnung_art?: string | null
  created_at: string
  updated_at?: string | null
}

function euroFromAngebotRow(ang: AngebotKostenRow | null | undefined): number | null {
  if (!ang) return null
  const label = betragAnzeigeBrutto(ang.gesamt_fix, ang.gesamt_min, ang.gesamt_max)
  return parseVorgangWertLabelEuro(label === '—' ? null : label)
}

function formatEuro(euro: number): string {
  return `${Math.round(euro).toLocaleString('de-DE')} €`
}

/**
 * Spec-Kaskade für Objekt-Historie / Bericht / KPI:
 * Rechnungssumme → Auftragswert (Angebot) → „offen".
 * Kein Lead-Budget-Fallback — leere Ebenen bleiben „offen".
 */
export function resolveObjektVorgangKosten(input: {
  rechnungen: RechnungKostenRow[]
  auftraege: AuftragKostenRow[]
  angebote: AngebotKostenRow[]
}): ObjektVorgangKosten {
  const winning = input.rechnungen.filter((r) =>
    isPhaseWinningRechnung(r as VorgangRechnungInput)
  )
  if (winning.length) {
    const newest = [...winning].sort((a, b) =>
      (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at)
    )[0]
    const brutto = Number(newest?.brutto)
    if (Number.isFinite(brutto) && brutto > 0) {
      const euro = Math.round(brutto)
      return { euro, label: formatEuro(euro), quelle: 'rechnung' }
    }
  }

  for (const auf of input.auftraege) {
    if ((auf.status ?? '').trim().toLowerCase() === 'storniert') continue
    const linked = auf.angebot_id
      ? input.angebote.find((a) => a.id === auf.angebot_id)
      : null
    let euro = euroFromAngebotRow(linked)
    if (euro == null) {
      for (const ang of input.angebote) {
        euro = euroFromAngebotRow(ang)
        if (euro != null) break
      }
    }
    if (euro != null) {
      return { euro, label: formatEuro(euro), quelle: 'auftrag' }
    }
  }

  return { euro: null, label: 'offen', quelle: 'offen' }
}

export function summeObjektVorgangKosten(
  rows: Array<{ kostenEuro: number | null }>
): { summe: number; ohneAngabe: number } {
  let summe = 0
  let ohneAngabe = 0
  for (const r of rows) {
    if (r.kostenEuro == null) {
      ohneAngabe++
    } else {
      summe += r.kostenEuro
    }
  }
  return { summe, ohneAngabe }
}
