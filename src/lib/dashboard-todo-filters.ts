import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import type { KalenderTermin } from '@/lib/types'

export type DashboardTodoZeitraum = 'heute' | 'diese_woche' | 'dieser_monat'

export const DASHBOARD_TODO_ZEITRAUM_LABELS: Record<DashboardTodoZeitraum, string> = {
  heute: 'Heute',
  diese_woche: 'Diese Woche',
  dieser_monat: 'Diesen Monat',
}

function terminDatum(t: KalenderTermin): string | null {
  const raw = t.datum
  if (raw == null || raw === '') return null
  return String(raw).slice(0, 10)
}

export function localDateYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function dashboardTodoPeriodBounds(now = new Date()) {
  const heute = localDateYmd(now)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)
  return {
    heute,
    weekStart: localDateYmd(weekStart),
    weekEnd: localDateYmd(weekEnd),
    monthStart: localDateYmd(monthStart),
    monthEnd: localDateYmd(monthEnd),
  }
}

/** Sortierung nach Fälligkeit: Datum, dann Uhrzeit (ohne Uhrzeit zuletzt am Tag). */
export function sortTermineByFaelligkeit(termine: KalenderTermin[]): KalenderTermin[] {
  return [...termine].sort((a, b) => {
    const da = terminDatum(a) ?? '9999-99-99'
    const db = terminDatum(b) ?? '9999-99-99'
    const dc = da.localeCompare(db)
    if (dc !== 0) return dc
    const av = a.uhrzeit_von?.slice(0, 5) ?? '24:00'
    const bv = b.uhrzeit_von?.slice(0, 5) ?? '24:00'
    return av.localeCompare(bv)
  })
}

export function filterTermineByZeitraum(
  termine: KalenderTermin[],
  zeitraum: DashboardTodoZeitraum,
  bounds = dashboardTodoPeriodBounds()
): KalenderTermin[] {
  const filtered = termine.filter((t) => {
    const d = terminDatum(t)
    if (!d) return false
    if (zeitraum === 'heute') return d === bounds.heute
    if (zeitraum === 'diese_woche') {
      if (d >= bounds.weekStart && d <= bounds.weekEnd) return true
      return d < bounds.heute
    }
    if (d >= bounds.monthStart && d <= bounds.monthEnd) return true
    return d < bounds.monthStart
  })
  return sortTermineByFaelligkeit(filtered)
}

export function countTermineByZeitraum(
  termine: KalenderTermin[],
  bounds = dashboardTodoPeriodBounds()
): Record<DashboardTodoZeitraum, number> {
  return {
    heute: filterTermineByZeitraum(termine, 'heute', bounds).length,
    diese_woche: filterTermineByZeitraum(termine, 'diese_woche', bounds).length,
    dieser_monat: filterTermineByZeitraum(termine, 'dieser_monat', bounds).length,
  }
}
