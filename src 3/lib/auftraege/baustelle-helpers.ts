import type { AuftragBaustelleTeam } from '@/lib/auftraege/baustelle-types'

export function aggregiereBaustellenPersonal(
  team: AuftragBaustelleTeam,
  tagesberichte: Array<{ personal_namen: string[] }>
): string[] {
  const set = new Set<string>()
  for (const n of team.bau_mannschaft) {
    const t = n.trim()
    if (t) set.add(t)
  }
  for (const tb of tagesberichte) {
    for (const n of tb.personal_namen) {
      const t = n.trim()
      if (t) set.add(t)
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'))
}
