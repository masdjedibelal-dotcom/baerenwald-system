import 'server-only'

import { loadKiVisualisierungenForAngebot } from '@/lib/visualize/queries'

export type KiVizPdfPage = {
  ist_bild_url: string
  ergebnis_url: string
  weitere_varianten: string[]
}

/** Sessions mit ins_angebot=true für PDF und Mail. */
export async function loadKiVizPdfPagesForAngebot(angebotId: string): Promise<KiVizPdfPage[]> {
  const sessions = await loadKiVisualisierungenForAngebot(angebotId)
  const pages: KiVizPdfPage[] = []

  for (const s of sessions) {
    if (!s.ins_angebot || s.status !== 'fertig') continue

    const hauptUrl =
      s.ausgewaehlte_urls[0]?.trim() ||
      s.prompt_history[s.prompt_history.length - 1]?.ergebnis_url?.trim() ||
      ''
    if (!hauptUrl) continue

    const hauptEntry =
      s.prompt_history.find((h) => h.ergebnis_url === hauptUrl) ??
      s.prompt_history[s.prompt_history.length - 1]
    const istUrl = hauptEntry?.ist_bild_url?.trim() || s.ist_bilder_urls[0]?.trim() || ''
    if (!istUrl) continue

    const weitereSet = new Set<string>()
    for (const u of s.ausgewaehlte_urls.slice(1)) {
      const t = u?.trim()
      if (t && t !== hauptUrl) weitereSet.add(t)
    }
    for (const h of s.prompt_history) {
      const t = h.ergebnis_url?.trim()
      if (t && t !== hauptUrl) weitereSet.add(t)
    }

    pages.push({
      ist_bild_url: istUrl,
      ergebnis_url: hauptUrl,
      weitere_varianten: Array.from(weitereSet).slice(0, 3),
    })
  }

  return pages
}

export async function loadKiVizMailPreviewUrl(angebotId: string): Promise<string | null> {
  const pages = await loadKiVizPdfPagesForAngebot(angebotId)
  return pages[0]?.ergebnis_url ?? null
}
