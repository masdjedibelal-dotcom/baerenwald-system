import type { KalenderTermin } from '@/lib/types'

export type TeamAuslastungEintrag = {
  id: string
  name: string
  load: number
  termineCount: number
}

const MAX_TERMINE_PRO_WOCHE = 8

export function getWeekBounds(ref = new Date()) {
  const d = new Date(ref)
  const dow = d.getDay()
  const toMon = dow === 0 ? -6 : 1 - dow
  const start = new Date(d)
  start.setDate(d.getDate() + toMon)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function parseTerminDatum(datum: string): Date {
  return new Date(datum.includes('T') ? datum : `${datum}T12:00:00`)
}

export function isDatumInWeek(datum: string, start: Date, end: Date): boolean {
  const d = parseTerminDatum(datum)
  return d >= start && d <= end
}

export function isHeute(datum: string): boolean {
  const d = parseTerminDatum(datum)
  const t = new Date()
  return (
    d.getFullYear() === t.getFullYear() &&
    d.getMonth() === t.getMonth() &&
    d.getDate() === t.getDate()
  )
}

export function computeTeamAuslastung(
  termine: KalenderTermin[],
  team: { id: string; name: string }[],
  betreuerByAuftrag: Map<string, string>
): TeamAuslastungEintrag[] {
  const { start, end } = getWeekBounds()
  const weekTermine = termine.filter((t) => !t.erledigt && isDatumInWeek(t.datum, start, end))

  if (!team.length) {
    const n = weekTermine.length
    return [
      {
        id: 'team',
        name: 'Team gesamt',
        load: Math.min(100, Math.round((n / MAX_TERMINE_PRO_WOCHE) * 100)),
        termineCount: n,
      },
    ]
  }

  function terminGehoertMitglied(t: KalenderTermin, memberId: string): boolean {
    if (t.zugewiesen_an === memberId) return true
    if (t.auftrag_id && betreuerByAuftrag.get(t.auftrag_id) === memberId) return true
    return false
  }

  const unassigned = weekTermine.filter((t) => {
    if (t.zugewiesen_an) return false
    if (t.auftrag_id && betreuerByAuftrag.get(t.auftrag_id)) return false
    return true
  }).length

  const rows = team.map((member) => {
    const termineCount = weekTermine.filter((t) => terminGehoertMitglied(t, member.id)).length
    const extra =
      unassigned > 0 && team.length > 0
        ? Math.floor(unassigned / team.length) +
          (team.findIndex((m) => m.id === member.id) < unassigned % team.length ? 1 : 0)
        : 0
    const total = termineCount + extra
    return {
      id: member.id,
      name: member.name,
      load: Math.min(100, Math.round((total / MAX_TERMINE_PRO_WOCHE) * 100)),
      termineCount: total,
    }
  })

  return rows.sort((a, b) => b.load - a.load).slice(0, 6)
}
