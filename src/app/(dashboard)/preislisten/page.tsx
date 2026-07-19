import { redirect } from 'next/navigation'

/** Preislisten leben unter Einstellungen → Preislisten (Mock). */
export default function PreislistenRedirectPage() {
  redirect('/einstellungen/preise')
}
