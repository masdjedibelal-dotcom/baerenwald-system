import { redirect } from 'next/navigation'

/** Formulare nur noch unter Einstellungen — Legacy-Route redirectet. */
export default function FormulareRedirectPage() {
  redirect('/einstellungen/formulare')
}
