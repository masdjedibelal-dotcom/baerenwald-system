import { createClient } from '@/lib/supabase-server'
import type { Kunde, KundenDokumentRow, KundenNotizRow, Lead, AuftragStatus } from '@/lib/types'

export type KundeDetailPayload = Kunde & {
  leads?: Array<
    Lead & {
      angebote?: Array<{
        id: string
        status: string
        gesamt_min: number | null
        gesamt_max: number | null
        created_at?: string | null
        pdf_url?: string | null
      }> | null
    }
  > | null
  auftraege?: Array<{
    id: string
    titel: string | null
    status: AuftragStatus
    fortschritt: number | null
    start_datum: string | null
    end_datum: string | null
    created_at: string
    angebote:
      | { gesamt_min: number | null; gesamt_max: number | null }
      | { gesamt_min: number | null; gesamt_max: number | null }[]
      | null
    einbehalte?: Array<{
      id: string
      einbehalt_betrag: number
      status: string
      freigabe_datum: string
      handwerker?: { name: string | null; firma: string | null } | null
    }> | null
  }> | null
  rechnungen?: Array<{
    id: string
    rechnungsnummer: string
    status: string
    brutto: number | null
    rechnungsdatum: string
    pdf_url: string | null
    faellig_am: string | null
    bezahlt_at: string | null
  }> | null
  kunden_notizen?: KundenNotizRow[] | null
  kunden_dokumente?: KundenDokumentRow[] | null
  email_logs?: Array<{
    id: string
    typ: string
    to_email: string | null
    subject: string | null
    created_at: string
  }> | null
}

export async function loadKundeDetail(id: string): Promise<KundeDetailPayload | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('kunden')
    .select(
      `
      *,
      leads(
        id, status, situation, bereiche, created_at, kunde_id, kanal,
        angebote(id, status, gesamt_min, gesamt_max, created_at, pdf_url)
      ),
      auftraege(
        id, titel, status, fortschritt, start_datum, end_datum, created_at,
        angebote(gesamt_min, gesamt_max),
        einbehalte(
          id, einbehalt_betrag, status, freigabe_datum,
          handwerker(name, firma)
        )
      ),
      rechnungen(
        id, rechnungsnummer, status, brutto, rechnungsdatum, pdf_url, faellig_am, bezahlt_at
      ),
      kunden_notizen(
        id, kunde_id, inhalt, erstellt_von, created_at
      ),
      kunden_dokumente(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    if (error) console.warn('loadKundeDetail', error.message)
    return null
  }

  const row = data as KundeDetailPayload

  const notizen = [...(row.kunden_notizen ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const em = row.email?.trim()
  const byMail = em
    ? await supabase
        .from('email_logs')
        .select('id, typ, to_email, subject, created_at')
        .eq('to_email', em)
        .order('created_at', { ascending: false })
        .limit(40)
    : { data: [] as KundeDetailPayload['email_logs'] }
  const byKunde = await supabase
    .from('email_logs')
    .select('id, typ, to_email, subject, created_at')
    .eq('kunde_id', id)
    .order('created_at', { ascending: false })
    .limit(40)
  const merged = new Map<string, NonNullable<KundeDetailPayload['email_logs']>[0]>()
  for (const r of [...(byMail.data ?? []), ...(byKunde.data ?? [])]) {
    const e = r as NonNullable<KundeDetailPayload['email_logs']>[0]
    merged.set(e.id, e)
  }
  const email_logs = Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    ...row,
    kunden_notizen: notizen,
    email_logs,
  }
}
