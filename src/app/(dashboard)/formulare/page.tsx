import { redirect } from 'next/navigation'

/** Legacy-Listenroute — Formulare-UI ausgeblendet. */
export default function FormulareRedirectPage() {
  redirect('/einstellungen/firma')
}
