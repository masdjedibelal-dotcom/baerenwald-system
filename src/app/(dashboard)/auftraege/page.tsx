import { redirect } from 'next/navigation'

export default function AuftraegePage() {
  redirect('/vorgaenge?phase=auftrag')
}
