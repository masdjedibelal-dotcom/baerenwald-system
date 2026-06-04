import { EinstellungenTabNav } from '@/components/einstellungen/EinstellungenTabNav'
import { loadBenutzerListe } from '@/app/(dashboard)/einstellungen/benutzer/actions'

export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  let teamCount = 0
  try {
    const team = await loadBenutzerListe()
    teamCount = team.length
  } catch {
    teamCount = 0
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="-mx-4 md:mx-0">
        <EinstellungenTabNav teamCount={teamCount} />
      </div>
      <div className="min-w-0 rounded-xl bg-app-grouped p-4 md:p-6">{children}</div>
    </div>
  )
}
