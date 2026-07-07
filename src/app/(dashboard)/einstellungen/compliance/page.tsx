import { redirect } from 'next/navigation'

export default function EinstellungenComplianceRedirectPage() {
  redirect('/einstellungen/integration?section=compliance')
}
