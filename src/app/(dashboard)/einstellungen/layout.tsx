import { EinstellungenLayoutClient } from '@/components/einstellungen/EinstellungenLayoutClient'
import { loadBenutzerListe } from '@/app/(dashboard)/einstellungen/benutzer/actions'
import { createClient } from '@/lib/supabase-server'
import { isDemoTestUserEmail } from '@/lib/is-demo-user'

export default async function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  let teamCount = 0
  try {
    const team = await loadBenutzerListe()
    teamCount = team.length
  } catch {
    teamCount = 0
  }

  let showDemoBanner = false
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    showDemoBanner = isDemoTestUserEmail(user?.email)
  } catch {
    showDemoBanner = false
  }

  return (
    <EinstellungenLayoutClient teamCount={teamCount} showDemoBanner={showDemoBanner}>
      {children}
    </EinstellungenLayoutClient>
  )
}
