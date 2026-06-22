import type { AuftragListeEintrag, AuftragStatus } from '@/lib/types'
import { kundeDisplayName } from '@/lib/kunde-stammdaten'
import { formatDatum, formatPreis } from '@/lib/utils'

export type AuftragListenPhase = '' | 'aktiv' | 'fertig'

const AKTIV_STATUSES: AuftragStatus[] = ['offen', 'in_arbeit', 'abnahme']

/** Anzeige-Nr. bis ein echtes `auftragsnr`-Feld existiert (z. B. AU-2026-A3F2). */
export function formatAuftragsNr(a: Pick<AuftragListeEintrag, 'id' | 'created_at'>): string {
  const d = new Date(a.created_at)
  const year = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear()
  const seq = a.id.replace(/-/g, '').slice(-4).toUpperCase()
  return `AU-${year}-${seq}`
}

export function auftragKundenName(a: AuftragListeEintrag): string {
  const k = a.kunden
  if (!k) return 'Ohne Kunde'
  const display = kundeDisplayName(k)
  return display !== '—' ? display : 'Ohne Kunde'
}

export function auftragTitel(a: AuftragListeEintrag): string {
  return a.titel?.trim() || auftragKundenName(a)
}

export function auftragOrt(a: AuftragListeEintrag): string {
  const ort = a.kunden?.ort?.trim()
  if (ort) return ort
  const plz = a.leads?.plz?.trim() || a.kunden?.plz?.trim()
  return plz || '—'
}

export function auftragWertNum(a: AuftragListeEintrag): number {
  if (!a.angebote) return 0
  return a.angebote.gesamt_fix ?? a.angebote.gesamt_max ?? a.angebote.gesamt_min ?? 0
}

export function auftragWertAnzeige(a: AuftragListeEintrag): string {
  if (!a.angebote) return '—'
  return formatPreis(
    a.angebote.gesamt_fix ?? null,
    a.angebote.gesamt_min ?? null,
    a.angebote.gesamt_max ?? null
  )
}

export function auftragFortschritt(a: AuftragListeEintrag): number {
  if (a.fortschritt != null && !Number.isNaN(Number(a.fortschritt))) {
    return Math.min(100, Math.max(0, Math.round(Number(a.fortschritt))))
  }
  const byStatus: Record<AuftragStatus, number> = {
    offen: 15,
    in_arbeit: 55,
    abnahme: 85,
    abgeschlossen: 100,
    storniert: 0,
  }
  return byStatus[a.status] ?? 0
}

/** Farben an Status-Legende (Liste): offen = grau, in Arbeit = grün, Abnahme = gelb. */
export function fortschrittBarColor(
  status: AuftragStatus
): 'green' | 'blue' | 'orange' {
  if (status === 'storniert') return 'blue'
  if (status === 'abgeschlossen') return 'green'
  if (status === 'abnahme') return 'orange'
  if (status === 'in_arbeit') return 'green'
  if (status === 'offen') return 'orange'
  return 'green'
}

export function lieferdatumAnzeige(a: Pick<AuftragListeEintrag, 'end_datum' | 'abnahme_datum'>): string {
  const raw = a.end_datum?.trim() || a.abnahme_datum?.trim()
  if (!raw) return '—'
  const iso = raw.includes('T') ? raw.slice(0, 10) : raw
  return formatDatum(iso)
}

export function matchesAuftragPhase(a: AuftragListeEintrag, phase: AuftragListenPhase): boolean {
  if (!phase) return true
  if (phase === 'aktiv') return AKTIV_STATUSES.includes(a.status)
  if (phase === 'fertig') return a.status === 'abgeschlossen'
  return true
}

export function countAuftragPhase(auftraege: AuftragListeEintrag[], phase: AuftragListenPhase): number {
  if (!phase) return auftraege.length
  return auftraege.filter((a) => matchesAuftragPhase(a, phase)).length
}

export function auftragSuchtext(a: AuftragListeEintrag): string {
  return [
    formatAuftragsNr(a),
    auftragTitel(a),
    auftragKundenName(a),
    auftragOrt(a),
    a.kunden?.plz,
    a.leads?.plz,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}
