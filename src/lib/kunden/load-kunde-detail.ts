import { createClient } from '@/lib/supabase-server'
import { withCrmReadFallback } from '@/lib/kunden/kunden-db'
import type { Kunde, KundenDokumentRow, KundenNotizRow, Lead, AuftragStatus } from '@/lib/types'

export type KundeDetailPayload = Kunde & {
  leads?: Array<
    Lead & {
      angebote?: Array<{
        id: string
        status: string
        status_einfach?: string | null
        gueltig_bis?: string | null
        gesamt_fix: number | null
        gesamt_min: number | null
        gesamt_max: number | null
        created_at?: string | null
        pdf_url?: string | null
        auftrag_id?: string | null
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
    abnahme_protokoll_url?: string | null
    angebote:
      | {
          gesamt_fix: number | null
          gesamt_min: number | null
          gesamt_max: number | null
          pdf_url?: string | null
          id?: string
          status?: string
          status_einfach?: string | null
          gueltig_bis?: string | null
          created_at?: string | null
        }
      | {
          gesamt_fix: number | null
          gesamt_min: number | null
          gesamt_max: number | null
          pdf_url?: string | null
          id?: string
          status?: string
          status_einfach?: string | null
          gueltig_bis?: string | null
          created_at?: string | null
        }[]
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
    auftrag_id?: string | null
    auftraege?: { titel: string | null } | { titel: string | null }[] | null
  }> | null
  kunden_notizen?: KundenNotizRow[] | null
  kunden_dokumente?: KundenDokumentRow[] | null
  email_logs?: Array<{
    id: string
    typ: string
    to_email: string | null
    subject: string | null
    created_at: string
    angebot_id?: string | null
  }> | null
}

type AngebotKurz = {
  id: string
  lead_id: string | null
  auftrag_id: string | null
  status: string
  status_einfach: string | null
  gueltig_bis: string | null
  gesamt_fix: number | null
  gesamt_min: number | null
  gesamt_max: number | null
  created_at: string
  pdf_url: string | null
}

const KUNDE_DETAIL_SELECT = `
      id, name, vorname, nachname, email, telefon, adresse, strasse, hausnummer, plz, ort, typ,
      notizen, created_at, updated_at, ansprechpartner, webseite, geburtstag, kundennummer, quelle,
      gesamt_umsatz, letzte_aktivitaet, ust_id, auth_user_id,
      leads(
        id, status, situation, bereiche, created_at, budget_ca
      ),
      auftraege(
        id, titel, status, fortschritt, start_datum, end_datum, created_at
      ),
      rechnungen(
        id, rechnungsnummer, status, brutto, rechnungsdatum, faellig_am, bezahlt_at, pdf_url, auftrag_id
      ),
      kunden_notizen(
        id, kunde_id, inhalt, erstellt_von, created_at
      ),
      kunden_dokumente(
        id, kunde_id, name, typ, datei_url, groesse_bytes, created_at
      )
    `

export async function loadKundeDetail(id: string): Promise<KundeDetailPayload | null> {
  const supabase = createClient()
  const kundeRes = await withCrmReadFallback(async (db) =>
    db.from('kunden').select(KUNDE_DETAIL_SELECT).eq('id', id).maybeSingle()
  )
  const data = kundeRes.data
  const error = kundeRes.error

  if (error || !data) {
    if (error) console.warn('loadKundeDetail', error.message)
    return null
  }

  const row = data as KundeDetailPayload

  const leadIds = (row.leads ?? []).map((l) => l.id).filter(Boolean)
  const auftragIds = (row.auftraege ?? []).map((a) => a.id).filter(Boolean)

  const angeboteByLead = new Map<string, AngebotKurz[]>()
  const angeboteByAuftrag = new Map<string, AngebotKurz[]>()
  const einbehalteByAuftrag = new Map<
    string,
    NonNullable<NonNullable<KundeDetailPayload['auftraege']>[number]['einbehalte']>
  >()
  const abnahmeUrlByAuftrag = new Map<string, string | null>()

  if (leadIds.length) {
    const { data: angs, error: eAng } = await supabase
      .from('angebote')
      .select(
        'id, lead_id, auftrag_id, status, status_einfach, gueltig_bis, gesamt_fix, gesamt_min, gesamt_max, created_at, pdf_url'
      )
      .in('lead_id', leadIds)
    if (!eAng && angs) {
      for (const raw of angs as AngebotKurz[]) {
        if (raw.lead_id) {
          if (!angeboteByLead.has(raw.lead_id)) angeboteByLead.set(raw.lead_id, [])
          angeboteByLead.get(raw.lead_id)!.push(raw)
        }
      }
    } else if (eAng) console.warn('loadKundeDetail angebote(leads)', eAng.message)
  }

  if (auftragIds.length) {
    const [angRes, einRes, abnahmeRes] = await Promise.all([
      supabase
        .from('angebote')
        .select(
          'id, lead_id, auftrag_id, status, status_einfach, gueltig_bis, gesamt_fix, gesamt_min, gesamt_max, created_at, pdf_url'
        )
        .in('auftrag_id', auftragIds),
      supabase
        .from('einbehalte')
        .select('id, auftrag_id, einbehalt_betrag, status, freigabe_datum, handwerker(name, firma)')
        .in('auftrag_id', auftragIds),
      supabase.from('auftraege').select('id, abnahme_protokoll_url').in('id', auftragIds),
    ])

    if (!angRes.error && angRes.data) {
      for (const raw of angRes.data as AngebotKurz[]) {
        const aid = raw.auftrag_id
        if (!aid) continue
        if (!angeboteByAuftrag.has(aid)) angeboteByAuftrag.set(aid, [])
        angeboteByAuftrag.get(aid)!.push(raw)
      }
    } else if (angRes.error) console.warn('loadKundeDetail angebote(auftraege)', angRes.error.message)

    if (!einRes.error && einRes.data) {
      for (const r of einRes.data as Record<string, unknown>[]) {
        const aid = r.auftrag_id as string
        if (!einbehalteByAuftrag.has(aid)) einbehalteByAuftrag.set(aid, [])
        const hwRaw = r.handwerker
        const hw = (Array.isArray(hwRaw) ? hwRaw[0] : hwRaw) as
          | { name: string | null; firma: string | null }
          | null
          | undefined
        einbehalteByAuftrag.get(aid)!.push({
          id: r.id as string,
          einbehalt_betrag: Number(r.einbehalt_betrag) || 0,
          status: String(r.status ?? ''),
          freigabe_datum: String(r.freigabe_datum ?? ''),
          handwerker: hw ?? null,
        })
      }
    } else if (einRes.error) console.warn('loadKundeDetail einbehalte', einRes.error.message)

    if (!abnahmeRes.error && abnahmeRes.data) {
      for (const r of abnahmeRes.data as { id: string; abnahme_protokoll_url: string | null }[]) {
        abnahmeUrlByAuftrag.set(r.id, r.abnahme_protokoll_url ?? null)
      }
    } else if (abnahmeRes.error) {
      console.warn('loadKundeDetail abnahme_protokoll_url', abnahmeRes.error.message)
    }
  }

  const sortAngebote = (list: AngebotKurz[]) =>
    [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const leadsMerged = (row.leads ?? []).map((l) => ({
    ...l,
    angebote: sortAngebote(angeboteByLead.get(l.id) ?? []).map((x) => ({
      id: x.id,
      auftrag_id: x.auftrag_id,
      status: x.status,
      status_einfach: x.status_einfach,
      gueltig_bis: x.gueltig_bis,
      gesamt_fix: x.gesamt_fix,
      gesamt_min: x.gesamt_min,
      gesamt_max: x.gesamt_max,
      created_at: x.created_at,
      pdf_url: x.pdf_url ?? null,
    })),
  }))

  const auftraegeMerged = (row.auftraege ?? []).map((a) => {
    const list = sortAngebote(angeboteByAuftrag.get(a.id) ?? [])
    const angebote = list.map((x) => ({
      id: x.id,
      lead_id: x.lead_id,
      auftrag_id: x.auftrag_id,
      status: x.status,
      status_einfach: x.status_einfach,
      gueltig_bis: x.gueltig_bis,
      gesamt_fix: x.gesamt_fix,
      gesamt_min: x.gesamt_min,
      gesamt_max: x.gesamt_max,
      created_at: x.created_at,
      pdf_url: x.pdf_url ?? null,
    }))
    return {
      ...a,
      abnahme_protokoll_url: abnahmeUrlByAuftrag.get(a.id) ?? null,
      angebote: angebote.length ? angebote : null,
      einbehalte: einbehalteByAuftrag.get(a.id) ?? [],
    }
  })

  const titelByAuftragId = new Map((row.auftraege ?? []).map((a) => [a.id, a.titel]))
  const rechnungenMerged = (row.rechnungen ?? []).map((r) => ({
    ...r,
    auftraege: r.auftrag_id
      ? ({ titel: titelByAuftragId.get(r.auftrag_id) ?? null } as { titel: string | null })
      : null,
  }))

  const notizen = [...(row.kunden_notizen ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const em = row.email?.trim()
  const byMail = em
    ? await supabase
        .from('email_logs')
        .select('id, typ, to_email, subject, created_at, angebot_id')
        .eq('to_email', em)
        .order('created_at', { ascending: false })
        .limit(40)
    : { data: [] as KundeDetailPayload['email_logs'] }
  const byKunde = await supabase
    .from('email_logs')
    .select('id, typ, to_email, subject, created_at, angebot_id')
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
    leads: leadsMerged,
    auftraege: auftraegeMerged,
    rechnungen: rechnungenMerged,
    kunden_notizen: notizen,
    kunden_dokumente: (row.kunden_dokumente ?? []) as KundenDokumentRow[],
    email_logs,
  }
}
