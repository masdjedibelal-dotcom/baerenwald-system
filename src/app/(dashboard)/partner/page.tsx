import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Handwerker',
}

/** Spec §3 / Phase 3: Netzwerk-Route entfernt — Redirect auf Handwerker. Tabelle `partner` bleibt. */
export default function PartnerPage() {
  redirect('/handwerker')
}
