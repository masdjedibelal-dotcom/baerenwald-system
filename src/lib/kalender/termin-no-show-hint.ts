import type { KalenderTermin } from '@/lib/types'

/** Termin-Ende (oder Tagesende ohne Uhrzeit) liegt in der Vergangenheit. */
export function kalenderTerminEndeVergangen(
  t: KalenderTermin,
  now: Date = new Date()
): boolean {
  const day = t.datum.slice(0, 10)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (day < today) return true
  if (day > today) return false
  const end = t.uhrzeit_bis?.trim().slice(0, 5) || t.uhrzeit_von?.trim().slice(0, 5)
  if (!end) return false
  const [h, m] = end.split(':').map(Number)
  if (!Number.isFinite(h)) return false
  const endMins = h! * 60 + (Number.isFinite(m) ? m! : 0)
  const nowMins = now.getHours() * 60 + now.getMinutes()
  return nowMins > endMins
}

export function hatOffenenVergangenenKalenderTermin(
  termine: KalenderTermin[] | KalenderTermin | null | undefined
): boolean {
  const list = Array.isArray(termine) ? termine : termine ? [termine] : []
  return list.some((t) => !t.erledigt && kalenderTerminEndeVergangen(t))
}
