import { buildAngebotHtmlInputAusDetail } from '@/lib/angebote/angebot-html-payload'
import { renderHtmlToPdfBuffer } from '@/lib/angebote/render-angebot-html-pdf'
import {
  buildAngebotHtml,
  buildAngebotPdfFooterTemplate,
} from '@/lib/templates/angebot-template'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AngebotDetail, Gewerk } from '@/lib/types'
import { loadKiVizPdfPagesForAngebot } from '@/lib/visualize/pdf-data'

/** PDF exakt wie HTML-Vorschau — kein alternatives Layout. */
export async function renderAngebotPdfForDetail(
  detail: AngebotDetail,
  firm: FirmenEinstellungen,
  gewerke: Gewerk[] = []
): Promise<Buffer> {
  if (!detail.kunden) {
    throw new Error('Angebot/Kunde nicht gefunden')
  }
  const kiViz = await loadKiVizPdfPagesForAngebot(detail.id)
  const payload = buildAngebotHtmlInputAusDetail(detail, firm, gewerke, {
    ki_visualisierungen: kiViz,
  })
  const html = buildAngebotHtml(payload)
  const footerTemplate = buildAngebotPdfFooterTemplate(payload)
  return renderHtmlToPdfBuffer(html, { footerTemplate })
}
