import { startOfMonth, startOfWeek, subMonths, subWeeks } from 'date-fns'

/** Grenzen für Dashboard-KPIs (Montag = Wochenstart). */
export function dashboardLeadPeriodBoundaries(now = new Date()) {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const monthStart = startOfMonth(now)
  const prevMonthStart = startOfMonth(subMonths(now, 1))

  return {
    weekStartIso: weekStart.toISOString(),
    prevWeekStartIso: prevWeekStart.toISOString(),
    monthStartIso: monthStart.toISOString(),
    prevMonthStartIso: prevMonthStart.toISOString(),
  }
}
