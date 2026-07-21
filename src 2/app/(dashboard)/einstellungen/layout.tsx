import { EinstellungenLayoutClient } from '@/components/einstellungen/EinstellungenLayoutClient'
import { loadBenutzerListe } from '@/app/(dashboard)/einstellungen/benutzer/actions'

export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  let teamCount = 0
  try {
    const team = await loadBenutzerListe()
    teamCount = team.length
  } catch {
    teamCount = 0
  }

  return <EinstellungenLayoutClient teamCount={teamCount}>{children}</EinstellungenLayoutClient>
}
