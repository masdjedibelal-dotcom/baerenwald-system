import type { Metadata } from 'next'
import { FirmaBrandingForm } from '@/components/einstellungen/FirmaBrandingForm'
import { loadEinstellungenForm } from '@/app/(dashboard)/einstellungen/actions'
import { nextRechnungsnummerAusDb } from '@/lib/rechnungen/next-rechnungsnummer'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const metadata: Metadata = {
  title: 'Firma',
}

export default async function EinstellungenFirmaPage() {
  const initial = await loadEinstellungenForm()
  let naechste: string | null = null
  try {
    const nr = await nextRechnungsnummerAusDb(supabaseAdmin)
    const suffix = nr.split('-').pop()
    naechste = suffix ?? null
  } catch {
    naechste = null
  }
  return <FirmaBrandingForm initial={initial} naechsteRechnungsnummer={naechste} />
}
