import type { KalenderTermin } from '@/lib/types'

/** Stellt sicher, dass aus der API/DB immer ein Array kommt (kein Einzelobjekt). */
export function normalizeKalenderTermineList(
  raw: KalenderTermin[] | KalenderTermin | null | undefined
): KalenderTermin[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return raw.filter((t): t is KalenderTermin => !!t?.id)
  if (typeof raw === 'object' && 'id' in raw && raw.id) return [raw as KalenderTermin]
  return []
}

/** Gleiche Besichtigung mehrfach angelegt → nur der neueste Eintrag in der UI. */
export function dedupeKalenderTermineAnzeige(termine: KalenderTermin[]): KalenderTermin[] {
  const seenIds = new Set<string>()
  const bySignature = new Map<string, KalenderTermin>()

  for (const t of termine) {
    if (!t.id || seenIds.has(t.id)) continue
    seenIds.add(t.id)

    const sig = [
      t.typ,
      t.datum,
      (t.uhrzeit_von ?? '').slice(0, 5),
      (t.titel ?? '').trim(),
    ].join('|')

    const prev = bySignature.get(sig)
    if (!prev || new Date(t.created_at).getTime() > new Date(prev.created_at).getTime()) {
      bySignature.set(sig, t)
    }
  }

  return Array.from(bySignature.values())
}

export function formatTerminUhrzeitKurz(
  von: string | null | undefined,
  bis: string | null | undefined
): string {
  const v = typeof von === 'string' ? von.slice(0, 5) : ''
  const b = typeof bis === 'string' && bis.trim() ? bis.slice(0, 5) : ''
  if (!v) return ''
  return b ? `${v} – ${b}` : v
}
