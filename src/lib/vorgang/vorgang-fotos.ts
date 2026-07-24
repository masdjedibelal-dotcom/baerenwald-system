import { fotosAusMelderFunnel } from '@/lib/datenschutz/melder-leads'
import { parseProjektFotos, type AngebotProjektFoto } from '@/lib/angebote/angebot-projekt-fotos'

export type VorgangFoto = {
  url: string
  beschreibung?: string
  quelle: 'meldung' | 'angebot'
}

/** Alle Vorgangs-Fotos: Mieter-Meldung (funnel) + Angebots-Fotodoku. */
export function collectVorgangFotos(opts: {
  funnelDaten?: unknown
  angebotFotosRaw?: unknown
}): VorgangFoto[] {
  const out: VorgangFoto[] = []
  const seen = new Set<string>()

  for (const url of fotosAusMelderFunnel(opts.funnelDaten)) {
    const u = url.trim()
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push({ url: u, quelle: 'meldung' })
  }

  const projekt: AngebotProjektFoto[] = parseProjektFotos(opts.angebotFotosRaw)
  for (const f of projekt) {
    const u = f.url.trim()
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push({
      url: u,
      beschreibung: f.beschreibung || undefined,
      quelle: 'angebot',
    })
  }

  return out
}
