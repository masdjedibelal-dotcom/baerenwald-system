import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (q.length < 2) {
    return NextResponse.json({ hits: [] })
  }

  const supabase = createClient()
  const pattern = `%${q}%`

  const [leads, kunden, auftraege, angebote, rechnungen, handwerker, partner] = await Promise.all([
    supabase
      .from('leads')
      .select('id, kontakt_name, situation, plz')
      .or(`kontakt_name.ilike.${pattern},situation.ilike.${pattern},plz.ilike.${pattern}`)
      .limit(5),
    supabase
      .from('kunden')
      .select('id, name, vorname, nachname, ort')
      .or(`name.ilike.${pattern},vorname.ilike.${pattern},nachname.ilike.${pattern},ort.ilike.${pattern}`)
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
  ])

  type Hit = { id: string; icon: string; label: string; sub?: string; href: string }
  const hits: Hit[] = []

  for (const l of leads.data ?? []) {
    const label = (l.kontakt_name as string) || 'Anfrage'
    hits.push({
      id: `l-${l.id}`,
      icon: 'inbox',
      label,
      sub: 'Anfrage',
      href: `/anfragen/${l.id}`,
    })
  }

  for (const k of kunden.data ?? []) {
    const name =
      (k.name as string) ||
      [(k.vorname as string), (k.nachname as string)].filter(Boolean).join(' ') ||
      'Kunde'
    hits.push({
      id: `k-${k.id}`,
      icon: 'users',
      label: name,
      sub: `Kunde${k.ort ? ` · ${k.ort}` : ''}`,
      href: `/kunden/${k.id}`,
    })
  }

  for (const a of auftraege.data ?? []) {
    const kunde = a.kunden as { name?: string } | null
    hits.push({
      id: `a-${a.id}`,
      icon: 'briefcase',
      label: (a.titel as string) || 'Auftrag',
      sub: `Auftrag · ${kunde?.name ?? ''}`,
      href: `/auftraege/${a.id}`,
    })
  }

  for (const ag of angebote.data ?? []) {
    const k = ag.kunden as { name?: string; vorname?: string; nachname?: string } | null
    const kundeName =
      k?.name?.trim() ||
      [k?.vorname, k?.nachname].filter(Boolean).join(' ').trim() ||
      ''
    const nr = (ag.angebotsnr as string | null)?.trim()
    const lu = (ag.leistungsumfang as string | null)?.trim()
    hits.push({
      id: `ag-${ag.id}`,
      icon: 'file-invoice',
      label: nr || lu || 'Angebot',
      sub: `Angebot${kundeName ? ` · ${kundeName}` : ''}`,
      href: `/angebote/${ag.id}`,
    })
  }

  for (const r of rechnungen.data ?? []) {
    const k = r.kunden as { name?: string; vorname?: string; nachname?: string } | null
    const kundeName =
      k?.name?.trim() ||
      [k?.vorname, k?.nachname].filter(Boolean).join(' ').trim() ||
      ''
    hits.push({
      id: `r-${r.id}`,
      icon: 'receipt',
      label: (r.rechnungsnummer as string)?.trim() || 'Rechnung',
      sub: `Rechnung${kundeName ? ` · ${kundeName}` : (r.status as string) ? ` · ${r.status}` : ''}`,
      href: `/rechnungen/${r.id}`,
    })
  }

  for (const h of handwerker.data ?? []) {
    hits.push({
      id: `h-${h.id}`,
      icon: 'tool',
      label: (h.firma as string) || (h.name as string) || 'Partner',
      sub: 'Partner',
      href: `/handwerker/${h.id}`,
    })
  }

  for (const p of partner.data ?? []) {
    hits.push({
      id: `p-${p.id}`,
      icon: 'building',
      label: p.name as string,
      sub: 'Netzwerk',
      href: `/partner/${p.id}`,
    })
  }

  return NextResponse.json({ hits: hits.slice(0, 14) })
}
