import { redirect } from 'next/navigation'

export default function RechnungenPage() {
  redirect('/vorgaenge?phase=rechnung')
}
