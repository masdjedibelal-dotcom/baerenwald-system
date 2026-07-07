export type ProjektKetteKind = 'kunde' | 'anfrage' | 'angebot' | 'auftrag' | 'rechnung'

export type ProjektKetteGlied = {
  kind: ProjektKetteKind
  id: string
  label: string
  href: string
}

export type ProjektAngebotKurz = {
  id: string
  angebotsnr: string | null
  status: string
  status_einfach: string | null
  gueltig_bis: string | null
  created_at: string
  gesamt_fix: number | null
  gesamt_min: number | null
  gesamt_max: number | null
}

export type ProjektRechnungKurz = {
  id: string
  rechnungsnummer: string
  status: string
  brutto: number | null
  rechnungsdatum: string
  auftrag_id: string | null
}

export type ProjektKontext = {
  kunde: { id: string; name: string } | null
  lead: { id: string; label: string; status: string } | null
  angebote: ProjektAngebotKurz[]
  auftrag: { id: string; titel: string | null; status: string } | null
  rechnungen: ProjektRechnungKurz[]
  activeKind: ProjektKetteKind
  activeId: string
}

export function buildProjektKette(ctx: ProjektKontext): ProjektKetteGlied[] {
  const chain: ProjektKetteGlied[] = []
  if (ctx.kunde) {
    chain.push({
      kind: 'kunde',
      id: ctx.kunde.id,
      label: ctx.kunde.name,
      href: `/kunden/${ctx.kunde.id}`,
    })
  }
  if (ctx.lead) {
    chain.push({
      kind: 'anfrage',
      id: ctx.lead.id,
      label: ctx.lead.label,
      href: `/anfragen/${ctx.lead.id}`,
    })
  }
  const aktivesAngebot =
    ctx.activeKind === 'angebot'
      ? ctx.angebote.find((a) => a.id === ctx.activeId)
      : ctx.angebote[0]
  if (aktivesAngebot && ctx.activeKind !== 'anfrage' && ctx.activeKind !== 'kunde') {
    const nr = aktivesAngebot.angebotsnr?.trim() || aktivesAngebot.id.slice(0, 8).toUpperCase()
    chain.push({
      kind: 'angebot',
      id: aktivesAngebot.id,
      label: `Angebot ${nr}`,
      href: `/angebote/${aktivesAngebot.id}`,
    })
  }
  if (ctx.auftrag) {
    chain.push({
      kind: 'auftrag',
      id: ctx.auftrag.id,
      label: ctx.auftrag.titel?.trim() || 'Auftrag',
      href: `/auftraege/${ctx.auftrag.id}`,
    })
  }
  if (ctx.activeKind === 'rechnung') {
    const rec = ctx.rechnungen.find((r) => r.id === ctx.activeId)
    if (rec) {
      chain.push({
        kind: 'rechnung',
        id: rec.id,
        label: rec.rechnungsnummer,
        href: `/rechnungen/${rec.id}`,
      })
    }
  }
  return chain
}
