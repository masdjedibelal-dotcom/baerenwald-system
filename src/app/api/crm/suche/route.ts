import { logDbError } from '@/lib/errors/log-db-error'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { AppSearchHit, SearchGroupId } from '@/lib/search/app-search-types'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ hits: [] })
  }

  const supabase = createClient()
  const pattern = `%${q}%`

  const [
    leads,
    kunden,
    auftraege,
    angebote,
    rechnungen,
    handwerker,
    partner,
    objekte,
    abnahmen,
    kundenDok,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, kontakt_name, situation, plz')
      .or(`kontakt_name.ilike.${pattern},situation.ilike.${pattern},plz.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('kunden')
      .select('id, name, vorname, nachname, ort, org_anzeigename')
      .or(
        `name.ilike.${pattern},vorname.ilike.${pattern},nachname.ilike.${pattern},ort.ilike.${pattern},org_anzeigename.ilike.${pattern}`
      )
      .limit(5),
    supabase
      .from('auftraege')
      .select('id, titel, kunden(name)')
      .or(`titel.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('angebote')
      .select('id, angebotsnr, leistungsumfang, status_einfach, kunden(name, vorname, nachname)')
      .or(`angebotsnr.ilike.${pattern},leistungsumfang.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('rechnungen')
      .select('id, rechnungsnummer, status, kunden(name, vorname, nachname)')
      .or(`rechnungsnummer.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('handwerker')
      .select('id, name, firma')
      .or(`name.ilike.${pattern},firma.ilike.${pattern}`)
      .eq('aktiv', true)
      .limit(5),
    supabase
      .from('partner')
      .select('id, name')
      .ilike('name', pattern)
      .eq('aktiv', true)
      .limit(5),
    supabase
      .from('kunden_objekte')
      .select('id, titel, kostenstelle_nr, kunde_id')
      .or(`titel.ilike.${pattern},kostenstelle_nr.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('auftrag_abnahmeprotokolle')
      .select('id, auftrag_id, pdf_url, abnahme_datum, notizen')
      .not('pdf_url', 'is', null)
      .limit(4),
    supabase
      .from('kunden_dokumente')
      .select('id, titel, dateiname, kunde_id')
      .or(`titel.ilike.${pattern},dateiname.ilike.${pattern}`)
      .limit(4),
  ])

  for (const [label, res] of [
    ['leads', leads],
    ['kunden', kunden],
    ['auftraege', auftraege],
    ['angebote', angebote],
    ['rechnungen', rechnungen],
    ['handwerker', handwerker],
    ['partner', partner],
    ['objekte', objekte],
    ['abnahmen', abnahmen],
    ['kundenDok', kundenDok],
  ] as const) {
    if (res.error) logDbError(`api/crm/suche:${label}`, res.error)
  }

  const hits: AppSearchHit[] = []
  const push = (
    group: SearchGroupId,
    id: string,
    icon: string,
    label: string,
    sub: string | undefined,
    href: string
  ) => {
    hits.push({ id, group, icon, label, sub, href })
  }

  for (const l of leads.data ?? []) {
    const label = (l.kontakt_name as string) || 'Anfrage'
    push(
      'vorgaenge',
      `l-${l.id}`,
      'inbox',
      label,
      'Anfrage',
      `/anfragen/${l.id}`
    )
  }

  for (const k of kunden.data ?? []) {
    const orgName = (k.org_anzeigename as string | null)?.trim()
    const name =
      orgName ||
      (k.name as string) ||
      [(k.vorname as string), (k.nachname as string)].filter(Boolean).join(' ') ||
      'Kunde'
    push(
      'kunden',
      `k-${k.id}`,
      'users',
      name,
      k.ort ? `Kunde · ${k.ort}` : 'Kunde',
      `/kunden/${k.id}`
    )
  }

  for (const a of auftraege.data ?? []) {
    const kunde = a.kunden as { name?: string } | null
    push(
      'vorgaenge',
      `a-${a.id}`,
      'briefcase',
      (a.titel as string) || 'Auftrag',
      ['Auftrag', kunde?.name].filter(Boolean).join(' · '),
      `/auftraege/${a.id}`
    )
  }

  for (const ag of angebote.data ?? []) {
    const k = ag.kunden as { name?: string; vorname?: string; nachname?: string } | null
    const kundeName =
      k?.name?.trim() ||
      [k?.vorname, k?.nachname].filter(Boolean).join(' ').trim() ||
      ''
    const nr = (ag.angebotsnr as string | null)?.trim()
    const lu = (ag.leistungsumfang as string | null)?.trim()
    push(
      'vorgaenge',
      `ag-${ag.id}`,
      'file-invoice',
      nr || lu || 'Angebot',
      [nr, 'Angebot', kundeName].filter(Boolean).join(' · '),
      `/angebote/${ag.id}`
    )
    if (nr) {
      push(
        'dokumente',
        `ag-pdf-${ag.id}`,
        'file',
        `Angebot ${nr}`,
        'PDF · Angebot',
        `/angebote/${ag.id}`
      )
    }
  }

  for (const r of rechnungen.data ?? []) {
    const k = r.kunden as { name?: string; vorname?: string; nachname?: string } | null
    const kundeName =
      k?.name?.trim() ||
      [k?.vorname, k?.nachname].filter(Boolean).join(' ').trim() ||
      ''
    const nr = (r.rechnungsnummer as string)?.trim()
    push(
      'vorgaenge',
      `r-${r.id}`,
      'receipt',
      nr || 'Rechnung',
      [nr, 'Rechnung', kundeName].filter(Boolean).join(' · '),
      `/rechnungen/${r.id}`
    )
    if (nr) {
      push(
        'dokumente',
        `r-pdf-${r.id}`,
        'file',
        `Rechnung ${nr}`,
        'PDF · Rechnung',
        `/rechnungen/${r.id}`
      )
    }
  }

  for (const h of handwerker.data ?? []) {
    push(
      'partner',
      `h-${h.id}`,
      'tool',
      (h.firma as string) || (h.name as string) || 'Partner',
      'Partner',
      `/handwerker/${h.id}`
    )
  }

  for (const p of partner.data ?? []) {
    push('partner', `p-${p.id}`, 'building', p.name as string, 'Netzwerk', `/partner/${p.id}`)
  }

  for (const o of objekte.data ?? []) {
    const titel = (o.titel as string) || 'Objekt'
    const ks = (o.kostenstelle_nr as string | null)?.trim()
    push(
      'objekte',
      `o-${o.id}`,
      'building-2',
      titel,
      ks ? `Objekt · ${ks}` : 'Objekt',
      `/kunden/${o.kunde_id}?objekt=${o.id}`
    )
  }

  for (const a of abnahmen.data ?? []) {
    if (!a.pdf_url) continue
    push(
      'dokumente',
      `abn-${a.id}`,
      'file-check',
      'Abnahmeprotokoll',
      a.abnahme_datum ? `Abnahme · ${a.abnahme_datum}` : 'Abnahme',
      `/auftraege/${a.auftrag_id}`
    )
  }

  for (const d of kundenDok.data ?? []) {
    const titel = (d.titel as string) || (d.dateiname as string) || 'Dokument'
    push(
      'dokumente',
      `kd-${d.id}`,
      'file',
      titel,
      'Akte',
      d.kunde_id ? `/kunden/${d.kunde_id}` : '/kunden'
    )
  }

  // Dedup by id
  const seen = new Set<string>()
  const unique = hits.filter((h) => {
    if (seen.has(h.id)) return false
    seen.add(h.id)
    return true
  })

  return NextResponse.json({ hits: unique.slice(0, 20) })
}
